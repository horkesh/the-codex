import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchAllGents } from '@/data/gents'
import { fetchPeople } from '@/data/people'
import { fetchAllAppearances } from '@/data/personAppearances'
import { computeGraphData, type MindMapFilters } from '@/lib/mindMapLayout'
import { updatePerson } from '@/data/people'
import type { Gent, Person, PersonAppearance, PersonTier, GentAlias } from '@/types/app'

export function useMindMap() {
  const [gents, setGents] = useState<Gent[]>([])
  const [people, setPeople] = useState<Person[]>([])
  const [appearances, setAppearances] = useState<PersonAppearance[]>([])
  const [loading, setLoading] = useState(true)

  const [filters, setFilters] = useState<MindMapFilters>({ tier: 'all', gent: 'all' })
  const [focusedGentId, setFocusedGentId] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    // Gents + people are required — appearances are optional (table may not exist yet)
    Promise.all([fetchAllGents(), fetchPeople()])
      .then(([g, p]) => {
        setGents(g)
        setPeople(p)
      })
      .catch(() => {})
      .finally(() => setLoading(false))

    fetchAllAppearances()
      .then(setAppearances)
      .catch(() => {})
  }, [])

  const graphData = useMemo(
    () => computeGraphData(gents, people, appearances, filters, focusedGentId),
    [gents, people, appearances, filters, focusedGentId]
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

  return {
    loading,
    filters,
    focusedGentId,
    nodes: graphData.nodes,
    edges: graphData.edges,
    toggleGentFocus,
    setTierFilter,
    setGentFilter,
    updatePersonTier,
  }
}
