/**
 * Scene clustering engine — groups mission photos into scenes by temporal
 * proximity (45min gap) and GPS clustering (500m distance), then builds
 * route and tempo data structures.
 */

import type { EntryPhoto, Scene, TempoPoint, DayRoute } from '@/types/app'
import { logicalDay } from './dayBoundary'

// ─── Constants ───────────────────────────────────────────────────────────────

const SCENE_TIME_GAP_MS = 45 * 60 * 1000   // 45 minutes
const SCENE_GPS_GAP_M   = 500               // 500 metres
const TEMPO_WINDOW_MS   = 30 * 60 * 1000   // 30-minute intensity window

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Haversine distance in metres between two GPS coordinates */
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000 // Earth radius in metres
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** Parse an ISO EXIF timestamp into its components */
function parseExif(exifTakenAt: string | null): { date: string; time: string; ts: number } | null {
  if (!exifTakenAt) return null
  try {
    const d = new Date(exifTakenAt)
    if (isNaN(d.getTime())) return null
    const iso = d.toISOString()                    // always UTC
    const date = iso.split('T')[0]                 // YYYY-MM-DD
    const time = iso.split('T')[1].slice(0, 5)    // HH:MM
    return { date, time, ts: d.getTime() }
  } catch {
    return null
  }
}

/** Average GPS centroid of a set of lat/lng points */
function centroid(
  points: Array<{ lat: number; lng: number }>,
): { lat: number; lng: number } | null {
  if (points.length === 0) return null
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / points.length, lng: sum.lng / points.length }
}

/** Format a day label from a 1-based day number and YYYY-MM-DD string */
function formatDayLabelLocal(num: number, date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
  const dayMonth = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  return `Day ${num} — ${weekday}, ${dayMonth}`
}

// ─── Internal cluster type ────────────────────────────────────────────────────

