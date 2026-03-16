import { supabase } from '@/lib/supabase'
import type { EntryType } from '@/types/app'

/**
 * Generate a title from lore text (no photo needed).
 */
export async function generateTitleFromLore(
  lore: string,
  entryType: EntryType,
  context?: { location?: string; city?: string; country?: string; date?: string },
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-title', {
      body: {
        lore,
        entryType,
        location: context?.location,
        city: context?.city,
        country: context?.country,
        date: context?.date,
      },
    })
    if (error) throw error
    return data?.title || null
  } catch (err) {
    console.error('generate-title-from-lore failed:', err)
    return null
  }
}
