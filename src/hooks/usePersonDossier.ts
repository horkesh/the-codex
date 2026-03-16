import { useState, useEffect } from 'react'
import { fetchAppearancesByPerson, fetchAppearancesByEntries } from '@/data/personAppearances'
import { fetchEntries, fetchEntriesPhotos } from '@/data/entries'
import { fetchPeopleByIds } from '@/data/people'
import type { EntryWithParticipants, Person } from '@/types/app'

export interface DossierAppearance {
  entry: EntryWithParticipants
  date: string
}

interface DossierPhoto {
  url: string
  entryId: string
}

export interface PersonDossierData {
  appearances: DossierAppearance[]
  coAppearing: Person[]
  photos: DossierPhoto[]
  loading: boolean
}

export function usePersonDossier(personId: string | undefined): PersonDossierData {
  const [appearances, setAppearances] = useState<DossierAppearance[]>([])
  const [coAppearing, setCoAppearing] = useState<Person[]>([])
  const [photos, setPhotos] = useState<DossierPhoto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!personId) {
      setLoading(false)
      return
    }

    let cancelled = false

    async function load() {
      try {
        // 1. Get all appearances for this person
        const rawAppearances = await fetchAppearancesByPerson(personId!)
        if (cancelled) return
        if (rawAppearances.length === 0) {
          setLoading(false)
          return
        }

        // 2. Fetch entries for these appearances (single batch query)
        const entryIds = [...new Set(rawAppearances.map(a => a.entry_id))]
        const entries = await fetchEntries({ ids: entryIds })
        if (cancelled) return

        const entryMap = new Map(entries.map(e => [e.id, e]))

        // 3. Build sorted appearances (max 10)
        const sorted = rawAppearances
          .map(a => {
            const entry = entryMap.get(a.entry_id)
            if (!entry) return null
            return { entry, date: entry.date }
          })
          .filter((a): a is DossierAppearance => a !== null)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 10)

        setAppearances(sorted)

        // 4. Fetch co-appearances + photos in parallel (2 batch queries instead of 20)
        const checkIds = sorted.map(a => a.entry.id)
        const [coAppearanceResults, photoResults] = await Promise.all([
          fetchAppearancesByEntries(checkIds),
          fetchEntriesPhotos(checkIds),
        ])
        if (cancelled) return

        // 5. Derive co-appearing person IDs
        const coPersonIds = new Set<string>()
        for (const ap of coAppearanceResults) {
          if (ap.person_id !== personId) coPersonIds.add(ap.person_id)
        }

        // 6. Fetch co-appearing people by IDs (single batch query)
        if (coPersonIds.size > 0) {
          const coIds = [...coPersonIds].slice(0, 10)
          const coPeople = await fetchPeopleByIds(coIds)
          if (cancelled) return
          setCoAppearing(coPeople)
        }

        // 7. Build photos list (max 9)
        setPhotos(
          photoResults
            .slice(0, 9)
            .map(p => ({ url: p.url, entryId: p.entry_id }))
        )
      } catch {
        // silently fail — dossier data is supplementary
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [personId])

  return { appearances, coAppearing, photos, loading }
}
