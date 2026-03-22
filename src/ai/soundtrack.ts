import { supabase } from '@/lib/supabase'

export async function suggestSoundtrack(
  lore: string,
  title: string,
  city: string,
  country: string,
): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('suggest-soundtrack', {
      body: { lore, title, city, country },
    })
    if (error) throw error
    return data?.suggestion ?? null
  } catch (err) {
    console.error('suggest-soundtrack failed:', err)
    return null
  }
}
