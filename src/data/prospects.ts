import { supabase } from '@/lib/supabase'
import type { Prospect } from '@/types/app'

export async function fetchProspects(): Promise<Prospect[]> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Prospect[]
}

export async function createProspect(fields: Omit<Prospect, 'id' | 'created_at'>): Promise<Prospect> {
  const { data, error } = await supabase
    .from('prospects')
    .insert(fields)
    .select()
    .single()
  if (error) throw error
  return data as unknown as Prospect
}

export async function updateProspect(id: string, fields: Partial<Prospect>): Promise<void> {
  const { error } = await supabase.from('prospects').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteProspect(id: string): Promise<void> {
  const { error } = await supabase.from('prospects').delete().eq('id', id)
  if (error) throw error
}
