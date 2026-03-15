import { supabase } from '@/lib/supabase'
import type { PersonVerdict } from '@/types/app'

export interface VerdictRequest {
  photo_base64: string
  mime_type?: string
  source_type?: string
}

export async function scanPersonVerdict(req: VerdictRequest): Promise<PersonVerdict> {
  const { data, error } = await supabase.functions.invoke('scan-person-verdict', {
    body: req,
  })

  if (error) {
    // Extract the actual response body for a meaningful error message
    const body = error.context instanceof Response
      ? await error.context.text().catch(() => '')
      : ''
    const detail = body ? `: ${body.slice(0, 200)}` : ''
    throw new Error(`Scan failed (${error.name})${detail}`)
  }

  if (data?.eligible === false) throw new Error(data.rejection_reason ?? 'Image not eligible for analysis')
  if (data?.error) throw new Error(data.error)

  return data as PersonVerdict
}
