import type { Node, Edge } from '@xyflow/react'
import type { Gent, Person, PersonAppearance, PersonTier, GentAlias, PersonConnection } from '@/types/app'

// ── Ring radii ───────────────────────────────────────────────────────────────
type RingKey = PersonTier | 'person_of_interest'

const RING_RADIUS: Record<RingKey, number> = {
  inner_circle: 220,
  outer_circle: 380,
  acquaintance: 520,
  person_of_interest: 640,
}

const RING_OFFSETS: Record<RingKey, number> = {
  inner_circle: 0,
  outer_circle: Math.PI / 12,       // 15°
  acquaintance: Math.PI / 6,        // 30°
  person_of_interest: Math.PI / 4,  // 45°
}

// ── Gent color map ───────────────────────────────────────────────────────────
const GENT_EDGE_COLOR: Record<GentAlias, string> = {
  keys: '#3B82F6',
  bass: '#8B5CF6',
  lorekeeper: 'rgba(201,168,76,0.5)',
  operative: '#6B7280',
}

function gentPersonEdgeStyle(alias: GentAlias, dimmed: boolean, count: number) {
  const strokeWidth = count >= 4 ? 3.5 : count >= 2 ? 2.5 : 1.5
  return { stroke: GENT_EDGE_COLOR[alias], strokeWidth, opacity: dimmed ? 0.15 : 1 }
}

// ── Types ────────────────────────────────────────────────────────────────────
export interface MindMapFilters {
  tier: PersonTier | 'person_of_interest' | 'all'
  gent: GentAlias | 'all'
}

export interface GentNodeData {
  type: 'gent'
  gent: Gent
  dimmed: boolean
  ghosted: boolean // true for retired gents
  [key: string]: unknown
}

export interface PersonNodeData {
  type: 'person'
  person: Person
  tier: string
  dimmed: boolean
  recentlyActive: boolean
  recencyDays: number | null // days since last appearance, null = never seen
  focused: boolean // true when this person is tap-focused
  [key: string]: unknown
}

