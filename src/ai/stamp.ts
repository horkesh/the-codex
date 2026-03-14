import { supabase } from '@/lib/supabase'
import type { PassportStamp } from '@/types/app'

export async function generateStamp(stamp: PassportStamp): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-stamp', {
      body: { stamp }
    })
    if (error) throw error
    return data?.stamp_url ?? null
  } catch (err) {
    console.error('generate-stamp failed:', err)
    return null
  }
}
