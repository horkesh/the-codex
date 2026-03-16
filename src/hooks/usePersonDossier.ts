import { useState, useEffect } from 'react'
import { fetchAppearancesByPerson, fetchAppearancesByEntry } from '@/data/personAppearances'
import { fetchEntries, fetchEntryPhotos } from '@/data/entries'
import { fetchPeople } from '@/data/people'
import type { EntryWithParticipants, Person } from '@/types/app'

interface DossierAppearance {
  entry: EntryWithParticipants
  date: string
}

interface DossierPhoto {
  url: string
  entryId: string
}

interface PersonDossier {
  appearances: DossierAppearance[]
  lastSeen: { entry: EntryWithParticipants; date: string } | null
  coAppearing: Person[]
  photos: DossierPhoto[]
  loading: boolean
}

export function usePersonDossier(personId: string | undefined): PersonDossier {
  const [appearances, setAppearances] = useState<DossierAppearance[]>([])
  const [lastSeen, setLastSeen] = useState<PersonDossier['lastSeen']>(null)
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
        // Step 1: Get all appearances for this person
        const rawAppearances = await fetchAppearancesByPerson(personId!)
        if (cancelled) return
        if (rawAppearances.length === 0) {
          setLoading(false)
          return
        }

        // Step 2: Fetch the entries for these appearances
        const entryIds = [...new Set(rawAppearances.map(a => a.entry_id))]
        const entries = await fetchEntries({ ids: entryIds })
        if (cancelled) return

        // Build a map for quick lookup
        const entryMap = new Map(entries.map(e => [e.id, e]))

        // Step 3: Build appearances list sorted by date DESC, max 10
        const sorted = rawAppearances
          .map(a => {
            const entry = entryMap.get(a.entry_id)
            if (!entry) return null
            return { entry, date: entry.date }
          })
          .filter((a): a is DossierAppearance => a !== null)
          .sort((a, b) => b.date.localeCompare(a.date))

        const top10 = sorted.slice(0, 10)
        setAppearances(top10)

        // Step 4: Last seen = most recent
        if (sorted.length > 0) {
          setLastSeen(sorted[0])
        }

        // Step 5: Co-appearing people — find other person_ids in same entries
        const coPersonIds = new Set<string>()
        const entryIdsToCheck = sorted.slice(0, 10).map(a => a.entry.id)

        const coAppearancePromises = entryIdsToCheck.map(eid => fetchAppearancesByEntry(eid))
        const coAppearanceResults = await Promise.all(coAppearancePromises)
        if (cancelled) return

        for (const entryAppearances of coAppearanceResults) {
          for (const ap of entryAppearances) {
            if (ap.person_id !== personId) {
              coPersonIds.add(ap.person_id)
            }
          }
        }

        // Fetch co-appearing people (limit 10)
        if (coPersonIds.size > 0) {
          const allPeople = await fetchPeople()
          if (cancelled) return
          const coIds = [...coPersonIds].slice(0, 10)
          const coPeople = allPeople.filter(p => coIds.includes(p.id))
          setCoAppearing(coPeople)
        }

        // Step 6: Photos from entries this person is tagged in (max 9)
        const photoResults = await Promise.all(
          entryIdsToCheck.map(eid =>
            fetchEntryPhotos(eid)
              .then(photos => photos.map(p => ({ url: p.url, entryId: eid })))
              .catch(() => [] as DossierPhoto[])
          )
        )
        if (cancelled) return
        const allPhotos: DossierPhoto[] = []
        for (const batch of photoResults) {
          for (const p of batch) {
            if (allPhotos.length >= 9) break
            allPhotos.push(p)
          }
          if (allPhotos.length >= 9) break
        }
        setPhotos(allPhotos)
      } catch {
        // silently fail — dossier data is supplementary
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [personId])

  return { appearances, lastSeen, coAppearing, photos, loading }
}
