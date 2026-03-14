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

  if (error) {
    // Try to extract the rejection message from the error body
    try {
      const body = await (error as unknown as { context: Response }).context?.json?.()
      if (body?.error) throw new Error(body.error)
    } catch (inner) {
      if (inner instanceof Error && inner.message !== error.message) throw inner
    }
    throw error
  }

  if (data?.error) throw new Error(data.error)
  if (data?.eligible === false) throw new Error(data.rejection_reason ?? 'Image not eligible for analysis')

  return data as PersonVerdict
}