// ── Main function ────────────────────────────────────────────────────────────
export function computeGraphData(
  gents: Gent[],
  people: Person[],
  appearances: PersonAppearance[],
  filters: MindMapFilters,
  focusedGentId: string | null,
  focusedPersonId: string | null,
  savedPositions?: Record<string, { x: number; y: number }>,
  recentlyActiveIds?: Set<string>,
  searchQuery?: string,
  personGents?: Array<{ person_id: string; gent_id: string }>,
  personRecency?: Map<string, number>,
  personConnections?: PersonConnection[],
): { nodes: Node[]; edges: Edge[]; searchMatchNodeIds: string[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // Pre-compute search matches (needed before gent node dimming)
  const searchMatchIds = new Set<string>()
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    for (const p of people) {
      if (p.name.toLowerCase().includes(q)) searchMatchIds.add(p.id)
    }
  }

  // 1. Build person→gent connections (needed before gent node dimming)
  const personGentMap = new Map<string, Set<string>>()
  if (personGents) {
    for (const pg of personGents) {
      if (!personGentMap.has(pg.person_id)) personGentMap.set(pg.person_id, new Set())
      personGentMap.get(pg.person_id)!.add(pg.gent_id)
    }
  }

  // Pre-compute focused person's gent connections (for gent dimming)
  const focusedPersonGentIds = new Set<string>()
  if (focusedPersonId) {
    const linked = personGentMap.get(focusedPersonId)
    if (linked) for (const gId of linked) focusedPersonGentIds.add(gId)
  }

  // 2. Place gents: active gents form a triangle, retired gent sits above (guardian position)
  const activeGentPositions: Array<{ x: number; y: number }> = [
    { x: 0, y: -80 },    // top of triangle
    { x: -69, y: 40 },   // bottom-left
    { x: 69, y: 40 },    // bottom-right
  ]
  const retiredGentPosition = { x: 0, y: 280 } // far below, outer edge

  // Map of gent id → alias for quick lookup
  const gentIdToAlias = new Map<string, GentAlias>()
  const gentIds = new Set<string>()

  // Track active gent index for triangle position assignment
  let activeIdx = 0

  gents.forEach((g) => {
    gentIdToAlias.set(g.id, g.alias)
    gentIds.add(g.id)

    const isRetired = g.retired === true
    const pos = isRetired
      ? retiredGentPosition
      : (activeGentPositions[activeIdx++] ?? { x: 0, y: 0 })

    const gentDimmed = (focusedGentId !== null && focusedGentId !== g.id)
      || (focusedPersonId !== null && !focusedPersonGentIds.has(g.id))
      || (!!searchQuery && searchMatchIds.size > 0)

    nodes.push({
      id: `gent-${g.id}`,
      type: 'gentNode',
      position: pos,
      data: { type: 'gent', gent: g, dimmed: gentDimmed, ghosted: isRetired } satisfies GentNodeData,
      draggable: true,
      style: isRetired ? { opacity: 0.5 } : undefined,
    })
  })

  // 3. Gent ↔ Gent edges (always)
  for (let i = 0; i < gents.length; i++) {
    for (let j = i + 1; j < gents.length; j++) {
      const dimmed = focusedGentId !== null || focusedPersonId !== null || (!!searchQuery && searchMatchIds.size > 0)
      edges.push({
        id: `gent-edge-${gents[i].id}-${gents[j].id}`,
        source: `gent-${gents[i].id}`,
        target: `gent-${gents[j].id}`,
        style: { stroke: '#C9A84C', strokeWidth: 3, opacity: dimmed ? 0.05 : 1 },
        animated: false,
      })
    }
  }

  // Also build appearance index for edge thickness + filtering
  const personEntries = new Map<string, Set<string>>()
  const personNoters = new Map<string, Set<string>>()

  for (const a of appearances) {
    if (!personEntries.has(a.person_id)) personEntries.set(a.person_id, new Set())
    personEntries.get(a.person_id)!.add(a.entry_id)

    if (!personNoters.has(a.person_id)) personNoters.set(a.person_id, new Set())
    personNoters.get(a.person_id)!.add(a.noted_by)
  }

  // 3b. Build gent→person appearance count map
  const gentPersonCount = new Map<string, number>()
  for (const a of appearances) {
    const key = `${a.noted_by}-${a.person_id}`
    gentPersonCount.set(key, (gentPersonCount.get(key) ?? 0) + 1)
  }

  // 4. Filter people
  let filtered = [...people]

  if (filters.tier !== 'all') {
    if (filters.tier === 'person_of_interest') {
      filtered = filtered.filter(p => p.category === 'person_of_interest')
    } else {
      filtered = filtered.filter(p => p.category === 'contact' && p.tier === filters.tier)
    }
  }

  if (filters.gent !== 'all') {
    const targetGent = gents.find(g => g.alias === filters.gent)
    if (targetGent) {
      filtered = filtered.filter(p => {
        const isLinked = personGentMap.get(p.id)?.has(targetGent.id) ?? false
        const isAddedBy = p.added_by === targetGent.id
        const isNotedBy = personNoters.get(p.id)?.has(targetGent.id) ?? false
        return isLinked || isAddedBy || isNotedBy
      })
    }
  }

  // 5. Group by ring
  const rings = new Map<string, Person[]>()
  for (const p of filtered) {
    const ring = p.category === 'person_of_interest' ? 'person_of_interest' : (p.tier ?? 'acquaintance')
    if (!rings.has(ring)) rings.set(ring, [])
    rings.get(ring)!.push(p)
  }

  // 6. Place people on rings
  const connectedToFocusedGent = new Set<string>()
  if (focusedGentId) {
    for (const p of filtered) {
      const isLinked = personGentMap.get(p.id)?.has(focusedGentId) ?? false
      const isAddedBy = p.added_by === focusedGentId
      const isNotedBy = personNoters.get(p.id)?.has(focusedGentId) ?? false
      if (isLinked || isAddedBy || isNotedBy) connectedToFocusedGent.add(p.id)
    }
  }

  const filteredIds = new Set(filtered.map(p => p.id))

  // Person-focus: find all people who share entries OR have explicit connections with the focused person
  const connectedToFocusedPerson = new Set<string>()
  if (focusedPersonId) {
    connectedToFocusedPerson.add(focusedPersonId)
    const focusedEntries = personEntries.get(focusedPersonId) ?? new Set()
    for (const a of appearances) {
      if (focusedEntries.has(a.entry_id) && filteredIds.has(a.person_id)) {
        connectedToFocusedPerson.add(a.person_id)
      }
    }
    // Include explicitly connected people
    if (personConnections) {
      for (const conn of personConnections) {
        if (conn.person_a === focusedPersonId && filteredIds.has(conn.person_b)) {
          connectedToFocusedPerson.add(conn.person_b)
        } else if (conn.person_b === focusedPersonId && filteredIds.has(conn.person_a)) {
          connectedToFocusedPerson.add(conn.person_a)
        }
      }
    }
  }

  for (const [ring, ringPeople] of rings) {
    const radius = RING_RADIUS[ring as RingKey] ?? RING_RADIUS.acquaintance
    const offset = RING_OFFSETS[ring as RingKey] ?? 0
    const count = ringPeople.length

    ringPeople.forEach((person, i) => {
      const angle = (2 * Math.PI * i) / count + offset
      const x = radius * Math.cos(angle)
      const y = radius * Math.sin(angle)

      const searchDimmed = searchQuery ? !searchMatchIds.has(person.id) : false
      const gentFocusDimmed = focusedGentId !== null && !connectedToFocusedGent.has(person.id)
      const personFocusDimmed = focusedPersonId !== null && !connectedToFocusedPerson.has(person.id)
      const dimmed = gentFocusDimmed || personFocusDimmed || searchDimmed
      const focused = focusedPersonId === person.id

      const savedPos = savedPositions?.[person.id]
      const position = savedPos ?? { x, y }

      nodes.push({
        id: `person-${person.id}`,
        type: 'personNode',
        position,
        data: {
          type: 'person',
          person,
          tier: ring,
          dimmed,
          recentlyActive: recentlyActiveIds?.has(person.id) ?? false,
          recencyDays: personRecency?.get(person.id) ?? null,
          focused,
        } satisfies PersonNodeData,
        draggable: true,
      })

      // Gent → Person edges — from person_gents (authoritative), fallback to added_by
      const connectedGentIds = personGentMap.get(person.id)
      const edgeGentIds = connectedGentIds && connectedGentIds.size > 0
        ? connectedGentIds
        : new Set(gentIds.has(person.added_by) ? [person.added_by] : [])

      for (const gId of edgeGentIds) {
        if (!gentIds.has(gId)) continue
        const alias = gentIdToAlias.get(gId) ?? 'lorekeeper'
        const edgeDimmed = (focusedGentId !== null && focusedGentId !== gId)
          || (focusedPersonId !== null && !connectedToFocusedPerson.has(person.id))
          || searchDimmed
        const count = (gentPersonCount.get(`${gId}-${person.id}`) ?? 0) + 1
        edges.push({
          id: `edge-gp-${gId}-${person.id}`,
          source: `gent-${gId}`,
          target: `person-${person.id}`,
          style: gentPersonEdgeStyle(alias, edgeDimmed, count),
        })
      }
    })
  }

  // 7. Person ↔ Person edges (shared entries) — thickness scales with shared count
  const entryPeople = new Map<string, string[]>()
  for (const a of appearances) {
    if (!filteredIds.has(a.person_id)) continue
    if (!entryPeople.has(a.entry_id)) entryPeople.set(a.entry_id, [])
    entryPeople.get(a.entry_id)!.push(a.person_id)
  }

  const personPairCount = new Map<string, number>()
  for (const [, pIds] of entryPeople) {
    for (let i = 0; i < pIds.length; i++) {
      for (let j = i + 1; j < pIds.length; j++) {
        const key = [pIds[i], pIds[j]].sort().join('-')
        personPairCount.set(key, (personPairCount.get(key) ?? 0) + 1)
      }
    }
  }

  for (const [key, count] of personPairCount) {
    const strokeWidth = count >= 4 ? 1.5 : count >= 2 ? 1 : 0.5
    const [idA, idB] = key.split('-')
    const ppSearchDimmed = searchQuery ? (!searchMatchIds.has(idA) || !searchMatchIds.has(idB)) : false
    const ppPersonFocusDimmed = focusedPersonId !== null
      && !connectedToFocusedPerson.has(idA) && !connectedToFocusedPerson.has(idB)
    const ppDimmed = ppSearchDimmed || ppPersonFocusDimmed
    // Highlight edges involving the focused person
    const ppHighlighted = focusedPersonId !== null
      && (idA === focusedPersonId || idB === focusedPersonId)
    edges.push({
      id: `pp-${key}`,
      source: `person-${idA}`,
      target: `person-${idB}`,
      label: ppHighlighted ? `${count}` : undefined,
      labelStyle: ppHighlighted ? { fill: '#c9a84c', fontSize: 10, fontFamily: 'Instrument Sans' } : undefined,
      labelBgStyle: ppHighlighted ? { fill: '#0a0a0f', fillOpacity: 0.8 } : undefined,
      labelBgPadding: ppHighlighted ? [4, 2] as [number, number] : undefined,
      style: {
        stroke: ppHighlighted ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.12)',
        strokeWidth: ppHighlighted ? Math.max(strokeWidth, 1.5) : strokeWidth,
        opacity: ppDimmed ? 0.05 : 1,
      },
      className: 'person-person-edge',
    })
  }

  // 8. Explicit person ↔ person connections (from person_connections table)
  if (personConnections) {
    // Track which pairs already have a co-appearance edge
    const existingPairs = new Set(personPairCount.keys())

    for (const conn of personConnections) {
      if (!filteredIds.has(conn.person_a) || !filteredIds.has(conn.person_b)) continue
      const key = [conn.person_a, conn.person_b].sort().join('-')
      // If there's already a co-appearance edge, upgrade it with the label
      if (existingPairs.has(key)) {
        if (conn.label) {
          const existing = edges.find(e => e.id === `pp-${key}`)
          if (existing) {
            existing.label = conn.label
            existing.labelStyle = { fill: '#c9a84c', fontSize: 10, fontFamily: 'Instrument Sans' }
            existing.labelBgStyle = { fill: '#0a0a0f', fillOpacity: 0.8 }
            existing.labelBgPadding = [4, 2] as [number, number]
            existing.style = { ...existing.style, strokeDasharray: '6 3' }
          }
        }
        continue
      }
      // New edge for explicit-only connections (no shared entries)
      const pcSearchDimmed = searchQuery ? (!searchMatchIds.has(conn.person_a) || !searchMatchIds.has(conn.person_b)) : false
      const pcPersonFocusDimmed = focusedPersonId !== null
        && !connectedToFocusedPerson.has(conn.person_a) && !connectedToFocusedPerson.has(conn.person_b)
      const pcDimmed = pcSearchDimmed || pcPersonFocusDimmed
      const pcHighlighted = focusedPersonId !== null
        && (conn.person_a === focusedPersonId || conn.person_b === focusedPersonId)

      edges.push({
        id: `pc-${conn.id}`,
        source: `person-${conn.person_a}`,
        target: `person-${conn.person_b}`,
        label: conn.label || undefined,
        labelStyle: conn.label ? { fill: '#c9a84c', fontSize: 10, fontFamily: 'Instrument Sans' } : undefined,
        labelBgStyle: conn.label ? { fill: '#0a0a0f', fillOpacity: 0.8 } : undefined,
        labelBgPadding: conn.label ? [4, 2] as [number, number] : undefined,
        style: {
          stroke: pcHighlighted ? 'rgba(201,168,76,0.5)' : 'rgba(255,255,255,0.2)',
          strokeWidth: pcHighlighted ? 1.5 : 1,
          strokeDasharray: '6 3',
          opacity: pcDimmed ? 0.05 : 1,
        },
      })
    }
  }

  return {
    nodes,
    edges,
    searchMatchNodeIds: [...searchMatchIds].map(id => `person-${id}`),
  }
}
