import { supabase } from '@/lib/supabase'
import type { EntryPhoto, PhotoAnalysis, Scene } from '@/types/app'
import { batchReverseGeocode } from '@/lib/geo'

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-mission-photos`

/**
 * Orchestrates the full photo intelligence pipeline:
 * 1. Batch reverse geocode GPS points for venue hints
 * 2. Send photos to Gemini for analysis (via edge function)
 * 3. Update entry_photos rows with ai_analysis
 * 4. Return analyses keyed by photo ID
 */
export async function analyzePhotos(
  photos: EntryPhoto[],
  entryType: string,
  city: string,
  country: string,
  onProgress?: (done: number, total: number) => void,
): Promise<Map<string, PhotoAnalysis>> {
  const results = new Map<string, PhotoAnalysis>()
  if (photos.length === 0) return results

  // Step 1: Batch reverse geocode for venue hints
  const gpsPoints = photos
    .filter(p => p.gps_lat && p.gps_lng)
    .map(p => ({ lat: p.gps_lat!, lng: p.gps_lng! }))

  const geoResults = await batchReverseGeocode(gpsPoints).catch(() => new Map())

  // Step 2: Prepare photo inputs with venue hints
  const photoInputs = photos.map(p => ({
    id: p.id,
    url: p.url,
    gps_lat: p.gps_lat,
    gps_lng: p.gps_lng,
    venue_hint: p.gps_lat && p.gps_lng
      ? geoResults.get(`${p.gps_lat.toFixed(6)},${p.gps_lng.toFixed(6)}`)?.venue ?? null
      : null,
  }))

  // Step 3: Call edge function in batches of 8
  const BATCH_SIZE = 8
  let done = 0

  for (let i = 0; i < photoInputs.length; i += BATCH_SIZE) {
    const batch = photoInputs.slice(i, i + BATCH_SIZE)

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
          photos: batch,
          entry_type: entryType,
          city,
          country,
        }),
      })

      const json = await res.json()
      if (json.analyses) {
        for (const [photoId, analysis] of Object.entries(json.analyses)) {
          results.set(photoId, analysis as PhotoAnalysis)
        }
      }
    } catch (err) {
      console.error('Photo analysis batch error:', err)
    }

    done += batch.length
    onProgress?.(done, photos.length)
  }

  // Step 4: Persist ai_analysis to entry_photos rows (fire-and-forget)
  for (const [photoId, analysis] of results) {
    void Promise.resolve(
      supabase
        .from('entry_photos')
        .update({ ai_analysis: analysis } as Record<string, unknown>)
        .eq('id', photoId)
    ).catch(() => {})
  }

  return results
}

/**
 * Enrich scenes with AI analysis data.
 * Sets scene titles from venue names, hero photos from quality scores, moods.
 */
export function enrichScenesWithAnalysis(
  scenes: Scene[],
  analyses: Map<string, PhotoAnalysis>,
): Scene[] {
  return scenes.map(scene => {
    const sceneAnalyses = scene.photoIds
      .map(id => analyses.get(id))
      .filter(Boolean) as PhotoAnalysis[]

    if (sceneAnalyses.length === 0) return scene

    // Scene title: most common venue name, or scene type fallback
    const venueNames = sceneAnalyses.map(a => a.venue_name).filter(Boolean) as string[]
    const title = venueNames.length > 0
      ? mostCommon(venueNames)
      : formatSceneType(sceneAnalyses[0].scene_type)

    // Hero photo: highest quality score
    let heroId: string | null = null
    let bestScore = 0
    for (const photoId of scene.photoIds) {
      const a = analyses.get(photoId)
      if (a && a.quality_score > bestScore) {
        bestScore = a.quality_score
        heroId = photoId
      }
    }

    // Mood: most common mood across scene photos
    const moods = sceneAnalyses.map(a => a.mood)
    const mood = mostCommon(moods)

    return { ...scene, title, heroPhotoId: heroId, mood }
  })
}

function mostCommon<T>(arr: T[]): T {
  const counts = new Map<T, number>()
  for (const item of arr) counts.set(item, (counts.get(item) ?? 0) + 1)
  let best = arr[0]
  let bestCount = 0
  for (const [item, count] of counts) {
    if (count > bestCount) { best = item; bestCount = count }
  }
  return best
}

function formatSceneType(type: string): string {
  const labels: Record<string, string> = {
    restaurant: 'Dining',
    bar: 'Drinks',
    street: 'Street Scene',
    landmark: 'Landmark',
    transport: 'In Transit',
    hotel: 'The Base',
    market: 'Market',
    nature: 'Outdoors',
    interior: 'Interior',
    group_shot: 'The Crew',
    food: 'The Spread',
    selfie: 'Self-Portrait',
    other: 'Scene',
  }
  return labels[type] ?? 'Scene'
}
