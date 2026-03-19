import { supabase } from '@/lib/supabase'

const TOAST_APP_URL = import.meta.env.VITE_TOAST_APP_URL as string || 'http://localhost:5173'
const CHRONICLES_URL = import.meta.env.VITE_APP_URL as string || 'https://the-codex-sepia.vercel.app'

export async function launchToastSession(gentId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('generate-toast-token', {
    body: { gent_id: gentId },
  })

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Failed to generate token')
  }

  const callback = encodeURIComponent(`${CHRONICLES_URL}/chronicle/draft/`)
  const url = `${TOAST_APP_URL}/host?token=${data.token}&callback=${callback}`

  // Use location.href instead of window.open — mobile browsers block
  // popups triggered after async calls (the token fetch causes a delay)
  window.location.href = url
}
