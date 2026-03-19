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

export async function fetchStampByEntryId(entryId: string): Promise<PassportStamp | null> {
  const { data, error } = await supabase
    .from('passport_stamps')
    .select('*')
    .eq('entry_id', entryId)
    .eq('type', 'mission')
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return data as PassportStamp | null
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

export async function deleteStampsByEntryId(entryId: string): Promise<void> {
  // Fetch stamps to clean up storage SVGs
  const { data: stamps } = await supabase
    .from('passport_stamps')
    .select('id, image_url')
    .eq('entry_id', entryId)

  if (stamps && stamps.length > 0) {
    // Remove SVG files from storage
    const paths = stamps
      .map(s => s.image_url)
      .filter(Boolean)
      .map(url => {
        const match = url!.match(/stamps\/(.+)$/)
        return match ? match[1] : null
      })
      .filter(Boolean) as string[]

    if (paths.length > 0) {
      await supabase.storage.from('stamps').remove(paths)
    }

    // Delete stamp rows (belt-and-suspenders with CASCADE)
    await supabase
      .from('passport_stamps')
      .delete()
      .eq('entry_id', entryId)
  }
}

export async function updateStampImage(stampId: string, imageUrl: string): Promise<void> {
  const { error } = await supabase
    .from('passport_stamps')
    .update({ image_url: imageUrl })
    .eq('id', stampId)

  if (error) throw error
}

/**
 * Backfill: create mission stamps for any mission entries that don't have one yet.
 * Returns the newly created stamps.
 */
export async function backfillMissionStamps(): Promise<PassportStamp[]> {
  // 1. Get all mission entry IDs that already have stamps
  const { data: existingStamps } = await supabase
    .from('passport_stamps')
    .select('entry_id')
    .eq('type', 'mission')
  const stampedEntryIds = new Set((existingStamps ?? []).map(s => s.entry_id))

  // 2. Get all published mission entries with city + country
  const { data: missions, error } = await supabase
    .from('entries')
    .select('id, title, date, city, country, country_code')
    .eq('type', 'mission')
    .eq('status', 'published')
    .not('city', 'is', null)
    .not('country', 'is', null)

  if (error || !missions) return []

  // 3. Filter to entries without stamps
  const missing = missions.filter(m => !stampedEntryIds.has(m.id))
  if (missing.length === 0) return []

  // 4. Insert all missing stamps
  const rows = missing.map(m => ({
    entry_id: m.id,
    type: 'mission' as const,
    name: `${m.city}, ${m.country}`,
    city: m.city,
    country: m.country,
    country_code: m.country_code,
    date_earned: m.date,
  }))

  const { data: newStamps, error: insertError } = await supabase
    .from('passport_stamps')
    .insert(rows)
    .select()

  if (insertError) {
    console.error('backfillMissionStamps insert error:', insertError)
    return []
  }
  return (newStamps ?? []) as PassportStamp[]
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
