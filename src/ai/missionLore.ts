import { supabase } from '@/lib/supabase'
import type { Scene, EntryWithParticipants, PhotoAnalysis, Entry } from '@/types/app'
import { formatDayLabel } from '@/lib/dayBoundary'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mission-narrative`

/**
 * Generate the full mission narrative from scene intelligence.
 * Calls the edge function with structured scene/day data + photo analyses.
 */
export async function generateMissionNarrative(
  entry: EntryWithParticipants,
  scenes: Scene[],
  photoAnalyses: Map<string, PhotoAnalysis>,
  photoUrls: string[],
  crossMissionContext: string | null,
  directorNotes: string | null,
  soundtrackMood?: string | null,
): Promise<{
  sceneNarratives: Record<string, string>
  dayChapters: { briefing: string | null; narrative: string | null; debrief: string | null }[]
  arc: string | null
  oneliner: string | null
  titles: string[]
  verdict: Record<string, string | null>
} | null> {
  // Build day structure from scenes
  const dayMap = new Map<number, Scene[]>()
  for (const scene of scenes) {
    if (!dayMap.has(scene.dayIndex)) dayMap.set(scene.dayIndex, [])
    dayMap.get(scene.dayIndex)!.push(scene)
  }

  const days = [...dayMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayIndex, dayScenes]) => {
      const allPhotos = dayScenes.flatMap(s => s.photoIds)

      return {
        label: formatDayLabel(dayIndex + 1, dayScenes[0].day),
        scenes: dayScenes.map(s => {
          const sceneAnalyses = s.photoIds
            .map(id => photoAnalyses.get(id))
            .filter(Boolean) as PhotoAnalysis[]

          return {
            id: s.id,
            title: s.title,
            startTime: s.startTime,
            endTime: s.endTime,
            mood: s.mood,
            photoDescriptions: sceneAnalyses.map(a => a.description),
            foodDrinks: [...new Set(sceneAnalyses.flatMap(a => a.food_drinks))],
            gentsPresent: [...new Set(sceneAnalyses.flatMap(a => a.gents_present))],
            ephemeraTexts: sceneAnalyses.flatMap(a => a.ephemera.map(e => e.text)),
            venueHint: s.title,
          }
        }),
        stats: {
          photoCount: allPhotos.length,
          sceneCount: dayScenes.length,
          venues: [...new Set(dayScenes.map(s => s.title).filter(Boolean) as string[])],
          earliestPhoto: dayScenes[0].startTime,
          latestPhoto: dayScenes[dayScenes.length - 1].endTime,
        },
      }
    })

  const participants = entry.participants?.map(p => p.display_name) ?? []
  const moodTags = (entry.metadata as Record<string, unknown>)?.mood_tags as string[] ?? []

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        title: entry.title,
        city: entry.city,
        country: entry.country,
        participants,
        days,
        crossMissionContext,
        weatherSummary: null,
        moodTags,
        directorNotes,
        soundtrackMood: soundtrackMood ?? null,
        photoUrls: photoUrls.slice(0, 8),
      }),
    })

    const json = await res.json()
    if (json.error) {
      console.error('Mission narrative error:', json.error)
      return null
    }

    return json
  } catch (err) {
    console.error('Mission narrative request failed:', err)
    return null
  }
}

/** Regenerate narrative for a single scene with optional director's note */
export async function regenerateSceneNarrative(
  entry: Entry,
  scene: Scene,
  photoUrls: Record<string, string>,
  analyses: Record<string, PhotoAnalysis>,
  directorNote?: string,
  crossContext?: string | null,
): Promise<string | null> {
  try {
    const { data } = await supabase.functions.invoke('generate-mission-narrative', {
      body: {
        entry: { city: entry.city, country: entry.country },
        mode: 'single_scene',
        scene,
        photoUrls,
        analyses,
        directorNote: directorNote ?? null,
        crossContext: crossContext ?? null,
      },
    })
    return data?.narrative ?? null
  } catch (err) {
    console.error('Scene narrative regeneration failed:', err)
    return null
  }
}
