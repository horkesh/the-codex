import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchEntries, ENTRY_COLUMNS } from '@/data/entries'
import type { EntryWithParticipants, EntryType, Gent } from '@/types/app'

export interface ChronicleFilters {
  type?: EntryType
  gentId?: string
  year?: number
}

export function useChronicle() {
  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<ChronicleFilters>({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await fetchEntries(filters)
      setEntries(data)
    } catch {
      // fetchEntries threw — leave entries as-is, stop spinning
    } finally {
      setLoading(false)
    }
  }, [filters])

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

  return { entries, loading, filters, setFilters, reload: load }
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

      // Fetch participants
      const { data: participantRows, error: pErr } = await supabase
        .from('entry_participants')
        .select('gent_id, entry_id, gents:gent_id (id, alias, display_name, full_alias, avatar_url, bio, portrait_url, status, status_expires_at)')
        .in('entry_id', entryIds)

      if (pErr) throw pErr

      type ParticipantRow = { entry_id: string; gents: Gent | null }
      const participantMap: Record<string, Gent[]> = {}
      for (const row of participantRows ?? []) {
        const r = row as ParticipantRow
        if (!participantMap[r.entry_id]) participantMap[r.entry_id] = []
        if (r.gents) participantMap[r.entry_id].push(r.gents)
      }

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
