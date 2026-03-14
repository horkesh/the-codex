import { supabase } from '@/lib/supabase'
import type { GentStats } from '@/types/app'

export async function generateWrapped(year: number, stats: GentStats[]): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-wrapped', {
      body: { year, stats },
    })
    if (error) throw error
    return data?.narrative ?? null
  } catch {
    return null
  }
}