interface RawCluster {
  photoIds: string[]
  gpsPoints: Array<{ lat: number; lng: number }>
  firstTs: number | null
  lastTs: number | null
  firstTime: string | null
  lastTime: string | null
  day: string       // logical YYYY-MM-DD
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Groups photos into scenes by temporal proximity (45min) and GPS (500m).
 *
 * Algorithm:
 * 1. Parse EXIF from all photos and sort by timestamp.
 * 2. Walk sorted list — open a new cluster when time gap > 45min OR GPS > 500m.
 * 3. Assign non-EXIF photos to the nearest cluster by sort_order.
 * 4. If no EXIF at all, emit one scene with all photos.
 * 5. Group clusters by logical day; emit Scene objects.
 */
export function clusterIntoScenes(
  photos: EntryPhoto[],
  startDate: string,
  _endDate?: string | null,
): Scene[] {
  if (photos.length === 0) return []

  // ── Step 1: Separate EXIF-bearing from non-EXIF photos ──────────────────
  type ExifPhoto = { photo: EntryPhoto; date: string; time: string; ts: number }
  const withExif: ExifPhoto[] = []
  const withoutExif: EntryPhoto[] = []

  for (const photo of photos) {
    const parsed = parseExif(photo.exif_taken_at)
    if (parsed) {
      withExif.push({ photo, ...parsed })
    } else {
      withoutExif.push(photo)
    }
  }

  // ── No EXIF at all — single scene with all photos ───────────────────────
  if (withExif.length === 0) {
    const scene: Scene = {
      id: 'scene-0-0',
      day: startDate,
      dayIndex: 0,
      sceneIndex: 0,
      title: null,
      startTime: null,
      endTime: null,
      centroid: null,
      photoIds: photos.map(p => p.id),
      heroPhotoId: photos[0]?.id ?? null,
      mood: null,
      narrative: null,
    }
    return [scene]
  }

  // ── Step 2: Sort EXIF photos by timestamp and cluster ───────────────────
  withExif.sort((a, b) => a.ts - b.ts)

  const clusters: RawCluster[] = []
  let current: RawCluster | null = null

  for (const ep of withExif) {
    const hasGps = ep.photo.gps_lat != null && ep.photo.gps_lng != null

    if (current === null) {
      // First photo — open initial cluster
      current = {
        photoIds: [ep.photo.id],
        gpsPoints: hasGps ? [{ lat: ep.photo.gps_lat!, lng: ep.photo.gps_lng! }] : [],
        firstTs: ep.ts,
        lastTs: ep.ts,
        firstTime: ep.time,
        lastTime: ep.time,
        day: logicalDay(ep.date, ep.time),
      }
      continue
    }

    // Check time gap
    const timeGap = ep.ts - (current.lastTs ?? ep.ts)
    let splitByTime = timeGap > SCENE_TIME_GAP_MS

    // Check GPS gap (only when both current centroid and this photo have GPS)
    let splitByGps = false
    if (!splitByTime && hasGps && current.gpsPoints.length > 0) {
      const c = centroid(current.gpsPoints)
      if (c) {
        const dist = haversineMeters(c.lat, c.lng, ep.photo.gps_lat!, ep.photo.gps_lng!)
        splitByGps = dist > SCENE_GPS_GAP_M
      }
    }

    if (splitByTime || splitByGps) {
      clusters.push(current)
      current = {
        photoIds: [ep.photo.id],
        gpsPoints: hasGps ? [{ lat: ep.photo.gps_lat!, lng: ep.photo.gps_lng! }] : [],
        firstTs: ep.ts,
        lastTs: ep.ts,
        firstTime: ep.time,
        lastTime: ep.time,
        day: logicalDay(ep.date, ep.time),
      }
    } else {
      current.photoIds.push(ep.photo.id)
      if (hasGps) current.gpsPoints.push({ lat: ep.photo.gps_lat!, lng: ep.photo.gps_lng! })
      current.lastTs = ep.ts
      current.lastTime = ep.time
    }
  }
  if (current) clusters.push(current)

  // ── Step 3: Assign non-EXIF photos to nearest cluster by sort_order ─────
  if (withoutExif.length > 0 && clusters.length > 0) {
    // Build sort_order index for all EXIF photos
    const exifOrders = withExif.map(ep => ({
      sortOrder: ep.photo.sort_order,
      clusterIndex: clusters.findIndex(c => c.photoIds.includes(ep.photo.id)),
    }))

    for (const photo of withoutExif) {
      // Find the cluster whose photos are closest in sort_order
      let bestCluster = 0
      let bestDist = Infinity
      for (const { sortOrder, clusterIndex } of exifOrders) {
        const d = Math.abs(photo.sort_order - sortOrder)
        if (d < bestDist) {
          bestDist = d
          bestCluster = clusterIndex
        }
      }
      clusters[bestCluster].photoIds.push(photo.id)
    }
  }

  // ── Step 4: Group clusters by logical day and emit Scene objects ─────────
  const dayOrder: string[] = []
  const dayMap = new Map<string, RawCluster[]>()

  for (const cluster of clusters) {
    if (!dayMap.has(cluster.day)) {
      dayOrder.push(cluster.day)
      dayMap.set(cluster.day, [])
    }
    dayMap.get(cluster.day)!.push(cluster)
  }

  // Sort days chronologically
  dayOrder.sort()

  const scenes: Scene[] = []

  for (let di = 0; di < dayOrder.length; di++) {
    const day = dayOrder[di]
    const dayClusters = dayMap.get(day)!

    for (let si = 0; si < dayClusters.length; si++) {
      const cl = dayClusters[si]
      const gpsC = centroid(cl.gpsPoints)
      const heroPhotoId = cl.photoIds[0] ?? null

      scenes.push({
        id: `scene-${di}-${si}`,
        day,
        dayIndex: di,
        sceneIndex: si,
        title: null,
        startTime: cl.firstTime,
        endTime: cl.lastTime,
        centroid: gpsC,
        photoIds: cl.photoIds,
        heroPhotoId,
        mood: null,
        narrative: null,
      })
    }
  }

  // Suppress unused-variable warning — formatDayLabelLocal is available for
  // callers who need it, and is used internally if we ever build chapter labels.
  void formatDayLabelLocal

  return scenes
}

/**
 * Build GPS route data from photos, grouped by logical day.
 * Only photos with GPS coordinates contribute route points.
 */
export function buildRoutes(photos: EntryPhoto[], scenes: Scene[]): DayRoute[] {
  if (scenes.length === 0) return []

  // Map photoId → scene day + time for ordering
  const photoMeta = new Map<string, { day: string; ts: number }>()
  for (const scene of scenes) {
    for (const photoId of scene.photoIds) {
      // Find the photo to get its GPS + EXIF
      const photo = photos.find(p => p.id === photoId)
      if (!photo) continue
      const parsed = parseExif(photo.exif_taken_at)
      photoMeta.set(photoId, {
        day: scene.day,
        ts: parsed?.ts ?? 0,
      })
    }
  }

  // Group GPS-bearing photos by day, sorted by ts
  const dayPoints = new Map<string, Array<{ lat: number; lng: number; time?: string; photoId?: string; ts: number }>>()

  for (const photo of photos) {
    if (photo.gps_lat == null || photo.gps_lng == null) continue
    const meta = photoMeta.get(photo.id)
    if (!meta) continue

    if (!dayPoints.has(meta.day)) dayPoints.set(meta.day, [])
    const parsed = parseExif(photo.exif_taken_at)
    dayPoints.get(meta.day)!.push({
      lat: photo.gps_lat,
      lng: photo.gps_lng,
      time: parsed?.time ?? undefined,
      photoId: photo.id,
      ts: meta.ts,
    })
  }

  // Sort each day's points and emit DayRoute
  const routes: DayRoute[] = []
  const sortedDays = Array.from(dayPoints.keys()).sort()

  for (const day of sortedDays) {
    const pts = dayPoints.get(day)!
    pts.sort((a, b) => a.ts - b.ts)
    routes.push({
      day,
      points: pts.map(({ lat, lng, time, photoId }) => ({ lat, lng, time, photoId })),
    })
  }

  return routes
}

/**
 * Build photo-frequency tempo data.
 * For each EXIF photo, counts how many other photos fall within a 30-minute
 * window centred on it, then normalises intensity to 0–1.
 */
export function buildTempo(photos: EntryPhoto[]): TempoPoint[] {
  // Collect all photos that have EXIF timestamps
  type TsPhoto = { id: string; ts: number; date: string; time: string; day: string }
  const tsPhotos: TsPhoto[] = []

  for (const photo of photos) {
    const parsed = parseExif(photo.exif_taken_at)
    if (!parsed) continue
    tsPhotos.push({
      id: photo.id,
      ts: parsed.ts,
      date: parsed.date,
      time: parsed.time,
      day: logicalDay(parsed.date, parsed.time),
    })
  }

  if (tsPhotos.length === 0) return []

  // For each photo, count nearby photos within the ±15min window
  const rawCounts = tsPhotos.map(p => {
    const half = TEMPO_WINDOW_MS / 2
    const nearby = tsPhotos.filter(
      other => other.id !== p.id && Math.abs(other.ts - p.ts) <= half,
    ).length
    return { ...p, count: nearby + 1 } // include self
  })

  // Normalise to 0–1
  const maxCount = Math.max(...rawCounts.map(r => r.count), 1)

  return rawCounts.map(r => ({
    time: r.time,
    intensity: r.count / maxCount,
    day: r.day,
  }))
}
