import { supabase } from '@/lib/supabase'

export interface PersonPortraitRequest {
  appearance: string
  traits: string[]
  scan_id: string
}

export async function generatePersonPortrait(req: PersonPortraitRequest): Promise<{ portrait_url: string }> {
  const { data, error } = await supabase.functions.invoke('generate-person-portrait', {
    body: req,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as { portrait_url: string }
}
