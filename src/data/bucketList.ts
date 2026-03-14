import { supabase } from '@/lib/supabase'
import type { BucketListItem } from '@/types/app'

export async function fetchBucketList(): Promise<BucketListItem[]> {
  const { data, error } = await supabase
    .from('bucket_list')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as BucketListItem[]
}

export async function createBucketItem(fields: Omit<BucketListItem, 'id' | 'created_at'>): Promise<BucketListItem> {
  const { data, error } = await supabase
    .from('bucket_list')
    .insert(fields)
    .select()
    .single()
  if (error) throw error
  return data as unknown as BucketListItem
}

export async function updateBucketItem(id: string, fields: Partial<BucketListItem>): Promise<void> {
  const { error } = await supabase.from('bucket_list').update(fields).eq('id', id)
  if (error) throw error
}

export async function deleteBucketItem(id: string): Promise<void> {
  const { error } = await supabase.from('bucket_list').delete().eq('id', id)
  if (error) throw error
}

// Check if any open bucket items match an entry's city/title
export async function findMatchingBucketItems(city: string | null, title: string): Promise<BucketListItem[]> {
  if (!city && !title) return []
  const { data, error } = await supabase
    .from('bucket_list')
    .select('*')
    .eq('status', 'open')
    .or(city ? `city.ilike.%${city}%,title.ilike.%${title.slice(0, 20)}%` : `title.ilike.%${title.slice(0, 20)}%`)
  if (error) return []
  return (data ?? []) as unknown as BucketListItem[]
}
