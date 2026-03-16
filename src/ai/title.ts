import { supabase } from '@/lib/supabase'
import { imageToJpegBase64 } from '@/lib/image'
import type { EntryType } from '@/types/app'

interface TitleContext {
  location?: string
  city?: string
  country?: string
  date?: string
}

/**
 * Analyse the first photo and generate a suggested entry title.
 * Compresses the image to 512px / 0.6 quality to keep the payload small.
 */
export async function generateTitle(
  file: File,
  entryType: EntryType,
  context?: TitleContext,
): Promise<string | null> {
  try {
    const photo = await imageToJpegBase64(file, { maxPx: 512, quality: 0.6 })
    const { data, error } = await supabase.functions.invoke('generate-title', {
      body: {
        photo,
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
    console.error('generate-title failed:', err)
    return null
  }
}

/**
 * Generate multiple title suggestions from lore text.
 * Returns an array of title options.
 */
export async function generateTitleSuggestions(
  lore: string,
  entryType: EntryType,
  context?: TitleContext,
): Promise<string[]> {
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
    return data?.titles ?? (data?.title ? [data.title] : [])
  } catch (err) {
    console.error('generate-title-suggestions failed:', err)
    return []
  }
}
