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
    // Send only the fields the edge function needs — avoids serialization issues with large entry objects
    const { data, error } = await supabase.functions.invoke('generate-mission-debrief', {
      body: {
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
      },
    })
    if (error) {
      console.error('generate-mission-debrief invoke error:', error)
      throw error
    }
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
