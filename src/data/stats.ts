import { supabase } from '@/lib/supabase'
import type { GentStats, GentAlias, PS5Match } from '@/types/app'
import { GENT_LABELS, GENT_ALIASES } from '@/lib/gents'

// ─── Comparison helpers ───────────────────────────────────────────────────────

export interface ComparisonStatRow {
  label: string
  field: keyof GentStats
}

export const COMPARISON_STAT_ROWS: ComparisonStatRow[] = [
  { label: 'Missions',   field: 'missions'          },
  { label: 'Nights Out', field: 'nights_out'         },
  { label: 'Steaks',     field: 'steaks'             },
  { label: 'Gatherings', field: 'gatherings'         },
  { label: 'Countries',  field: 'countries_visited'  },
  { label: 'People',     field: 'people_met'         },
  { label: 'Stamps',     field: 'stamps_collected'   },
]

export function computeLeaderSummary(statA: GentStats, statB: GentStats): string {
  let leadsA = 0
  let leadsB = 0
  for (const row of COMPARISON_STAT_ROWS) {
    const a = statA[row.field] as number
    const b = statB[row.field] as number
    if (a > b) leadsA++
    else if (b > a) leadsB++
  }
  if (leadsA > leadsB) return `${GENT_LABELS[statA.alias]} leads in ${leadsA} of ${COMPARISON_STAT_ROWS.length} categories`
  if (leadsB > leadsA) return `${GENT_LABELS[statB.alias]} leads in ${leadsB} of ${COMPARISON_STAT_ROWS.length} categories`
  return 'Perfectly matched'
}

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

// ─── PS5 All Matches (for ELO computation) ───────────────────────────────────

export interface PS5MatchFlat {
  p1: GentAlias
  p2: GentAlias
  winner: GentAlias | null
  date: string
}

/** Fetch every individual PS5 match across all sessions, ordered by date ASC. */
export async function fetchPS5AllMatches(): Promise<PS5MatchFlat[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('metadata, date')
    .eq('type', 'playstation')
    .in('status', ['published', 'gathering_post'])
    .order('date', { ascending: true })

  if (error) throw error

  const flat: PS5MatchFlat[] = []

  for (const row of data ?? []) {
    const metadata = row.metadata as Record<string, unknown>
    const entryDate = (row as { date: string }).date
    const matches = metadata?.matches as PS5Match[] | undefined
    if (!matches) continue

    for (const m of matches) {
      flat.push({
        p1: m.p1,
        p2: m.p2,
        winner: m.winner,
        date: entryDate,
      })
    }
  }

  return flat
}

// ─── PS5 Win Streaks ──────────────────────────────────────────────────────────

export interface PS5Streak {
  alias: GentAlias
  currentStreak: number
  longestStreak: number
  lastResult: 'win' | 'loss' | 'draw' | null
}

export async function fetchPS5Streaks(): Promise<PS5Streak[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('metadata, date')
    .eq('type', 'playstation')
    .in('status', ['published', 'gathering_post'])
    .order('date', { ascending: true })

  if (error) throw error

  // Track per-gent streaks
  const current: Record<GentAlias, number> = { keys: 0, bass: 0, lorekeeper: 0, operative: 0 }
  const longest: Record<GentAlias, number> = { keys: 0, bass: 0, lorekeeper: 0, operative: 0 }
  const lastResult: Record<GentAlias, 'win' | 'loss' | 'draw' | null> = {
    keys: null,
    bass: null,
    lorekeeper: null,
    operative: null,
  }

  for (const row of data ?? []) {
    const metadata = row.metadata as Record<string, unknown>
    const matches = metadata?.matches as PS5Match[] | undefined
    if (!matches) continue

    for (const match of matches) {
      const { p1, p2, winner } = match
      const participants = [p1, p2] as GentAlias[]

      for (const alias of participants) {
        if (winner === null) {
          // Draw — resets streak
          current[alias] = 0
          lastResult[alias] = 'draw'
        } else if (winner === alias) {
          current[alias] += 1
          lastResult[alias] = 'win'
          if (current[alias] > longest[alias]) {
            longest[alias] = current[alias]
          }
        } else {
          current[alias] = 0
          lastResult[alias] = 'loss'
        }
      }
    }
  }

  return GENT_ALIASES.map((alias) => ({
    alias,
    currentStreak: current[alias],
    longestStreak: longest[alias],
    lastResult: lastResult[alias],
  }))
}

// ─── Steak Ratings ───────────────────────────────────────────────────────────

export interface SteakRating {
  entry_id: string
  title: string
  location: string | null
  date: string
  score: number
  cut: string | null
}

export async function fetchSteakRatings(): Promise<SteakRating[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, title, location, date, metadata')
    .eq('type', 'steak')
    .in('status', ['published', 'gathering_post'])
    .order('date', { ascending: true })

  if (error) throw error

  const ratings: SteakRating[] = []

  for (const row of data ?? []) {
    const r = row as { id: string; title: string; location: string | null; date: string; metadata: Record<string, unknown> }
    const meta = r.metadata ?? {}
    const score = typeof meta.score === 'number' ? meta.score : typeof meta.score === 'string' ? parseFloat(meta.score) : null
    if (score === null || isNaN(score)) continue

    ratings.push({
      entry_id: r.id,
      title: r.title,
      location: r.location,
      date: r.date,
      score,
      cut: typeof meta.cut === 'string' ? meta.cut : null,
    })
  }

  return ratings
}
