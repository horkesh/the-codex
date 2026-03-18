import { supabase } from '@/lib/supabase'
import { fetchParticipantsMap } from '@/data/entries'
import type { Entry, EntryWithParticipants, Gent, GentStats, GentAlias } from '@/types/app'

const ENTRY_COLUMNS = 'id, type, title, date, location, city, country, country_code, description, lore, cover_image_url, metadata, pinned, created_at'

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
  const participantMap = await fetchParticipantsMap(entries.map(e => e.id))

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
