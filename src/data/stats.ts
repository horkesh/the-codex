import { supabase } from '@/lib/supabase'
import type { GentStats, GentAlias } from '@/types/app'

// Fetch all-time stats for all gents from the gent_stats view
export async function fetchAllStats(): Promise<GentStats[]> {
  const { data, error } = await supabase
    .from('gent_stats')
    .select('gent_id, alias, missions, nights_out, steaks, ps5_sessions, toasts, gatherings, people_met, countries_visited, cities_visited, stamps_collected')

  if (error) throw error

  return (data ?? []).map((row) => ({
    gent_id: row.gent_id ?? '',
    alias: (row.alias ?? 'keys') as GentAlias,
    missions: row.missions ?? 0,
    nights_out: row.nights_out ?? 0,
    steaks: row.steaks ?? 0,
    ps5_sessions: row.ps5_sessions ?? 0,
    toasts: row.toasts ?? 0,
    gatherings: row.gatherings ?? 0,
    people_met: row.people_met ?? 0,
    countries_visited: row.countries_visited ?? 0,
    cities_visited: row.cities_visited ?? 0,
    stamps_collected: row.stamps_collected ?? 0,
  }))
}

// Fetch per-year stats by counting entries with date within the given year.
// Queries entries and entry_participants directly and aggregates per gent per type.
export async function fetchYearStats(year: number): Promise<GentStats[]> {
  // Fetch all gents first so we have their ids and aliases
  const { data: gentsData, error: gentsError } = await supabase
    .from('gents')
    .select('id, alias')

  if (gentsError) throw gentsError

  const gents = (gentsData ?? []) as Array<{ id: string; alias: string }>

  // Fetch entries in the year with their participants
  const { data: participantRows, error: pErr } = await supabase
    .from('entry_participants')
    .select('gent_id, entries!inner(id, type, date)')
    .gte('entries.date', `${year}-01-01`)
    .lte('entries.date', `${year}-12-31`)

  if (pErr) throw pErr

  // Map entry type -> GentStats field
  const typeToField: Record<string, keyof Omit<GentStats, 'gent_id' | 'alias' | 'people_met' | 'countries_visited' | 'cities_visited' | 'stamps_collected'>> = {
    mission: 'missions',
    night_out: 'nights_out',
    steak: 'steaks',
    playstation: 'ps5_sessions',
    toast: 'toasts',
    gathering: 'gatherings',
  }

  // Build per-gent counts
  const countsByGent: Record<string, Partial<Record<string, number>>> = {}
  for (const gent of gents) {
    countsByGent[gent.id] = {}
  }

  for (const row of participantRows ?? []) {
    const r = row as unknown as { gent_id: string; entries: { type: string } }
    const gentId = r.gent_id
    const entryType = r.entries?.type
    if (!gentId || !entryType) continue
    if (!countsByGent[gentId]) countsByGent[gentId] = {}
    const field = typeToField[entryType]
    if (field) {
      countsByGent[gentId][field] = (countsByGent[gentId][field] ?? 0) + 1
    }
  }

  return gents.map((gent) => {
    const counts = countsByGent[gent.id] ?? {}
    return {
      gent_id: gent.id,
      alias: gent.alias as GentAlias,
      missions: counts['missions'] ?? 0,
      nights_out: counts['nights_out'] ?? 0,
      steaks: counts['steaks'] ?? 0,
      ps5_sessions: counts['ps5_sessions'] ?? 0,
      toasts: counts['toasts'] ?? 0,
      gatherings: counts['gatherings'] ?? 0,
      // These require cross-table aggregation not available from entry_participants alone
      people_met: 0,
      countries_visited: 0,
      cities_visited: 0,
      stamps_collected: 0,
    }
  })
}

// Fetch PS5 head-to-head: aggregate all PS5 entries' metadata.head_to_head_snapshot.
// Returns: Record<winner, Record<loser, wins>>
export async function fetchPS5HeadToHead(): Promise<Record<string, Record<string, number>>> {
  const { data, error } = await supabase
    .from('entries')
    .select('metadata')
    .eq('type', 'playstation')
    .in('status', ['published', 'gathering_post'])

  if (error) throw error

  const cumulative: Record<string, Record<string, number>> = {}

  for (const row of data ?? []) {
    const metadata = row.metadata as Record<string, unknown>
    const snapshot = metadata?.head_to_head_snapshot as Record<string, Record<string, number>> | undefined
    if (!snapshot) continue

    for (const winner of Object.keys(snapshot)) {
      if (!cumulative[winner]) cumulative[winner] = {}
      for (const loser of Object.keys(snapshot[winner])) {
        const wins = snapshot[winner][loser] ?? 0
        cumulative[winner][loser] = (cumulative[winner][loser] ?? 0) + wins
      }
    }
  }

  return cumulative
}

// Fetch total mission count per year for timeline
export async function fetchMissionsByYear(): Promise<Array<{ year: number; count: number }>> {
  const { data, error } = await supabase
    .from('entries')
    .select('date')
    .eq('type', 'mission')
    .in('status', ['published', 'gathering_post'])

  if (error) throw error

  const countByYear: Record<number, number> = {}

  for (const row of data ?? []) {
    const r = row as { date: string }
    if (!r.date) continue
    const year = parseInt(r.date.slice(0, 4), 10)
    if (isNaN(year)) continue
    countByYear[year] = (countByYear[year] ?? 0) + 1
  }

  return Object.entries(countByYear)
    .map(([year, count]) => ({ year: parseInt(year, 10), count }))
    .sort((a, b) => a.year - b.year)
}
