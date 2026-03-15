import { supabase } from '@/lib/supabase'
import { imageToJpegBase64 } from '@/lib/image'
import type { EntryType } from '@/types/app'

/**
 * Analyse the first photo and generate a suggested entry title.
 * Compresses the image to 512px / 0.6 quality to keep the payload small.
 */
export async function generateTitle(
  file: File,
  entryType: EntryType,
  context?: { location?: string; city?: string; country?: string; date?: string },
): Promise<string | null> {
  try {
    console.debug('[title-gen] compressing photo…')
    const photo = await imageToJpegBase64(file, { maxPx: 512, quality: 0.6 })
    console.debug(`[title-gen] invoking edge function (type=${entryType}, base64=${photo.length} chars)`)
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
    console.debug('[title-gen] response:', data)
    return data?.title || null
  } catch (err) {
    console.error('generate-title failed:', err)
    return null
  }
}
