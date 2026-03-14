import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchAppearancesByEntry, addPersonToEntry, removePersonFromEntry } from '@/data/personAppearances'
import { fetchPeople } from '@/data/people'
import { useAuthStore } from '@/store/auth'
import type { Person, PersonAppearance } from '@/types/app'

export function useTagPeople(entryId: string | undefined) {
  const { gent } = useAuthStore()
  const [appearances, setAppearances] = useState<PersonAppearance[]>([])
  const [allPeople, setAllPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!entryId) return
    setLoading(true)
    Promise.all([
      fetchAppearancesByEntry(entryId),
      fetchPeople(),
    ])
      .then(([apps, ppl]) => {
        setAppearances(apps)
        setAllPeople(ppl)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [entryId])

  const taggedIds = useMemo(
    () => new Set(appearances.map(a => a.person_id)),
    [appearances]
  )

  const taggedPeople = useMemo(
    () => allPeople.filter(p => taggedIds.has(p.id)),
    [allPeople, taggedIds]
  )

  const addPerson = useCallback(async (personId: string) => {
    if (!entryId || !gent) return
    try {
      const app = await addPersonToEntry(personId, entryId, gent.id)
      setAppearances(prev => [...prev, app])
    } catch { /* toast handled upstream */ }
  }, [entryId, gent])

  const removePerson = useCallback(async (personId: string) => {
    if (!entryId) return
    try {
      await removePersonFromEntry(personId, entryId)
      setAppearances(prev => prev.filter(a => a.person_id !== personId))
    } catch { /* toast handled upstream */ }
  }, [entryId])

  return { taggedPeople, taggedIds, allPeople, loading, addPerson, removePerson }
}
