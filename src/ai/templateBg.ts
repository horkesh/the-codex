import { supabase } from '@/lib/supabase'
import type { Entry } from '@/types/app'

export async function generateTemplateBg(
  entry: Entry,
  aspect: '1:1' | '9:16' | '3:4' = '3:4',
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-template-bg', {
      body: {
        entry_type: entry.type,
        title: entry.title,
        location: entry.location,
        city: entry.city,
        country: entry.country,
        date: entry.date,
        time_of_day: (entry.metadata as Record<string, unknown>)?.time_of_day ?? undefined,
        aspect,
        cover_image_url: entry.cover_image_url ?? undefined,
      }
    })
    if (error) throw error
    if (data?._debug) {
      console.log('[template-bg debug]', data._debug)
    }
    if (data?.error) {
      console.error('generate-template-bg server error:', data.error, data.stack)
      return null
    }
    return data?.bg_url ?? null
  } catch (err) {
    console.error('generate-template-bg failed:', err)
    return null
  }
}
