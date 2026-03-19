import { supabase } from '@/lib/supabase'

export async function generatePortrait(gentId: string, photoBase64?: string): Promise<{ urls: string[] | null; error?: string }> {
  try {
    const body: Record<string, string> = { gent_id: gentId }
    if (photoBase64) body.photo_base64 = photoBase64
    const { data, error } = await supabase.functions.invoke('generate-portrait', { body })
    if (error) return { urls: null, error: error.message }
    if (data?.error) return { urls: null, error: data.error }
    return { urls: data?.portrait_urls ?? null }
  } catch (err) {
    return { urls: null, error: (err as Error).message }
  }
}
