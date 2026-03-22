import { supabase } from '@/lib/supabase'
import type { Gent } from '@/types/app'

const GENT_COLUMNS = 'id, alias, display_name, full_alias, avatar_url, bio, portrait_url, status, status_expires_at, retired'

export async function fetchGentById(userId: string): Promise<Gent | null> {
  const { data, error } = await supabase
    .from('gents')
    .select(GENT_COLUMNS)
    .eq('id', userId)
    .single()
  if (error || !data) return null
  return data as Gent
}

export async function fetchAllGents(): Promise<Gent[]> {
  const { data, error } = await supabase
    .from('gents')
    .select(GENT_COLUMNS)
    .order('alias')
  if (error || !data) return []
  return data as Gent[]
}

export async function updateGent(id: string, updates: Partial<Omit<Gent, 'id' | 'alias'>>): Promise<Gent | null> {
  const { data, error } = await supabase
    .from('gents')
    .update(updates)
    .eq('id', id)
    .select(GENT_COLUMNS)
    .single()
  if (error) throw error
  return (data as Gent) ?? null
}

export async function updateGentStatus(id: string, status: string | null, expiresAt: string | null): Promise<void> {
  const { error } = await supabase
    .from('gents')
    .update({ status, status_expires_at: expiresAt })
    .eq('id', id)
  if (error) throw error
}

export async function fetchGentByAlias(alias: string): Promise<Gent | null> {
  const { data, error } = await supabase
    .from('gents')
    .select(GENT_COLUMNS)
    .eq('alias', alias)
    .single()
  if (error || !data) return null
  return data as Gent
}
