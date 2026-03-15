import { supabase } from '@/lib/supabase'
import type { Prospect } from '@/types/app'

export async function fetchProspects(currentGentId?: string): Promise<Prospect[]> {
  // Auto-mark prospects whose event_date has passed
  const today = new Date().toISOString().split('T')[0]
  await supabase
    .from('prospects')
    .update({ status: 'passed' })
    .eq('status', 'prospect')
    .lt('event_date', today)
    .not('event_date', 'is', null)

  let query = supabase
    .from('prospects')
    .select('*')
    .order('event_date', { ascending: true, nullsFirst: false })

  if (currentGentId) {
    query = query.or(`created_by.eq.${currentGentId},visibility.eq.shared`)
  }

  const { data, error } = await query
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

export async function shareProspect(id: string): Promise<void> {
  const { error } = await supabase
    .from('prospects')
    .update({ visibility: 'shared' })
    .eq('id', id)
  if (error) throw error
}

export async function fetchProspectById(id: string): Promise<Prospect | null> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as Prospect
}
