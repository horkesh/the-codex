import { supabase } from '@/lib/supabase'
import type { EntryWithParticipants } from '@/types/app'

export interface LoreResult {
  lore: string
  oneliner: string | null
  suggested_title: string | null
}

export async function generateLore(entry: EntryWithParticipants, photoUrls?: string[]): Promise<string | null> {
  const result = await generateLoreFull(entry, photoUrls)
  return result?.lore ?? null
}

export async function generateLoreFull(entry: EntryWithParticipants, photoUrls?: string[]): Promise<LoreResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-lore', {
      body: { entry, photoUrls },
    })
    if (error) throw error
    if (!data?.lore) return null
    return {
      lore: data.lore,
      oneliner: data.oneliner ?? null,
      suggested_title: data.suggested_title ?? null,
    }
  } catch (err) {
    console.error('generate-lore failed:', err)
    return null
  }
}
