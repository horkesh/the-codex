import { supabase } from '@/lib/supabase'
import type { EntryWithParticipants } from '@/types/app'

export async function generateLore(entry: EntryWithParticipants, photoUrls?: string[]): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-lore', {
      body: { entry, photoUrls },
    })
    if (error) throw error
    return data?.lore ?? null
  } catch (err) {
    console.error('generate-lore failed:', err)
    return null
  }
}
