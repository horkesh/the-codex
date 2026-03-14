import { supabase } from '@/lib/supabase'
import type { PassportStamp } from '@/types/app'

export async function fetchStamps(): Promise<PassportStamp[]> {
  const { data, error } = await supabase
    .from('passport_stamps')
    .select('*')
    .order('date_earned', { ascending: false })

  if (error) throw error
  return (data ?? []) as PassportStamp[]
}

export async function fetchStamp(id: string): Promise<PassportStamp | null> {
  const { data, error } = await supabase
    .from('passport_stamps')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as PassportStamp
}

export async function createMissionStamp(entry: {
  id: string
  title: string
  city: string
  country: string
  country_code: string
  date: string
}): Promise<PassportStamp> {
  const { data, error } = await supabase
    .from('passport_stamps')
    .insert({
      entry_id: entry.id,
      type: 'mission',
      name: `${entry.city}, ${entry.country}`,
      city: entry.city,
      country: entry.country,
      country_code: entry.country_code,
      date_earned: entry.date,
    })
    .select()
    .single()

  if (error) throw error
  return data as PassportStamp
}

export async function createAchievementStamp(data: {
  name: string
  description: string
  date_earned: string
}): Promise<PassportStamp> {
  const { data: stamp, error } = await supabase
    .from('passport_stamps')
    .insert({
      type: 'achievement',
      name: data.name,
      description: data.description,
      date_earned: data.date_earned,
      entry_id: null,
      city: null,
      country: null,
      country_code: null,
    })
    .select()
    .single()

  if (error) throw error
  return stamp as PassportStamp
}

export async function updateStampImage(stampId: string, imageUrl: string): Promise<void> {
  const { error } = await supabase
    .from('passport_stamps')
    .update({ image_url: imageUrl })
    .eq('id', stampId)

  if (error) throw error
}

export async function fetchStampsByType(
  type: 'mission' | 'achievement' | 'diplomatic'
): Promise<PassportStamp[]> {
  const { data, error } = await supabase
    .from('passport_stamps')
    .select('*')
    .eq('type', type)
    .order('date_earned', { ascending: false })

  if (error) throw error
  return (data ?? []) as PassportStamp[]
}
