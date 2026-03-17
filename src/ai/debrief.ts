import { supabase } from '@/lib/supabase'
import type { EntryWithParticipants } from '@/types/app'

export interface MissionDebrief {
  debrief: string
  landmarks: string[]
  highlights: string[]
  risk_assessment: string | null
}

export async function generateMissionDebrief(
  entry: EntryWithParticipants,
  photoUrls: string[],
): Promise<MissionDebrief | null> {
  try {
    // Get the current session token for auth
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
      console.error('generate-mission-debrief: no auth session')
      return null
    }

    const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string).trim()
    const body = JSON.stringify({
      entry: {
        title: entry.title,
        date: entry.date,
        city: entry.city,
        country: entry.country,
        location: entry.location,
        lore: entry.lore,
        description: entry.description,
        participants: entry.participants?.map(p => ({ display_name: p.display_name })) ?? [],
      },
      photoUrls,
    })

    const response = await fetch(`${supabaseUrl}/functions/v1/generate-mission-debrief`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'apikey': (import.meta.env.VITE_SUPABASE_ANON_KEY as string).trim(),
      },
      body,
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`generate-mission-debrief HTTP ${response.status}:`, errText)
      return null
    }

    const data = await response.json()
    if (data?.error) {
      console.error('generate-mission-debrief edge function error:', data.error)
      return null
    }
    if (!data?.debrief) {
      console.error('generate-mission-debrief: no debrief in response', data)
      return null
    }
    return data as MissionDebrief
  } catch (err) {
    console.error('generate-mission-debrief failed:', err)
    return null
  }
}
