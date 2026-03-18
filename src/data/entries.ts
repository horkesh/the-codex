import { supabase } from '@/lib/supabase'
import type { Entry, EntryWithParticipants, Gent } from '@/types/app'
import { checkAndAwardAchievements } from '@/data/achievements'
import { checkAndAwardThresholds } from '@/data/thresholds'
import { imageToWebpBlob } from '@/lib/image'
import exifr from 'exifr'

export const ENTRY_COLUMNS = 'id, type, title, date, location, city, country, country_code, description, lore, lore_generated_at, cover_image_url, scene_url, status, pinned, visibility, metadata, created_by, created_at, updated_at'
const GENT_COLUMNS = 'id, alias, display_name, full_alias, avatar_url, bio'

/** Build a map of entryId → Gent[] from entry_participants rows */
export async function fetchParticipantsMap(entryIds: string[]): Promise<Record<string, Gent[]>> {
  if (entryIds.length === 0) return {}
  const { data, error } = await supabase
    .from('entry_participants')
    .select(`gent_id, entry_id, gents:gent_id (${GENT_COLUMNS})`)
    .in('entry_id', entryIds)
  if (error) throw error
  const map: Record<string, Gent[]> = {}
  for (const row of data ?? []) {
    const r = row as unknown as { entry_id: string; gents: Gent | null }
    if (!map[r.entry_id]) map[r.entry_id] = []
    if (r.gents) map[r.entry_id].push(r.gents)
  }
  return map
}

export async function fetchEntries(filters?: {
  type?: string
  gentId?: string
  year?: number
  ids?: string[]
  currentGentId?: string
}): Promise<EntryWithParticipants[]> {
  // Build the entries query
  let query = supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .in('status', ['published', 'gathering_post'])
    .order('pinned', { ascending: false })
    .order('date', { ascending: false })

  if (filters?.ids) {
    if (filters.ids.length === 0) return []
    query = query.in('id', filters.ids)
  }

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.year) {
    const yearStr = String(filters.year)
    query = query.gte('date', `${yearStr}-01-01`).lte('date', `${yearStr}-12-31`)
  }

  if (filters?.gentId) {
    // Fetch entry IDs where this gent participated
    const { data: participantRows, error: pErr } = await supabase
      .from('entry_participants')
      .select('entry_id')
      .eq('gent_id', filters.gentId)

    if (pErr) throw pErr

    const entryIds = (participantRows ?? []).map((r) => (r as { entry_id: string }).entry_id)
    if (entryIds.length === 0) return []
    query = query.in('id', entryIds)
  }

  // Filter private entries server-side: only show shared entries + own private entries
  if (filters?.currentGentId) {
    query = query.or(`visibility.eq.shared,created_by.eq.${filters.currentGentId}`)
  }

  const { data: rawEntries, error } = await query
  if (error) throw error
  if (!rawEntries || rawEntries.length === 0) return []

  const entries = rawEntries as unknown as Entry[]
  const participantMap = await fetchParticipantsMap(entries.map((e) => e.id))

  return entries.map((entry) => ({
    ...entry,
    participants: participantMap[entry.id] ?? [],
  }))
}

export async function fetchEntry(id: string): Promise<EntryWithParticipants | null> {
  const { data: rawEntry, error } = await supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  if (!rawEntry) return null

  const entry = rawEntry as unknown as Entry
  const participantMap = await fetchParticipantsMap([id])

  return { ...entry, participants: participantMap[id] ?? [] }
}

export async function createEntry(data: {
  type: string
  title: string
  date: string
  location?: string
  city?: string
  country?: string
  country_code?: string
  description?: string
  metadata?: Record<string, unknown>
  created_by: string
  visibility?: 'shared' | 'private'
}): Promise<Entry> {
  const { data: rawEntry, error } = await supabase
    .from('entries')
    .insert({
      type: data.type as Entry['type'],
      title: data.title,
      date: data.date,
      location: data.location ?? null,
      city: data.city ?? null,
      country: data.country ?? null,
      country_code: data.country_code ?? null,
      description: data.description ?? null,
      metadata: (data.metadata ?? {}) as unknown as Record<string, never>,
      created_by: data.created_by,
      status: 'published' as const,
      visibility: data.visibility ?? 'shared',
    })
    .select(ENTRY_COLUMNS)
    .single()

  if (error) throw error
  const entry = rawEntry as unknown as Entry
  // Fire-and-forget: check milestones + renumber volumes after publish
  Promise.all([
    checkAndAwardAchievements(data.created_by),
    checkAndAwardThresholds(data.created_by),
  ]).catch(() => {})
  if (data.type === 'steak' || data.type === 'playstation') {
    renumberVolumes(data.type).catch(() => {})
  }
  return entry
}

