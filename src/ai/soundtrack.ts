import { supabase } from '@/lib/supabase'

export async function suggestSoundtrack(
  lore: string,
  title: string,
  city: string,
  country: string,
): Promise<string | null> {
  try {
    const { data } = await supabase.functions.invoke('suggest-soundtrack', {
      body: { lore, title, city, country },
    })
    return data?.suggestion ?? null
  } catch {
    return null
  }
}
