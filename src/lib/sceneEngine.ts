import type { EntryPhoto, Scene, TempoPoint, DayRoute } from '@/types/app'
import { logicalDay } from './dayBoundary'

/** Maximum time gap (minutes) between photos in the same scene */
const SCENE_TIME_GAP = 45

/** Maximum distance (meters) between photos in the same scene */
const SCENE_DISTANCE_THRESHOLD = 500

/** Haversine distance between two GPS points in meters */
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Parse EXIF timestamp into { date, time, ts } */
function parseExif(exifTakenAt: string | null): { date: string; time: string; ts: number } | null {
  if (!exifTakenAt) return null
  const d = new Date(exifTakenAt)
  if (isNaN(d.getTime())) return null
  const date = d.toISOString().slice(0, 10)
  const time = d.toISOString().slice(11, 16)
  return { date, time, ts: d.getTime() }
}

/** Compute centroid of GPS points */
function centroid(points: { lat: number; lng: number }[]): { lat: number; lng: number } | null {
  const valid = points.filter(p => p.lat && p.lng)
  if (valid.length === 0) return null
  return {
    lat: valid.reduce((s, p) => s + p.lat, 0) / valid.length,
    lng: valid.reduce((s, p) => s + p.lng, 0) / valid.length,
  }
}

/**
 * Group photos into scenes based on temporal proximity + GPS clustering.
 * Photos without EXIF are assigned to the nearest scene by sort_order.
 */
export function clusterIntoScenes(
  photos: EntryPhoto[],
  startDate: string,
  _endDate?: string | null,
): Scene[] {
  // Separate photos with and without EXIF timestamps
  type PhotoWithExif = EntryPhoto & { parsed: NonNullable<ReturnType<typeof parseExif>> }
  const withExif: PhotoWithExif[] = []
  const withoutExif: EntryPhoto[] = []

  for (const p of photos) {
    const parsed = parseExif(p.exif_taken_at)
    if (parsed) {
      withExif.push({ ...p, parsed })
    } else {
      withoutExif.push(p)
    }
  }

  // Sort EXIF photos by timestamp
  withExif.sort((a, b) => a.parsed.ts - b.parsed.ts)

  // Cluster by time gap + GPS distance
  const clusters: PhotoWithExif[][] = []
  let current: PhotoWithExif[] = []

  for (const photo of withExif) {
    if (current.length === 0) {
      current.push(photo)
      continue
    }

    const prev = current[current.length - 1]
    const timeDiff = (photo.parsed.ts - prev.parsed.ts) / 60000 // minutes

    let gpsFar = false
    if (photo.gps_lat && photo.gps_lng && prev.gps_lat && prev.gps_lng) {
      const dist = haversineMeters(prev.gps_lat, prev.gps_lng, photo.gps_lat, photo.gps_lng)
      gpsFar = dist > SCENE_DISTANCE_THRESHOLD
    }

    if (timeDiff > SCENE_TIME_GAP || gpsFar) {
      clusters.push(current)
      current = [photo]
    } else {
      current.push(photo)
    }
  }
  if (current.length > 0) clusters.push(current)

  // Assign non-EXIF photos to the cluster nearest by sort_order
  for (const orphan of withoutExif) {
    let bestCluster = 0
    let bestDist = Infinity
    for (let i = 0; i < clusters.length; i++) {
      for (const p of clusters[i]) {
        const dist = Math.abs(p.sort_order - orphan.sort_order)
        if (dist < bestDist) {
          bestDist = dist
          bestCluster = i
        }
      }
    }
    if (clusters.length > 0) {
      clusters[bestCluster].push({ ...orphan, parsed: clusters[bestCluster][0].parsed })
    }
  }

  // If no clusters at all (no EXIF), create one scene with all photos
  if (clusters.length === 0 && photos.length > 0) {
    return [{
      id: 'scene-0-0',
      day: startDate,
      dayIndex: 0,
      sceneIndex: 0,
      title: null,
      startTime: null,
      endTime: null,
      centroid: centroid(
        photos.filter(p => p.gps_lat && p.gps_lng).map(p => ({ lat: p.gps_lat!, lng: p.gps_lng! }))
      ),
      photoIds: photos.map(p => p.id),
      heroPhotoId: null,
      mood: null,
      narrative: null,
    }]
  }

  // Build Scene objects from clusters, grouped by logical day
  const scenes: Scene[] = []
  const dayMap = new Map<string, PhotoWithExif[][]>()

  for (const cluster of clusters) {
    const firstPhoto = cluster[0]
    const day = logicalDay(firstPhoto.parsed.date, firstPhoto.parsed.time)
    if (!dayMap.has(day)) dayMap.set(day, [])
    dayMap.get(day)!.push(cluster)
  }

  const sortedDays = [...dayMap.keys()].sort()

  for (let dayIdx = 0; dayIdx < sortedDays.length; dayIdx++) {
    const day = sortedDays[dayIdx]
    const dayClusters = dayMap.get(day)!
    for (let sceneIdx = 0; sceneIdx < dayClusters.length; sceneIdx++) {
      const cluster = dayClusters[sceneIdx]
      const gpsPoints = cluster
        .filter(p => p.gps_lat && p.gps_lng)
        .map(p => ({ lat: p.gps_lat!, lng: p.gps_lng! }))

      scenes.push({
        id: `scene-${dayIdx}-${sceneIdx}`,
        day,
        dayIndex: dayIdx,
        sceneIndex: sceneIdx,
        title: null,
        startTime: cluster[0].parsed.time,
        endTime: cluster[cluster.length - 1].parsed.time,
        centroid: centroid(gpsPoints),
        photoIds: cluster.map(p => p.id),
        heroPhotoId: null,
        mood: null,
        narrative: null,
      })
    }
  }

  return scenes
}

