import { supabase } from '@/lib/supabase'
import type { InstagramAnalysis } from '@/types/app'

export async function analyzeInstagramUrl(url: string, mode: 'event' | 'profile'): Promise<InstagramAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-instagram', {
    body: { url, mode }
  })
  if (error) throw error
  return data as InstagramAnalysis
}

export async function analyzeInstagramScreenshot(base64: string): Promise<InstagramAnalysis> {
  const { data, error } = await supabase.functions.invoke('analyze-instagram', {
    body: { mode: 'screenshot', screenshot_base64: base64 }
  })
  if (error) throw error
  return data as InstagramAnalysis
}
