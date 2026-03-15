import { supabase } from '@/lib/supabase'
import type { PersonVerdict } from '@/types/app'

export interface VerdictRequest {
  photo_base64: string
  mime_type?: string
}

export async function scanPersonVerdict(req: VerdictRequest): Promise<PersonVerdict> {
  const { data, error } = await supabase.functions.invoke('scan-person-verdict', {
    body: req,
  })

  if (error) throw new Error(`Service error: ${error.message}`)

  if (data?.eligible === false) throw new Error(data.rejection_reason ?? 'Image not eligible for analysis')
  if (data?.error) throw new Error(data.error)

  return data as PersonVerdict
}
