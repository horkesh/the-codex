import { supabase } from '@/lib/supabase'
import type { Entry, Gent } from '@/types/app'

export async function generateScene(
  entry: Entry,
  participants: Gent[]
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('generate-scene', {
    body: {
      entry_type: entry.type,
      title: entry.title,
      location: entry.location,
      city: entry.city,
      country: entry.country,
      participants: participants.map(g => ({ display_name: g.display_name })),
    }
  })
  if (error) return null
  return data?.scene_url ?? null
}
