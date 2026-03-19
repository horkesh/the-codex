import { supabase } from '@/lib/supabase'

export async function generatePortrait(gentId: string, photoBase64?: string): Promise<string | null> {
  try {
    const body: Record<string, string> = { gent_id: gentId }
    if (photoBase64) body.photo_base64 = photoBase64
    const { data, error } = await supabase.functions.invoke('generate-portrait', { body })
    if (error || data?.error) throw new Error(error?.message ?? data?.error)
    return data?.portrait_url ?? null
  } catch {
    return null
  }
}
