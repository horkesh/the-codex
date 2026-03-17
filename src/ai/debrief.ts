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
    const { data, error } = await supabase.functions.invoke('generate-mission-debrief', {
      body: { entry, photoUrls },
    })
    if (error) throw error
    if (!data?.debrief) return null
    return {
      debrief: data.debrief,
      landmarks: data.landmarks ?? [],
      highlights: data.highlights ?? [],
      risk_assessment: data.risk_assessment ?? null,
    }
  } catch (err) {
    console.error('generate-mission-debrief failed:', err)
    return null
  }
}
