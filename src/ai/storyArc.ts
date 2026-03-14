import { supabase } from '@/lib/supabase'
import type { Entry } from '@/types/app'

export async function generateStoryArc(
  storyTitle: string,
  entries: Entry[],
  gentNames: string[]
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('generate-story-arc', {
    body: {
      story_title: storyTitle,
      entries: entries.map(e => ({
        title: e.title,
        date: e.date,
        type: e.type,
        lore: e.lore,
        location: e.location,
        city: e.city,
        country: e.country,
      })),
      gent_names: gentNames,
    }
  })
  if (error) return null
  return data?.lore ?? null
}

export async function generateThrowback(
  entryTitle: string,
  entryLore: string | null,
  entryDate: string,
  entryType: string,
  yearsAgo: number,
  location: string | null
): Promise<string | null> {
  const { data, error } = await supabase.functions.invoke('generate-throwback', {
    body: { entry_title: entryTitle, entry_lore: entryLore, entry_date: entryDate, entry_type: entryType, years_ago: yearsAgo, location }
  })
  if (error) return null
  return data?.lore ?? null
}
