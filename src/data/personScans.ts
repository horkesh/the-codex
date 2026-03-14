import { supabase } from '@/lib/supabase'
import type { PersonScan } from '@/types/app'
import type { Json } from '@/types/database'

export async function createPersonScanDraft(
  data: Omit<PersonScan, 'id' | 'created_at' | 'updated_at' | 'status' | 'person_id'>
): Promise<PersonScan> {
  const { data: row, error } = await supabase
    .from('person_scans')
    .insert({ ...data, status: 'draft', review_payload: data.review_payload as Json })
    .select()
    .single()
  if (error) throw error
  return row as unknown as PersonScan
}

export async function updatePersonScan(
  id: string,
  updates: Partial<PersonScan>
): Promise<void> {
  const { error } = await supabase
    .from('person_scans')
    .update({ ...updates, review_payload: updates.review_payload as Json | undefined, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function confirmPersonScan(
  scanId: string,
  personId: string
): Promise<void> {
  const { error } = await supabase
    .from('person_scans')
    .update({ person_id: personId, status: 'confirmed', updated_at: new Date().toISOString() })
    .eq('id', scanId)
  if (error) throw error
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
