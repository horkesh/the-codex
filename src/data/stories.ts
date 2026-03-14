import { supabase } from '@/lib/supabase'
import type { Story } from '@/types/app'

export async function fetchStories(): Promise<Story[]> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as Story[]
}

export async function fetchStory(id: string): Promise<Story | null> {
  const { data, error } = await supabase
    .from('stories')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data as unknown as Story
}

export async function createStory(fields: Omit<Story, 'id' | 'created_at' | 'updated_at'>): Promise<Story> {
  const { data, error } = await supabase
    .from('stories')
    .insert(fields)
    .select()
    .single()
  if (error) throw error
  return data as unknown as Story
}

export async function updateStory(id: string, fields: Partial<Story>): Promise<void> {
  const { error } = await supabase
    .from('stories')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteStory(id: string): Promise<void> {
  const { error } = await supabase.from('stories').delete().eq('id', id)
  if (error) throw error
}
