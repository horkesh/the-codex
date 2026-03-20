import type {
  EntryPhoto, PhotoAnalysis, Scene, MissionIntel,
  DayChapter, DayStats, Ephemera,
} from '@/types/app'
import { formatDayLabel } from '@/lib/dayBoundary'
import { buildRoutes, buildTempo } from '@/lib/sceneEngine'

/**
 * Build the complete MissionIntel structure from scenes + photo analyses.
 * This is the "assembly" step — all AI work is already done.
 */
export function buildMissionIntel(
  photos: EntryPhoto[],
  scenes: Scene[],
  analyses: Map<string, PhotoAnalysis>,
): Omit<MissionIntel, 'tripArc' | 'verdict' | 'crossMissionRefs' | 'processed_at'> {
  // Group scenes by day
  const dayMap = new Map<number, Scene[]>()
  for (const s of scenes) {
    if (!dayMap.has(s.dayIndex)) dayMap.set(s.dayIndex, [])
    dayMap.get(s.dayIndex)!.push(s)
  }

  // Build routes from GPS data
  const routes = buildRoutes(photos, scenes)

  // Build tempo from photo timestamps
  const tempo = buildTempo(photos)

  // Aggregate ephemera from all photos
  const allEphemera: Ephemera[] = []
  for (const [, analysis] of analyses) {
    if (analysis.ephemera?.length) {
      allEphemera.push(...analysis.ephemera)
    }
  }

  // Identify highlights (quality_score >= 8)
  const highlights: string[] = []
  for (const [photoId, analysis] of analyses) {
    if (analysis.quality_score >= 8) {
      highlights.push(photoId)
    }
  }
  // Sort by quality descending, take top 7
  highlights.sort((a, b) => {
    const scoreA = analyses.get(a)?.quality_score ?? 0
    const scoreB = analyses.get(b)?.quality_score ?? 0
    return scoreB - scoreA
  })
  highlights.splice(7)

  // Build day chapters
  const days: DayChapter[] = [...dayMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([dayIndex, dayScenes]) => {
      const allPhotoIds = dayScenes.flatMap(s => s.photoIds)
      const dayAnalyses = allPhotoIds
        .map(id => analyses.get(id))
        .filter(Boolean) as PhotoAnalysis[]

      const stats: DayStats = {
        photoCount: allPhotoIds.length,
        sceneCount: dayScenes.length,
        venuesVisited: [...new Set(dayScenes.map(s => s.title).filter(Boolean) as string[])],
        foodDrinks: [...new Set(dayAnalyses.flatMap(a => a.food_drinks))],
        firstPhotoTime: dayScenes[0]?.startTime ?? null,
        lastPhotoTime: dayScenes[dayScenes.length - 1]?.endTime ?? null,
      }

      return {
        day: dayScenes[0].day,
        dayIndex,
        label: formatDayLabel(dayIndex + 1, dayScenes[0].day),
        briefing: null,
        debrief: null,
        narrative: null,
        sceneIds: dayScenes.map(s => s.id),
        photoIds: allPhotoIds,
        route: routes.find(r => r.day === dayScenes[0].day) ?? null,
        stats,
      }
    })

  return {
    version: 1,
    scenes,
    days,
    route: routes,
    highlights,
    ephemera: allEphemera,
    tempo,
  }
}

/**
 * Merge narrative results into the MissionIntel structure.
 */
export function mergeNarratives(
  intel: MissionIntel,
  narrativeResult: {
    sceneNarratives: Record<string, string>
    dayChapters: { briefing: string | null; narrative: string | null; debrief: string | null }[]
    arc: string | null
    oneliner: string | null
    verdict: Record<string, string | null>
  },
): MissionIntel {
  // Apply scene narratives
  const scenes = intel.scenes.map(s => ({
    ...s,
    narrative: narrativeResult.sceneNarratives[s.id] ?? s.narrative,
  }))

  // Apply day chapters
  const days = intel.days.map((d, i) => ({
    ...d,
    briefing: narrativeResult.dayChapters[i]?.briefing ?? d.briefing,
    narrative: narrativeResult.dayChapters[i]?.narrative ?? d.narrative,
    debrief: narrativeResult.dayChapters[i]?.debrief ?? d.debrief,
  }))

  return {
    ...intel,
    scenes,
    days,
    tripArc: narrativeResult.arc ?? intel.tripArc,
    verdict: {
      best_meal: narrativeResult.verdict.bestMeal ?? null,
      best_venue: narrativeResult.verdict.bestVenue ?? null,
      most_chaotic_moment: narrativeResult.verdict.chaos ?? null,
      mvp_scene: narrativeResult.verdict.mvpScene ?? null,
      would_return: narrativeResult.verdict.wouldReturn ?? null,
      trip_rating: null,
    },
    processed_at: new Date().toISOString(),
  }
}