/**
 * Build route data from photos with GPS coordinates, grouped by day.
 */
export function buildRoutes(photos: EntryPhoto[], scenes: Scene[]): DayRoute[] {
  const dayMap = new Map<string, DayRoute>()

  for (const scene of scenes) {
    if (!dayMap.has(scene.day)) {
      dayMap.set(scene.day, { day: scene.day, points: [] })
    }
    const route = dayMap.get(scene.day)!

    for (const photoId of scene.photoIds) {
      const photo = photos.find(p => p.id === photoId)
      if (photo?.gps_lat && photo?.gps_lng) {
        const parsed = parseExif(photo.exif_taken_at)
        route.points.push({
          lat: photo.gps_lat,
          lng: photo.gps_lng,
          time: parsed?.time,
          label: scene.title,
          photoId: photo.id,
        })
      }
    }
  }

  return [...dayMap.values()].sort((a, b) => a.day.localeCompare(b.day))
}

/**
 * Generate tempo data points from photo timestamps.
 * Intensity = photo frequency in a sliding 30-minute window, normalized.
 */
export function buildTempo(photos: EntryPhoto[]): TempoPoint[] {
  const withTime = photos
    .map(p => {
      const parsed = parseExif(p.exif_taken_at)
      return parsed ? { ts: parsed.ts, day: logicalDay(parsed.date, parsed.time), iso: p.exif_taken_at! } : null
    })
    .filter(Boolean) as { ts: number; day: string; iso: string }[]

  if (withTime.length < 2) return []

  withTime.sort((a, b) => a.ts - b.ts)

  const WINDOW = 30 * 60 * 1000 // 30 minutes
  const points: TempoPoint[] = []

  for (const p of withTime) {
    const nearby = withTime.filter(q => Math.abs(q.ts - p.ts) <= WINDOW).length
    points.push({ time: p.iso, intensity: nearby, day: p.day })
  }

  // Normalize intensity to 0-1
  const max = Math.max(...points.map(p => p.intensity), 1)
  for (const p of points) {
    p.intensity = p.intensity / max
  }

  return points
}
