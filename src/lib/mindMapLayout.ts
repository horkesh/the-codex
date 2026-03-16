import type { Node, Edge } from '@xyflow/react'
import type { Gent, Person, PersonAppearance, PersonTier, GentAlias } from '@/types/app'

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
  [key: string]: unknown
}

export interface PersonNodeData {
  type: 'person'
  person: Person
  tier: string
  dimmed: boolean
  recentlyActive: boolean
  [key: string]: unknown
}

// ── Main function ────────────────────────────────────────────────────────────
export function computeGraphData(
  gents: Gent[],
  people: Person[],
  appearances: PersonAppearance[],
  filters: MindMapFilters,
  focusedGentId: string | null,
  savedPositions?: Record<string, { x: number; y: number }>,
  recentlyActiveIds?: Set<string>,
  searchQuery?: string,
): { nodes: Node[]; edges: Edge[]; searchMatchNodeIds: string[] } {
  const nodes: Node[] = []
  const edges: Edge[] = []

  // 1. Place gents in equilateral triangle at center
  const gentPositions: Array<{ x: number; y: number }> = [
    { x: 0, y: -80 },
    { x: -69, y: 40 },
    { x: 69, y: 40 },
  ]

  // Map of gent id → alias for quick lookup
  const gentIdToAlias = new Map<string, GentAlias>()
  const gentIds = new Set<string>()

  gents.forEach((g, i) => {
    gentIdToAlias.set(g.id, g.alias)
    gentIds.add(g.id)
    const pos = gentPositions[i] ?? { x: 0, y: 0 }
    const dimmed = (focusedGentId !== null && focusedGentId !== g.id) || (!!searchQuery && searchMatchIds.size > 0)

    nodes.push({
      id: `gent-${g.id}`,
      type: 'gentNode',
      position: pos,
      data: { type: 'gent', gent: g, dimmed } satisfies GentNodeData,
      draggable: true,
    })
  })

  // 2. Gent ↔ Gent edges (always)
  for (let i = 0; i < gents.length; i++) {
    for (let j = i + 1; j < gents.length; j++) {
      const dimmed = focusedGentId !== null || (!!searchQuery && searchMatchIds.size > 0)
      edges.push({
        id: `gent-edge-${gents[i].id}-${gents[j].id}`,
        source: `gent-${gents[i].id}`,
        target: `gent-${gents[j].id}`,
        style: { stroke: '#C9A84C', strokeWidth: 3, opacity: dimmed ? 0.05 : 1 },
        animated: false,
      })
    }
  }

  // 3. Build appearance index: person_id → Set<entry_id>, person_id → Set<gent_id (noted_by)>
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

  // Build search match set
  const searchMatchIds = new Set<string>()
  if (searchQuery) {
    const q = searchQuery.toLowerCase()
    for (const p of filtered) {
      if (p.name.toLowerCase().includes(q)) searchMatchIds.add(p.id)
    }
  }

  if (filters.gent !== 'all') {
    const targetGent = gents.find(g => g.alias === filters.gent)
    if (targetGent) {
      filtered = filtered.filter(p => {
        const isAddedBy = p.added_by === targetGent.id
        const isNotedBy = personNoters.get(p.id)?.has(targetGent.id) ?? false
        return isAddedBy || isNotedBy
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
  const connectedToFocused = new Set<string>()

  if (focusedGentId) {
    // Find all people connected to focused gent
    for (const p of filtered) {
      const isAddedBy = p.added_by === focusedGentId
      const isNotedBy = personNoters.get(p.id)?.has(focusedGentId) ?? false
      if (isAddedBy || isNotedBy) connectedToFocused.add(p.id)
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
      const dimmed = (focusedGentId !== null && !connectedToFocused.has(person.id)) || searchDimmed

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
        } satisfies PersonNodeData,
        draggable: true,
      })

      // Gent → Person edges
      // Edge from added_by gent
      if (gentIds.has(person.added_by)) {
        const alias = gentIdToAlias.get(person.added_by) ?? 'lorekeeper'
        const edgeDimmed = (focusedGentId !== null && focusedGentId !== person.added_by) || searchDimmed
        const addedCount = (gentPersonCount.get(`${person.added_by}-${person.id}`) ?? 0) + 1
        edges.push({
          id: `edge-added-${person.added_by}-${person.id}`,
          source: `gent-${person.added_by}`,
          target: `person-${person.id}`,
          style: gentPersonEdgeStyle(alias, edgeDimmed, addedCount),
        })
      }

      // Edges from noted_by gents (if different from added_by)
      const noters = personNoters.get(person.id)
      if (noters) {
        for (const noterId of noters) {
          if (noterId === person.added_by) continue
          if (!gentIds.has(noterId)) continue
          const alias = gentIdToAlias.get(noterId) ?? 'lorekeeper'
          const edgeDimmed = (focusedGentId !== null && focusedGentId !== noterId) || searchDimmed
          const notedCount = gentPersonCount.get(`${noterId}-${person.id}`) ?? 1
          edges.push({
            id: `edge-noted-${noterId}-${person.id}`,
            source: `gent-${noterId}`,
            target: `person-${person.id}`,
            style: gentPersonEdgeStyle(alias, edgeDimmed, notedCount),
          })
        }
      }
    })
  }

  // 7. Person ↔ Person edges (shared entries) — thickness scales with shared count
  const filteredIds = new Set(filtered.map(p => p.id))
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
    edges.push({
      id: `pp-${key}`,
      source: `person-${idA}`,
      target: `person-${idB}`,
      style: {
        stroke: 'rgba(255,255,255,0.12)',
        strokeWidth,
        opacity: ppSearchDimmed ? 0.05 : 1,
      },
      className: 'person-person-edge',
    })
  }

  return {
    nodes,
    edges,
    searchMatchNodeIds: [...searchMatchIds].map(id => `person-${id}`),
  }
}
