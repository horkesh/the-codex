import { supabase } from '@/lib/supabase'
import type { Person, PersonWithPrivateNote } from '@/types/app'

const PERSON_COLUMNS = 'id, name, instagram, photo_url, portrait_url, instagram_source_url, met_at_entry, met_date, met_location, notes, labels, added_by, category, tier, poi_source_url, poi_intel, poi_source_gent, poi_visibility, birthday'

export async function fetchPeople(filters?: {
  search?: string
  label?: string
}): Promise<Person[]> {
  let query = supabase
    .from('people')
    .select(PERSON_COLUMNS)
    .order('name', { ascending: true })

  if (filters?.search) {
    query = query.or(
      `name.ilike.%${filters.search}%,instagram.ilike.%${filters.search}%`
    )
  }

  if (filters?.label) {
    query = query.contains('labels', [filters.label])
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Person[]
}

export async function fetchPeopleByIds(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase
    .from('people')
    .select(PERSON_COLUMNS)
    .in('id', ids)
  if (error) throw error
  return (data ?? []) as unknown as Person[]
}

export async function fetchPerson(id: string): Promise<Person | null> {
  const { data, error } = await supabase
    .from('people')
    .select(PERSON_COLUMNS)
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  if (!data) return null
  return data as unknown as Person
}

export async function fetchPersonWithNote(
  id: string,
  gentId: string
): Promise<PersonWithPrivateNote | null> {
  const person = await fetchPerson(id)
  if (!person) return null

  const { data: noteRow, error: noteError } = await supabase
    .from('people_notes')
    .select('note')
    .eq('gent_id', gentId)
    .eq('person_id', id)
    .maybeSingle()

  if (noteError && noteError.code !== 'PGRST116') throw noteError

  const private_note = noteRow ? (noteRow as unknown as { note: string }).note : null

  return { ...person, private_note }
}

export async function createPerson(data: {
  name: string
  instagram?: string
  photo_url?: string
  met_at_entry?: string
  met_date?: string
  met_location?: string
  notes?: string
  labels?: string[]
  added_by: string
}): Promise<Person> {
  const { data: rawPerson, error } = await supabase
    .from('people')
    .insert({
      name: data.name,
      instagram: data.instagram ?? null,
      photo_url: data.photo_url ?? null,
      met_at_entry: data.met_at_entry ?? null,
      met_date: data.met_date ?? null,
      met_location: data.met_location ?? null,
      notes: data.notes ?? null,
      labels: data.labels ?? [],
      added_by: data.added_by,
    })
    .select(PERSON_COLUMNS)
    .single()

  if (error) throw error
  const person = rawPerson as unknown as Person

  // Auto-link creator in person_gents
  try {
    await (supabase.from('person_gents' as never) as any)
      .insert({ person_id: person.id, gent_id: data.added_by })
      .select()
  } catch { /* non-fatal */ }

  return person
}

export async function createPersonFromScan(data: {
  name: string
  instagram: string | null
  instagram_source_url: string | null
  photo_url: string | null
  portrait_url: string | null
  bio: string | null
  poi_intel: string | null
  category: 'contact' | 'person_of_interest'
  poi_visibility: 'private' | 'circle'
  tier: 'inner_circle' | 'outer_circle' | 'acquaintance'
  added_by: string
  labels: string[]
}): Promise<Person> {
  const { data: rawPerson, error } = await supabase
    .from('people')
    .insert({
      name: data.name,
      instagram: data.instagram ?? null,
      instagram_source_url: data.instagram_source_url ?? null,
      photo_url: data.photo_url ?? null,
      portrait_url: data.portrait_url ?? null,
      notes: data.bio ?? null,
      poi_intel: data.poi_intel ?? null,
      category: data.category,
      poi_visibility: data.poi_visibility,
      tier: data.tier,
      labels: data.labels,
      added_by: data.added_by,
    })
    .select(PERSON_COLUMNS)
    .single()

  if (error) throw error
  const person = rawPerson as unknown as Person

  // Auto-link creator in person_gents
  try {
    await (supabase.from('person_gents' as never) as any)
      .insert({ person_id: person.id, gent_id: data.added_by })
      .select()
  } catch { /* non-fatal */ }

  return person
}

export async function updatePerson(
  id: string,
  data: Partial<Person>
): Promise<Person> {
  const { data: rawPerson, error } = await supabase
    .from('people')
    .update(data as unknown as Record<string, unknown>)
    .eq('id', id)
    .select(PERSON_COLUMNS)
    .single()

  if (error) throw error
  return rawPerson as unknown as Person
}

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase
    .from('people')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function upsertPrivateNote(
  personId: string,
  gentId: string,
  note: string
): Promise<void> {
  const { error } = await supabase
    .from('people_notes')
    .upsert(
      {
        person_id: personId,
        gent_id: gentId,
        note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'gent_id,person_id' }
    )

  if (error) throw error
}

export async function fetchPrivateNote(
  personId: string,
  gentId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('people_notes')
    .select('note')
    .eq('person_id', personId)
    .eq('gent_id', gentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data ? (data as unknown as { note: string }).note : null
}

export async function uploadPersonPhoto(
  personId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${personId}/photo-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from('people-photos')
    .upload(path, file, { upsert: false })

  if (uploadError) throw uploadError

  const { data: urlData } = supabase.storage
    .from('people-photos')
    .getPublicUrl(path)

  const publicUrl = urlData.publicUrl

  await updatePerson(personId, { photo_url: publicUrl })

  return publicUrl
}

export async function fetchAllLabels(): Promise<string[]> {
  const { data, error } = await supabase
    .from('people')
    .select('labels')
    .not('labels', 'eq', '{}')

  if (error) throw error

  const rows = (data ?? []) as unknown as Array<{ labels: string[] | null }>
  const allLabels = rows.flatMap((row) => row.labels ?? [])
  return Array.from(new Set(allLabels)).sort()
}

/**
 * Check if a normalized Instagram handle already exists in people (globally).
 * Returns the existing person's name, or null if no duplicate.
 */
export async function findPersonByInstagram(handle: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('people')
    .select('name')
    .ilike('instagram', handle)
    .maybeSingle()
  if (error) throw error
  return data ? (data as unknown as { name: string }).name : null
}

export async function fetchPeopleByCategory(category: 'contact' | 'person_of_interest'): Promise<Person[]> {
  const { data, error } = await supabase
    .from('people')
    .select('*')
    .eq('category', category)
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Person[]
}

export async function convertPOIToContact(id: string): Promise<void> {
  const { error } = await supabase
    .from('people')
    .update({ category: 'contact', tier: 'acquaintance', poi_visibility: 'private' })
    .eq('id', id)
  if (error) throw error
}

export async function fetchPeopleQuick(query?: string): Promise<Array<{ id: string; name: string; photo_url: string | null }>> {
  let q = supabase
    .from('people')
    .select('id, name, photo_url')
    .order('name', { ascending: true })
    .limit(20)

  if (query) {
    q = q.ilike('name', `%${query}%`)
  }

  const { data, error } = await q
  if (error) throw error
  return (data ?? []) as Array<{ id: string; name: string; photo_url: string | null }>
}

// ── Person–Gent relationships ───────────────────────────────────────────────

export async function fetchAllPersonGents(): Promise<Array<{ person_id: string; gent_id: string }>> {
  // person_gents not in generated Supabase types — use any cast
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('person_gents' as never).select('person_id, gent_id') as any)
  if (error) {
    console.error('[person_gents] fetch error:', error)
    return []
  }
  return (data ?? []) as Array<{ person_id: string; gent_id: string }>
}

export async function fetchPersonGents(personId: string): Promise<string[]> {
  const { data, error } = await (supabase
    .from('person_gents' as never)
    .select('gent_id')
    .eq('person_id', personId) as never as Promise<{ data: Array<{ gent_id: string }> | null; error: unknown }>)
  if (error) throw error
  return (data ?? []).map((r) => r.gent_id)
}

export async function updatePersonGents(personId: string, gentIds: string[]): Promise<void> {
  // Delete all existing, then re-insert
  const { error: delError } = await (supabase
    .from('person_gents' as never)
    .delete()
    .eq('person_id', personId) as never as Promise<{ error: unknown }>)
  if (delError) throw delError

  if (gentIds.length === 0) return
  const rows = gentIds.map((gent_id) => ({ person_id: personId, gent_id }))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insError } = await (supabase.from('person_gents' as never) as any).insert(rows)
  if (insError) throw insError
}
