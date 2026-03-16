import { supabase } from '@/lib/supabase'
import { imageToJpegBase64 } from '@/lib/image'
import type { EntryType } from '@/types/app'

interface TitleContext {
  location?: string
  city?: string
  country?: string
  date?: string
}

/** Shared invocation — sends either photo or lore to the generate-title edge function. */
async function invokeGenerateTitle(
  entryType: EntryType,
  source: { photo?: string; lore?: string },
  context?: TitleContext,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-title', {
      body: {
        ...source,
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
 * Analyse the first photo and generate a suggested entry title.
 * Compresses the image to 512px / 0.6 quality to keep the payload small.
 */
export async function generateTitle(
  file: File,
  entryType: EntryType,
  context?: TitleContext,
): Promise<string | null> {
  const photo = await imageToJpegBase64(file, { maxPx: 512, quality: 0.6 })
  return invokeGenerateTitle(entryType, { photo }, context)
}

/**
 * Generate a title from lore text (no photo needed).
 */
export async function generateTitleFromLore(
  lore: string,
  entryType: EntryType,
  context?: TitleContext,
): Promise<string | null> {
  return invokeGenerateTitle(entryType, { lore }, context)
}
