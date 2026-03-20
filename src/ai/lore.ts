import { supabase } from '@/lib/supabase'
import type { EntryWithParticipants } from '@/types/app'

export interface LoreResult {
  lore: string
  oneliner: string | null
  suggested_title: string | null
  /** Per-day lore for multi-day missions (same order as dayLabels) */
  day_lore?: string[]
  /** Per-day one-liners for carousel export (same order as dayLabels) */
  day_oneliners?: string[]
}

export async function generateLore(entry: EntryWithParticipants, photoUrls?: string[]): Promise<string | null> {
  const result = await generateLoreFull(entry, photoUrls)
  return result?.lore ?? null
}

export async function generateLoreFull(
  entry: EntryWithParticipants,
  photoUrls?: string[],
  dayLabels?: string[],
): Promise<LoreResult | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-lore', {
      body: { entry, photoUrls, dayLabels },
    })
    if (error) throw error
    if (data?.error) {
      console.error('generate-lore edge error:', data.error)
      return null
    }
    if (!data?.lore) return null
    return {
      lore: data.lore,
      oneliner: data.oneliner ?? null,
      suggested_title: data.suggested_title ?? null,
      day_lore: Array.isArray(data.day_lore) ? data.day_lore : undefined,
      day_oneliners: Array.isArray(data.day_oneliners) ? data.day_oneliners : undefined,
    }
  } catch (err) {
    console.error('generate-lore failed:', err)
    return null
  }
}
