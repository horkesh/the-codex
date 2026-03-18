import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchEntries, fetchParticipantsMap, ENTRY_COLUMNS } from '@/data/entries'
import { useAuthStore } from '@/store/auth'
import type { EntryWithParticipants, EntryType } from '@/types/app'

export interface ChronicleFilters {
  type?: EntryType
  gentId?: string
  year?: number
}

function matchesQuery(entry: EntryWithParticipants, q: string): boolean {
  const lower = q.toLowerCase()
  return (
    (entry.title?.toLowerCase().includes(lower)) ||
    (entry.description?.toLowerCase().includes(lower) ?? false) ||
    (entry.location?.toLowerCase().includes(lower) ?? false) ||
    (entry.city?.toLowerCase().includes(lower) ?? false) ||
    (entry.lore?.toLowerCase().includes(lower) ?? false)
  )
}

export function useChronicle() {
  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ChronicleFilters>({})
  const [query, setQuery] = useState('')
  const currentGentId = useAuthStore((s) => s.gent?.id)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEntries({ ...filters, currentGentId })
      setEntries(data)
    } catch {
      // fetchEntries threw — leave entries as-is, stop spinning
    } finally {
      setLoading(false)
    }
  }, [filters, currentGentId])

  useEffect(() => { load() }, [load])

  // Real-time subscription for new published entries
  useEffect(() => {
    const channel = supabase
      .channel('entries-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'entries',
        filter: 'status=eq.published',
      }, () => {
        load()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [load])

  const filteredEntries = useMemo(() => {
    if (!query.trim()) return entries
    return entries.filter((e) => matchesQuery(e, query.trim()))
  }, [entries, query])

  const removeEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const updateEntryLocal = useCallback((id: string, patch: Partial<EntryWithParticipants>) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, ...patch } : e))
  }, [])

  return { entries: filteredEntries, allEntries: entries, loading, filters, setFilters, query, setQuery, reload: load, removeEntry, updateEntryLocal }
}

export function useUpcomingGatherings(): { upcoming: EntryWithParticipants[]; loading: boolean } {
  const [upcoming, setUpcoming] = useState<EntryWithParticipants[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]

      // Fetch gathering entries with pre/post status
      const { data: entries, error } = await supabase
        .from('entries')
        .select(ENTRY_COLUMNS)
        .eq('type', 'gathering')
        .in('status', ['gathering_pre', 'gathering_post'])
        .order('date', { ascending: true })

      if (error) throw error
      if (!entries || entries.length === 0) {
        setUpcoming([])
        setLoading(false)
        return
      }

      // Filter client-side by metadata.event_date >= today
      const filtered = (entries as EntryWithParticipants[]).filter((e) => {
        const meta = e.metadata as Record<string, unknown>
        const eventDate = meta?.event_date as string | undefined
        if (!eventDate) return false
        return eventDate >= today
      })

      if (filtered.length === 0) {
        setUpcoming([])
        setLoading(false)
        return
      }

      const entryIds = filtered.map((e) => e.id)
      const participantMap = await fetchParticipantsMap(entryIds)

      const result: EntryWithParticipants[] = filtered.map((entry) => ({
        ...entry,
        participants: participantMap[entry.id] ?? [],
      }))

      // Sort by event_date ascending
      result.sort((a, b) => {
        const aDate = (a.metadata as Record<string, unknown>)?.event_date as string ?? ''
        const bDate = (b.metadata as Record<string, unknown>)?.event_date as string ?? ''
        return aDate.localeCompare(bDate)
      })

      setUpcoming(result)
    } catch {
      setUpcoming([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  return { upcoming, loading }
}
