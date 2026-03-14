import { supabase } from '@/lib/supabase'
import type { Entry } from '@/types/app'

export async function generateCover(entry: Entry): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-cover', {
      body: { entry }
    })
    if (error) throw error
    return data?.cover_url ?? null
  } catch (err) {
    console.error('generate-cover failed:', err)
    return null
  }
}
