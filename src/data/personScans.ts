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
 * Uploads a source photo for a scan and returns the public URL.
 * Failure is non-fatal — caller should handle null gracefully.
 */
export async function uploadPersonScanPhoto(
  gentId: string,
  file: File,
): Promise<string | null> {
  const tempId = crypto.randomUUID()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${gentId}/${tempId}/source.${ext}`
  const { error } = await supabase.storage
    .from('person-scans')
    .upload(path, file, { contentType: file.type, upsert: false })
  if (error) return null
  return supabase.storage.from('person-scans').getPublicUrl(path).data.publicUrl
}
