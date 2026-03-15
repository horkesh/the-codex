import { supabase } from '@/lib/supabase'
import type { Entry, EntryWithParticipants, Gent } from '@/types/app'
import { checkAndAwardAchievements } from '@/data/achievements'
import { checkAndAwardThresholds } from '@/data/thresholds'
import { imageToJpegBlob } from '@/lib/image'

export const ENTRY_COLUMNS = 'id, type, title, date, location, city, country, country_code, description, lore, lore_generated_at, cover_image_url, status, metadata, created_by, created_at, updated_at'
const GENT_COLUMNS = 'id, alias, display_name, full_alias, avatar_url, bio'

export async function fetchEntries(filters?: {
  type?: string
  gentId?: string
  year?: number
  ids?: string[]
}): Promise<EntryWithParticipants[]> {
  // Build the entries query
  let query = supabase
    .from('entries')
    .select(ENTRY_COLUMNS)
    .in('status', ['published', 'gathering_post'])
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

  const { data: rawEntries, error } = await query
  if (error) throw error
  if (!rawEntries || rawEntries.length === 0) return []

  const entries = rawEntries as unknown as Entry[]
  const entryIds = entries.map((e) => e.id)

  // Fetch all participants for those entries in one query
  const { data: participantRows, error: pErr } = await supabase
    .from('entry_participants')
    .select(`gent_id, entry_id, gents:gent_id (${GENT_COLUMNS})`)
    .in('entry_id', entryIds)

  if (pErr) throw pErr

  // Build a map of entryId -> Gent[]
  const participantMap: Record<string, Gent[]> = {}
  for (const row of participantRows ?? []) {
    const r = row as unknown as { entry_id: string; gents: Gent | null }
    if (!participantMap[r.entry_id]) participantMap[r.entry_id] = []
    if (r.gents) participantMap[r.entry_id].push(r.gents)
  }

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

  const { data: participantRows, error: pErr } = await supabase
    .from('entry_participants')
    .select(`gent_id, entry_id, gents:gent_id (${GENT_COLUMNS})`)
    .eq('entry_id', id)

  if (pErr) throw pErr

  const participants: Gent[] = (participantRows ?? [])
    .map((r) => (r as unknown as { gents: Gent | null }).gents)
    .filter((g): g is Gent => g !== null)

  return { ...entry, participants }
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
    })
    .select(ENTRY_COLUMNS)
    .single()

  if (error) throw error
  const entry = rawEntry as unknown as Entry
  // Fire-and-forget: check milestones after publish
  Promise.all([
    checkAndAwardAchievements(data.created_by),
    checkAndAwardThresholds(data.created_by),
  ]).catch(() => {})
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

export async function uploadEntryPhoto(
  entryId: string,
  file: File,
  sortOrder: number
): Promise<string> {
  const blob = await imageToJpegBlob(file)

  const baseName = file.name
    .replace(/\.[^.]+$/, '')               // strip original extension
    .replace(/[^a-zA-Z0-9._-]/g, '_')     // sanitise
    .replace(/_{2,}/g, '_')                // collapse runs
    .slice(0, 60)                          // cap length
  const path = `${entryId}/${Date.now()}-${baseName}.jpg`

  const { error: uploadError } = await supabase.storage
    .from('entry-photos')
    .upload(path, blob, { upsert: false, contentType: 'image/jpeg' })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('entry-photos')
    .getPublicUrl(path)

  const publicUrl = urlData.publicUrl

  // Insert metadata row — non-fatal; storage upload already succeeded so we always return the URL
  await supabase
    .from('entry_photos')
    .insert({
      entry_id: entryId,
      url: publicUrl,
      sort_order: sortOrder,
      caption: null,
      taken_by: null,
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

export async function updateEntryCover(entryId: string, coverUrl: string): Promise<void> {
  const { error } = await supabase
    .from('entries')
    .update({ cover_image_url: coverUrl })
    .eq('id', entryId)

  if (error) throw error
}
