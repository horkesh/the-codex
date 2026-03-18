import { supabase } from '@/lib/supabase'
import type { Story, StoryMetadata } from '@/types/app'
import { groupIntoDays } from '@/lib/dayBoundary'

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

/** Auto-create a Story from a mission entry, with day episodes derived from photo EXIF timestamps */
export async function createMissionStory(entry: {
  id: string
  title: string
  date: string
  cover_image_url: string | null
  created_by: string
  metadata?: Record<string, unknown>
}): Promise<Story | null> {
  const dateEnd = entry.metadata?.date_end as string | undefined

  // Check existing + fetch photos in parallel (independent queries)
  const [{ data: existing }, { data: photos }] = await Promise.all([
    supabase.from('stories').select('id').contains('metadata', { mission_entry_id: entry.id }).limit(1),
    supabase.from('entry_photos').select('id, exif_taken_at, sort_order').eq('entry_id', entry.id).order('sort_order', { ascending: true }),
  ])
  if (existing && existing.length > 0) return null

  // Build day episodes from photos
  const photoData = (photos ?? []).map(p => {
    const raw = p as unknown as { id: string; exif_taken_at: string | null; sort_order: number }
    let exifDate: string | null = null
    let exifTime: string | null = null
    if (raw.exif_taken_at) {
      const d = new Date(raw.exif_taken_at)
      exifDate = d.toISOString().split('T')[0]
      exifTime = d.toISOString().split('T')[1]?.slice(0, 5) ?? null
    }
    return { id: raw.id, exifDate, exifTime }
  })

  const dayEpisodes = groupIntoDays(photoData, entry.date, dateEnd)

  // Determine subtitle from date range
  const startD = new Date(entry.date + 'T12:00:00Z')
  const subtitle = dateEnd
    ? `${startD.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })} – ${new Date(dateEnd + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}`
    : startD.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

  const metadata: StoryMetadata = {
    source: 'mission',
    mission_entry_id: entry.id,
    day_episodes: dayEpisodes,
  }

  const story = await createStory({
    title: entry.title,
    subtitle,
    cover_url: entry.cover_image_url,
    lore: null,
    stamp_url: null,
    created_by: entry.created_by,
    entry_ids: [entry.id],
    status: 'published',
    metadata,
  })

  return story
}
