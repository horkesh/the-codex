import { supabase } from '@/lib/supabase'
import type { PersonAppearance } from '@/types/app'

const PA_COLUMNS = 'id, person_id, entry_id, noted_by, created_at'

export async function fetchAppearancesByEntry(entryId: string): Promise<PersonAppearance[]> {
  const { data, error } = await supabase
    .from('person_appearances')
    .select(PA_COLUMNS)
    .eq('entry_id', entryId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as PersonAppearance[]
}

export async function fetchAppearancesByPerson(personId: string): Promise<PersonAppearance[]> {
  const { data, error } = await supabase
    .from('person_appearances')
    .select(PA_COLUMNS)
    .eq('person_id', personId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as unknown as PersonAppearance[]
}

export async function fetchAllAppearances(): Promise<PersonAppearance[]> {
  const { data, error } = await supabase
    .from('person_appearances')
    .select(PA_COLUMNS)

  if (error) throw error
  return (data ?? []) as unknown as PersonAppearance[]
}

export async function addPersonToEntry(
  personId: string,
  entryId: string,
  notedBy: string
): Promise<PersonAppearance> {
  const { data, error } = await supabase
    .from('person_appearances')
    .upsert(
      { person_id: personId, entry_id: entryId, noted_by: notedBy },
      { onConflict: 'person_id,entry_id' }
    )
    .select(PA_COLUMNS)
    .single()

  if (error) throw error
  return data as unknown as PersonAppearance
}

export async function removePersonFromEntry(
  personId: string,
  entryId: string
): Promise<void> {
  const { error } = await supabase
    .from('person_appearances')
    .delete()
    .eq('person_id', personId)
    .eq('entry_id', entryId)

  if (error) throw error
}
