import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchAllGents } from '@/data/gents'
import { fetchPeople, fetchAllPersonGents } from '@/data/people'
import { fetchAllAppearances } from '@/data/personAppearances'
import { fetchRecentEntryIds } from '@/data/entries'
import { computeGraphData, type MindMapFilters } from '@/lib/mindMapLayout'
import { updatePerson } from '@/data/people'
import type { Gent, Person, PersonAppearance, PersonTier, GentAlias } from '@/types/app'
import type { Node } from '@xyflow/react'

// ── localStorage persistence for dragged node positions ─────────────────────
const POSITIONS_KEY = 'codex_mindmap_positions'

function loadPositions(): Record<string, { x: number; y: number }> {
  try { return JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}') }
  catch { return {} }
}

function savePosition(personId: string, pos: { x: number; y: number }) {
  const all = loadPositions()
  all[personId] = pos
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(all))
}

function clearPositions() {
  localStorage.removeItem(POSITIONS_KEY)
}

export function useMindMap() {
  const [gents, setGents] = useState<Gent[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [appearances, setAppearances] = useState<PersonAppearance[]>([])
  const [personGents, setPersonGents] = useState<Array<{ person_id: string; gent_id: string }>>([])
  const [loading, setLoading] = useState(true)
  const [recentEntryIds, setRecentEntryIds] = useState<Set<string>>(new Set())

  const [filters, setFilters] = useState<MindMapFilters>({ tier: 'all', gent: 'all' })
  const [focusedGentId, setFocusedGentId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>(loadPositions)

  useEffect(() => {
    setLoading(true)
    // Each fetch is independent — a failure in one must not block the others
    const g = fetchAllGents().then(setGents).catch(() => {})
    const p = fetchPeople().then(setPeople).catch(() => {})
    const a = fetchAllAppearances().then(setAppearances).catch(() => {})
    const r = fetchRecentEntryIds(7).then(ids => setRecentEntryIds(new Set(ids))).catch(() => {})
    const pg = fetchAllPersonGents().then(rows => { console.debug('[mindmap] person_gents:', rows.length); setPersonGents(rows) }).catch(e => console.error('[mindmap] person_gents failed:', e))
    Promise.all([g, p, a, r, pg]).finally(() => setLoading(false))
  }, [])

  const recentlyActivePersonIds = useMemo(() => {
    const active = new Set<string>()
    for (const a of appearances) {
      if (recentEntryIds.has(a.entry_id)) active.add(a.person_id)
    }
    return active
  }, [appearances, recentEntryIds])

  const graphData = useMemo(
    () => computeGraphData(gents, people, appearances, filters, focusedGentId, savedPositions, recentlyActivePersonIds, searchQuery, personGents),
    [gents, people, appearances, filters, focusedGentId, savedPositions, recentlyActivePersonIds, searchQuery, personGents]
  )

  const toggleGentFocus = useCallback((gentId: string) => {
    setFocusedGentId(prev => prev === gentId ? null : gentId)
  }, [])

  const setTierFilter = useCallback((tier: MindMapFilters['tier']) => {
    setFilters(prev => ({ ...prev, tier }))
  }, [])

  const setGentFilter = useCallback((gent: GentAlias | 'all') => {
    setFilters(prev => ({ ...prev, gent }))
  }, [])

  const updatePersonTier = useCallback(async (personId: string, tier: PersonTier) => {
    await updatePerson(personId, { tier } as Partial<Person>)
    setPeople(prev => prev.map(p => p.id === personId ? { ...p, tier } : p))
  }, [])

  const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
    const nodeData = node.data as Record<string, unknown>
    if (nodeData.type === 'person') {
      const person = nodeData.person as Person
      savePosition(person.id, node.position)
      setSavedPositions(prev => ({ ...prev, [person.id]: node.position }))
    }
  }, [])

  const clearPersonPosition = useCallback((personId: string) => {
    const all = loadPositions()
    delete all[personId]
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(all))
    setSavedPositions(prev => {
      const next = { ...prev }
      delete next[personId]
      return next
    })
  }, [])

  const resetLayout = useCallback(() => {
    clearPositions()
    setSavedPositions({})
  }, [])

  return {
    loading,
    filters,
    focusedGentId,
    nodes: graphData.nodes,
    edges: graphData.edges,
    searchMatchNodeIds: graphData.searchMatchNodeIds,
    gents,
    savedPositions,
    toggleGentFocus,
    setTierFilter,
    setGentFilter,
    updatePersonTier,
    handleNodeDragStop,
    clearPersonPosition,
    resetLayout,
    searchQuery,
    setSearchQuery,
  }
}
