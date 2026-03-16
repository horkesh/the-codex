import { supabase } from '@/lib/supabase'
import type { EntryType } from '@/types/app'

export interface TimelinePhoto {
  id: string
  url: string
  entry_id: string
  entry_title: string
  entry_type: EntryType
  entry_date: string
  sort_order: number
}

export async function fetchAllPhotos(): Promise<TimelinePhoto[]> {
  const { data, error } = await supabase
    .from('entry_photos')
    .select('id, url, sort_order, entry_id, entries!inner(id, title, type, date, status)')
    .in('entries.status', ['published', 'gathering_post'])
    .order('sort_order', { ascending: true })

  if (error) throw error
  if (!data || data.length === 0) return []

  const photos: TimelinePhoto[] = []

  for (const row of data) {
    const r = row as unknown as {
      id: string
      url: string
      sort_order: number
      entry_id: string
      entries: { id: string; title: string; type: string; date: string; status: string }
    }

    photos.push({
      id: r.id,
      url: r.url,
      entry_id: r.entries.id,
      entry_title: r.entries.title,
      entry_type: r.entries.type as EntryType,
      entry_date: r.entries.date,
      sort_order: r.sort_order,
    })
  }

  // Sort by entry date DESC, then sort_order ASC within the same entry
  photos.sort((a, b) => {
    const dateCmp = b.entry_date.localeCompare(a.entry_date)
    if (dateCmp !== 0) return dateCmp
    return a.sort_order - b.sort_order
  })

  return photos
}
