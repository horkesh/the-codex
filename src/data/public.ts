import { supabase } from '@/lib/supabase'
import type { Entry, EntryWithParticipants, Gent, GentStats, GentAlias } from '@/types/app'

const ENTRY_COLUMNS = 'id, type, title, date, location, city, country, country_code, description, lore, cover_image_url, metadata, pinned, created_at'
const GENT_COLUMNS = 'id, alias, display_name, full_alias, avatar_url, portrait_url'

/** Fetch pinned+shared+published entries (no auth needed) */
export async function fetchPublicEntries(): Promise<EntryWithParticipants[]> {
  const { data: rawEntries, error } = await supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('pinned', true)
    .eq('visibility', 'shared')
    .in('status', ['published', 'gathering_post'])
    .order('date', { ascending: false })

  if (error || !rawEntries?.length) return []
  const entries = rawEntries as unknown as Entry[]
  const entryIds = entries.map(e => e.id)

  const { data: participantRows } = await supabase
    .from('entry_participants')
    .select(`gent_id, entry_id, gents:gent_id (${GENT_COLUMNS})`)
    .in('entry_id', entryIds)

  const participantMap: Record<string, Gent[]> = {}
  for (const row of participantRows ?? []) {
    const r = row as unknown as { entry_id: string; gents: Gent | null }
    if (!participantMap[r.entry_id]) participantMap[r.entry_id] = []
    if (r.gents) participantMap[r.entry_id].push(r.gents)
  }

  return entries.map(entry => ({ ...entry, participants: participantMap[entry.id] ?? [] }))
}

/** Fetch all gent profiles (no auth needed) */
export async function fetchPublicGents(): Promise<Gent[]> {
  const { data, error } = await supabase
    .from('gents')
    .select(GENT_COLUMNS)
    .order('alias')
  if (error || !data) return []
  return data as Gent[]
}

/** Fetch gent stats from the gent_stats view (no auth needed) */
export async function fetchPublicStats(): Promise<GentStats[]> {
  const { data, error } = await supabase
    .from('gent_stats')
    .select('gent_id, alias, missions, nights_out, steaks, ps5_sessions, toasts, gatherings, people_met, countries_visited, cities_visited, stamps_collected')

  if (error || !data) return []
  return data.map(row => ({
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

/** Extract unique mission cities from entries for the travel map */
export function extractMissionCities(entries: EntryWithParticipants[]): Array<{ city: string; country: string; countryCode: string }> {
  const seen = new Set<string>()
  const cities: Array<{ city: string; country: string; countryCode: string }> = []
  for (const e of entries) {
    if (e.type !== 'mission' || !e.city || !e.country) continue
    const key = `${e.city}|${e.country}`
    if (seen.has(key)) continue
    seen.add(key)
    cities.push({ city: e.city, country: e.country, countryCode: e.country_code ?? '' })
  }
  return cities
}

/** Fetch ALL mission cities (not just pinned) for the travel map */
export async function fetchPublicMissionCities(): Promise<Array<{ city: string; country: string; countryCode: string }>> {
  const { data, error } = await supabase
    .from('entries')
    .select('city, country, country_code')
    .eq('type', 'mission')
    .eq('visibility', 'shared')
    .in('status', ['published', 'gathering_post'])
    .not('city', 'is', null)

  if (error || !data?.length) return []

  const seen = new Set<string>()
  const cities: Array<{ city: string; country: string; countryCode: string }> = []
  for (const row of data as Array<{ city: string; country: string; country_code: string }>) {
    if (!row.city || !row.country) continue
    const key = `${row.city}|${row.country}`
    if (seen.has(key)) continue
    seen.add(key)
    cities.push({ city: row.city, country: row.country, countryCode: row.country_code ?? '' })
  }
  return cities
}
