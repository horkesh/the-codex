import { supabase } from '@/lib/supabase'

export async function generatePortrait(gentId: string, displayName: string, alias: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-portrait', {
      body: { gent_id: gentId, display_name: displayName, alias },
    })
    if (error) throw error
    return data?.portrait_url ?? null
  } catch {
    return null
  }
}
