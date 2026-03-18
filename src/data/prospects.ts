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

export async function fetchDueProspects(): Promise<Prospect[]> {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0]

  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('status', 'prospect')
    .gte('event_date', sevenDaysAgo)
    .lte('event_date', todayStr)
    .order('event_date', { ascending: false })

  if (error) throw error
  return (data ?? []) as unknown as Prospect[]
}

export async function fetchProspectById(id: string): Promise<Prospect | null> {
  const { data, error } = await supabase
    .from('prospects')
    .select('*')
    .eq('id', id)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as unknown as Prospect
}
