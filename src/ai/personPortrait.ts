import { supabase } from '@/lib/supabase'

export type PortraitStyle = 'noir' | 'chiaroscuro' | 'gilded'

export const PORTRAIT_STYLES: { id: PortraitStyle; label: string; description: string }[] = [
  { id: 'noir', label: 'Noir', description: 'Geometric noir, cinematic shadows' },
  { id: 'chiaroscuro', label: 'Chiaroscuro', description: 'Caravaggio lighting, oil-painting warmth' },
  { id: 'gilded', label: 'Gilded', description: 'Art-deco gold, gatsby opulence' },
]

export interface PersonPortraitRequest {
  appearance: string
  traits: string[]
  scan_id: string
  director_note?: string
  style?: PortraitStyle
  photo_base64?: string
  fresh_analysis?: boolean
}

export interface PersonPortraitResult {
  portrait_url: string
  updated_appearance?: string | null
}

export async function generatePersonPortrait(req: PersonPortraitRequest): Promise<PersonPortraitResult> {
  const { data, error } = await supabase.functions.invoke('generate-person-portrait', {
    body: req,
  })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data as PersonPortraitResult
}