export async function updateEntry(id: string, data: Partial<Entry>): Promise<Entry> {
  const { data: rawEntry, error } = await supabase
    .from('entries')
    .update(data as unknown as Record<string, unknown>)
    .eq('id', id)
    .select(ENTRY_COLUMNS)
    .single()

  if (error) throw error
  return rawEntry as unknown as Entry
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function addEntryParticipants(entryId: string, gentIds: string[]): Promise<void> {
  const rows = gentIds.map((gentId) => ({ entry_id: entryId, gent_id: gentId }))
  const { error } = await supabase
    .from('entry_participants')
    .upsert(rows, { onConflict: 'entry_id,gent_id' })

  if (error) throw error
}

export async function removeEntryParticipants(entryId: string): Promise<void> {
  const { error } = await supabase
    .from('entry_participants')
    .delete()
    .eq('entry_id', entryId)

  if (error) throw error
}

export async function fetchEntryPhotos(entryId: string): Promise<Array<{
  id: string
  url: string
  caption: string | null
  sort_order: number
  taken_by: string | null
}>> {
  const { data, error } = await supabase
    .from('entry_photos')
    .select('id, url, caption, sort_order, taken_by')
    .eq('entry_id', entryId)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as Array<{
    id: string
    url: string
    caption: string | null
    sort_order: number
    taken_by: string | null
  }>
}

export async function fetchEntriesPhotos(entryIds: string[]): Promise<Array<{
  id: string
  url: string
  entry_id: string
  caption: string | null
  sort_order: number
}>> {
  if (entryIds.length === 0) return []
  const { data, error } = await supabase
    .from('entry_photos')
    .select('id, url, entry_id, caption, sort_order')
    .in('entry_id', entryIds)
    .order('sort_order', { ascending: true })

  if (error) throw error
  return (data ?? []) as Array<{ id: string; url: string; entry_id: string; caption: string | null; sort_order: number }>
}

export async function uploadEntryPhoto(
  entryId: string,
  file: File,
  sortOrder: number
): Promise<string> {
  const blob = await imageToWebpBlob(file)

  const baseName = file.name
    .replace(/\.[^.]+$/, '')               // strip original extension
    .replace(/[^a-zA-Z0-9._-]/g, '_')     // sanitise
    .replace(/_{2,}/g, '_')                // collapse runs
    .slice(0, 60)                          // cap length
  const path = `${entryId}/${Date.now()}-${baseName}.webp`

  const { error: uploadError } = await supabase.storage
    .from('entry-photos')
    .upload(path, blob, { upsert: false, contentType: 'image/webp' })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('entry-photos')
    .getPublicUrl(path)

  const publicUrl = urlData.publicUrl

  // Extract EXIF datetime (non-fatal)
  let exifTakenAt: string | null = null
  try {
    const parsed = await exifr.parse(file, ['DateTimeOriginal'])
    if (parsed?.DateTimeOriginal instanceof Date) {
      exifTakenAt = parsed.DateTimeOriginal.toISOString()
    }
  } catch { /* EXIF extraction is non-critical */ }

  // Insert metadata row — non-fatal; storage upload already succeeded so we always return the URL
  await supabase
    .from('entry_photos')
    .insert({
      entry_id: entryId,
      url: publicUrl,
      sort_order: sortOrder,
      caption: null,
      taken_by: null,
      exif_taken_at: exifTakenAt,
    })

  return publicUrl
}

export async function updateEntryLore(entryId: string, lore: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .update({
      lore,
      lore_generated_at: new Date().toISOString(),
    })
    .eq('id', entryId)

  if (error) throw error
}

export async function togglePin(entryId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('entries').update({ pinned }).eq('id', entryId)
  if (error) throw error
}

export async function updateEntryCover(entryId: string, coverUrl: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .update({ cover_image_url: coverUrl })
    .eq('id', entryId)

  if (error) throw error
}

/**
 * Renumber `· Vol. N` in titles for all entries of a given type,
 * based on chronological date order (oldest = Vol. 1).
 */
export async function renumberVolumes(type: string): Promise<void> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, title, date')
    .eq('type', type)
    .in('status', ['published', 'gathering_post'])
    .order('date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data) return

  const VOL_RE = /\s*·\s*Vol\.\s*\d+/
  const updates: Array<{ id: string; title: string }> = []

  let vol = 0
  for (const row of data as Array<{ id: string; title: string; date: string }>) {
    vol++
    if (!VOL_RE.test(row.title)) continue
    const newTitle = row.title.replace(VOL_RE, ` · Vol. ${vol}`)
    if (newTitle !== row.title) {
      updates.push({ id: row.id, title: newTitle })
    }
  }

  // Batch update changed titles in parallel
  await Promise.all(
    updates.map((u) => supabase.from('entries').update({ title: u.title }).eq('id', u.id))
  )
}

/**
 * Count entries of a type with date <= the given date (chronological vol position).
 */
export async function getChronologicalVol(type: string, date: string): Promise<number> {
  const { count, error } = await supabase
    .from('entries')
    .select('id', { count: 'exact', head: true })
    .eq('type', type)
    .in('status', ['published', 'gathering_post'])
    .lte('date', date)

  if (error) return 1
  // +1 because the new entry isn't inserted yet
  return (count ?? 0) + 1
}

export async function addPersonAppearances(entryId: string, personIds: string[], gentId: string): Promise<void> {
  if (personIds.length === 0) return
  const rows = personIds.map((personId) => ({
    entry_id: entryId,
    person_id: personId,
    noted_by: gentId,
  }))
  const { error } = await supabase
    .from('person_appearances')
    .upsert(rows, { onConflict: 'person_id,entry_id' })

  if (error) throw error
}

export interface CityVisit {
  visitNumber: number
  totalVisits: number
  companions: { id: string; date: string; title: string }[]
}

/** Fetch all missions to the same city, ordered by date ASC. Returns visit data for the given entry. */
export async function fetchCityVisits(city: string, entryId: string): Promise<CityVisit> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, date, title')
    .eq('type', 'mission')
    .eq('city', city)
    .in('status', ['published', 'gathering_post'])
    .order('date', { ascending: true })

  if (error) throw error
  const rows = (data ?? []) as { id: string; date: string; title: string }[]
  const idx = rows.findIndex(r => r.id === entryId)
  return {
    visitNumber: idx >= 0 ? idx + 1 : rows.length + 1,
    totalVisits: rows.length,
    companions: rows.filter(r => r.id !== entryId),
  }
}

export async function fetchRecentEntryIds(days: number): Promise<string[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('entries')
    .select('id')
    .gte('created_at', since.toISOString())
    .in('status', ['published', 'gathering_post'])
  if (error) throw error
  return (data ?? []).map(e => e.id)
}
