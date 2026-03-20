# Mission Intelligence Overhaul — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform mission entries from "upload photos, get one paragraph" into a full AI-reconstructed trip dossier — with scene-level intelligence, per-day narratives, route maps, video analysis, cross-mission memory, ephemera detection, and a rich vertical-scroll UI replacing the broken horizontal carousel.

**Architecture:** The mission pipeline becomes a multi-stage intelligence engine. On photo upload, client-side extracts EXIF metadata (GPS, timestamps) and groups photos into "scenes" by temporal/spatial proximity. A new `analyze-mission-photos` edge function sends batches to Gemini Flash vision for per-photo intelligence (venue identification, food/drink detection, Gent presence, signage/ephemera OCR, mood). Results are stored in `entry.metadata.mission_intel` as structured JSON. A redesigned `generate-lore` produces per-scene narratives, per-day chapters, and an overall trip arc. The UI replaces the broken horizontal carousel with a vertical scrolling dossier: visa card → day chapters (each with route map, scene cards, photos, narrative) → intelligence report → verdict. The Story entity merges into the mission entry metadata — no more separate table for auto-created mission stories.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Framer Motion, Google Maps JS API (routes/polylines), Supabase (Postgres + Edge Functions + Storage), Gemini 2.5 Flash (vision analysis), Claude Sonnet 4.6 (narrative generation), Claude Haiku 4.5 (title/stamp), `exifr` (EXIF parsing), HTML Canvas (video keyframe extraction)

---

## File Structure

### New Files

| File | Responsibility |
|------|---------------|
| **Client — Scene Engine** | |
| `src/lib/sceneEngine.ts` | Groups photos into scenes by timestamp proximity + GPS clustering. Pure logic, no API calls. |
| `src/lib/videoKeyframes.ts` | Extracts keyframes from video files using HTML Canvas + Video element. Returns frame blobs + timestamps. |
| `src/lib/routeBuilder.ts` | Builds Google Maps polyline data from photo GPS coordinates. Groups by day, returns LatLng arrays. |
| **Client — AI Invocation** | |
| `src/ai/missionIntel.ts` | Client-side wrapper for `analyze-mission-photos` edge function. Batches photos, handles progress. |
| `src/ai/missionLore.ts` | Client-side wrapper for the new multi-stage lore pipeline. Orchestrates scene→day→trip narrative calls. |
| **Edge Functions** | |
| `supabase/functions/analyze-mission-photos/index.ts` | Gemini Flash vision: per-photo analysis (venue, food, people, ephemera, mood, GPS reverse-geocode). Returns structured JSON per photo. |
| `supabase/functions/generate-mission-narrative/index.ts` | Claude Sonnet: multi-stage narrative — per-scene (with photo intel), per-day (chapter summaries), overall trip arc, one-liner. Replaces mission path of `generate-lore` for multi-day missions. |
| **Client — UI Components** | |
| `src/components/mission/MissionDossier.tsx` | Top-level mission detail layout. Vertical scroll, orchestrates all sections. Replaces `MissionLayout` for the new experience. |
| `src/components/mission/DossierVisaCard.tsx` | Extracted visa card component (currently inline in MissionLayout). Cleaned up, standalone. |
| `src/components/mission/DayChapter.tsx` | Single day's content: route map, scene cards, photos, day narrative, morning briefing / evening debrief. |
| `src/components/mission/SceneCard.tsx` | Individual scene: hero photo, scene title, time, location pin, narrative, expandable photo strip. |
| `src/components/mission/RouteMap.tsx` | Google Maps component showing day route with gold polyline + scene pins. Dark styled. |
| `src/components/mission/TripTempoGraph.tsx` | SVG waveform showing photo frequency over time. Visual energy arc of the trip. |
| `src/components/mission/MissionVerdict.tsx` | End-of-trip verdict card: best meal, best bar, most chaotic moment, MVP scene, "would return?" |
| `src/components/mission/EphemeraGallery.tsx` | Extracted text artifacts: menus, signs, tickets, receipts. Displayed as cream paper cards. |
| `src/components/mission/DayStickyNav.tsx` | Sticky horizontal pill bar for day navigation (Day 1 / Day 2 / Day 3 / Intel / Verdict). |
| `src/components/mission/HighlightReel.tsx` | AI-curated top 5-7 photos with captions explaining why each was selected. |
| `src/components/mission/GentPresenceBar.tsx` | Horizontal presence indicator showing which Gents appear in each scene. |
| `src/components/mission/MissionProcessingOverlay.tsx` | Full-screen overlay during post-upload AI analysis. Progress steps with status indicators. |
| **Database** | |
| `supabase/migrations/2026XXXX_mission_intel_columns.sql` | Adds `gps_lat`, `gps_lng`, `ai_analysis` (JSONB) columns to `entry_photos`. Adds `mission_intel` to entries metadata convention doc. |

### Modified Files

| File | Changes |
|------|---------|
| `src/pages/EntryNew.tsx` | New post-upload pipeline: EXIF extraction → scene clustering → photo intelligence → narrative generation. Progress overlay. Video file handling. |
| `src/pages/EntryDetail.tsx` | Route to `MissionDossier` instead of old `MissionLayout`. Updated lore regeneration flow. |
| `src/components/chronicle/PhotoUpload.tsx` | Accept video files (`video/*`). Extract keyframes client-side. GPS extraction from all photos (not just first). |
| `src/data/entries.ts` | `uploadEntryPhoto` stores GPS coords + AI analysis. New `uploadEntryVideo` function. `fetchCityVisits` returns richer data for cross-mission memory. |
| `src/data/stories.ts` | `createMissionStory` deprecated — mission intel moves to entry metadata. Keep for manual story arcs only. |
| `src/lib/dayBoundary.ts` | Extended to group into scenes (not just days). New `groupIntoScenes()` export. |
| `src/lib/geo.ts` | New `batchReverseGeocode()` for multiple GPS points. `buildRoutePolyline()` helper. |
| `src/types/app.ts` | New types: `MissionIntel`, `PhotoAnalysis`, `Scene`, `DayChapter`, `MissionVerdict`, `Ephemera`. |
| `supabase/functions/generate-lore/index.ts` | For non-mission types: unchanged. For missions: delegates to `generate-mission-narrative` or uses legacy path as fallback. |
| `supabase/functions/_shared/gent-identities.ts` | No changes needed — already has GENT_VISUAL_ID for vision prompts. |
| `supabase/config.toml` | Add `analyze-mission-photos` and `generate-mission-narrative` with `verify_jwt = false`. |

---

## Chunk 1: Photo Intelligence Foundation

**Scope:** EXIF extraction from all photos (not just first), GPS storage in DB, scene clustering algorithm, video keyframe extraction.

### Task 1.1: Extend `entry_photos` Table with GPS + AI Analysis

**Files:**
- Create: `supabase/migrations/20260320000001_photo_intelligence.sql`
- Modify: `src/data/entries.ts:233-282` (uploadEntryPhoto function)

- [ ] **Step 1: Write the migration**

```sql
-- Add GPS coordinates and AI analysis to entry_photos
ALTER TABLE entry_photos ADD COLUMN IF NOT EXISTS gps_lat double precision;
ALTER TABLE entry_photos ADD COLUMN IF NOT EXISTS gps_lng double precision;
ALTER TABLE entry_photos ADD COLUMN IF NOT EXISTS ai_analysis jsonb DEFAULT NULL;

-- Index for GPS queries (finding nearby photos)
CREATE INDEX IF NOT EXISTS idx_entry_photos_gps
  ON entry_photos (gps_lat, gps_lng)
  WHERE gps_lat IS NOT NULL;

-- Index for finding photos by entry with EXIF data
CREATE INDEX IF NOT EXISTS idx_entry_photos_entry_exif
  ON entry_photos (entry_id, exif_taken_at)
  WHERE exif_taken_at IS NOT NULL;
```

- [ ] **Step 2: Update `uploadEntryPhoto` to store GPS**

In `src/data/entries.ts`, modify the `uploadEntryPhoto` function to extract and store GPS coordinates alongside the existing EXIF date extraction:

```typescript
// In uploadEntryPhoto, after the existing exifr.parse call:
// Currently extracts: DateTimeOriginal
// Change to also extract: latitude, longitude

const exifData = await exifr.default.parse(file, [
  'DateTimeOriginal', 'latitude', 'longitude'
]).catch(() => null)

// In the insert call, add:
gps_lat: exifData?.latitude ?? null,
gps_lng: exifData?.longitude ?? null,
```

The full modified insert should look like:
```typescript
const { error: metaErr } = await supabase
  .from('entry_photos')
  .insert({
    entry_id: entryId,
    url: publicUrl,
    sort_order: sortOrder,
    caption: null,
    taken_by: null,
    exif_taken_at: exifDate ?? null,
    gps_lat: exifData?.latitude ?? null,
    gps_lng: exifData?.longitude ?? null,
  })
```

- [ ] **Step 3: Update TypeScript types**

In `src/types/app.ts`, extend the `EntryPhoto` interface:

```typescript
export interface EntryPhoto {
  id: string
  entry_id: string
  url: string
  caption: string | null
  taken_by: string | null
  sort_order: number
  exif_taken_at: string | null
  gps_lat: number | null
  gps_lng: number | null
  ai_analysis: PhotoAnalysis | null
  created_at: string
}

/** Per-photo AI analysis from Gemini Flash vision */
export interface PhotoAnalysis {
  scene_type: 'restaurant' | 'bar' | 'street' | 'landmark' | 'transport' | 'hotel' | 'market' | 'nature' | 'interior' | 'group_shot' | 'food' | 'selfie' | 'other'
  venue_name: string | null          // Extracted from signage, menus, or GPS reverse geocode
  description: string                 // One-sentence description of what's in the photo
  gents_present: string[]            // Names of identified Gents: ['haris', 'vedad', 'almedin']
  food_drinks: string[]              // Detected items: ['wagyu tataki', 'gin & tonic', 'espresso']
  ephemera: Ephemera[]               // Detected text artifacts
  mood: 'energetic' | 'relaxed' | 'chaotic' | 'intimate' | 'adventurous' | 'festive' | 'contemplative'
  time_of_day_visual: 'morning' | 'afternoon' | 'golden_hour' | 'evening' | 'night'  // Inferred from lighting
  quality_score: number              // 1-10, for highlight reel selection
  highlight_reason: string | null    // Why this photo is notable (null if not a highlight)
}

/** Text artifact detected in a photo */
export interface Ephemera {
  type: 'menu' | 'sign' | 'ticket' | 'receipt' | 'boarding_pass' | 'label' | 'other'
  text: string                       // Extracted text content
  context: string                    // What it tells us ("Menu at Dojo shows wagyu at ¥3200")
}
```

- [ ] **Step 4: Update `fetchEntryPhotos` to include new columns**

In `src/data/entries.ts`, update the select query:

```typescript
export async function fetchEntryPhotos(entryId: string): Promise<EntryPhoto[]> {
  const { data, error } = await supabase
    .from('entry_photos')
    .select('id, entry_id, url, caption, taken_by, sort_order, exif_taken_at, gps_lat, gps_lng, ai_analysis, created_at')
    .eq('entry_id', entryId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return (data ?? []) as EntryPhoto[]
}
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260320000001_photo_intelligence.sql src/data/entries.ts src/types/app.ts
git commit -m "feat(mission): add GPS + AI analysis columns to entry_photos"
```

---

### Task 1.2: Scene Clustering Engine

**Files:**
- Create: `src/lib/sceneEngine.ts`
- Modify: `src/types/app.ts` (add Scene type)

- [ ] **Step 1: Define Scene type**

In `src/types/app.ts`:

```typescript
/** A cluster of photos from the same place/time during a mission */
export interface Scene {
  id: string                         // Generated: `scene-{dayIndex}-{sceneIndex}`
  day: string                        // YYYY-MM-DD (logical day)
  dayIndex: number                   // 0-based day number
  sceneIndex: number                 // 0-based scene within day
  title: string | null               // Auto-generated or from AI: "Dinner at Fige Udvar"
  startTime: string | null           // HH:MM of first photo
  endTime: string | null             // HH:MM of last photo
  centroid: { lat: number; lng: number } | null  // Average GPS of scene photos
  photoIds: string[]                 // Ordered photo IDs in this scene
  heroPhotoId: string | null         // AI-selected best photo (set later by analysis)
  mood: string | null                // Set by AI analysis
  narrative: string | null           // Set by lore generation
}

/** Full mission intelligence stored in entry.metadata.mission_intel */
export interface MissionIntel {
  version: number                    // Schema version for future migration
  scenes: Scene[]
  days: DayChapter[]
  route: DayRoute[]
  highlights: string[]               // Photo IDs of hero shots
  ephemera: Ephemera[]               // Aggregated from all photos
  tripArc: string | null             // Overall narrative
  verdict: MissionVerdict | null
  crossMissionRefs: CrossMissionRef[]
  tempo: TempoPoint[]                // For tempo graph
  processed_at: string               // ISO timestamp
}

/** Per-day chapter summary */
export interface DayChapter {
  day: string                        // YYYY-MM-DD
  dayIndex: number
  label: string                      // "Day 1 — Thursday, 11 December"
  briefing: string | null            // Morning mood-setter
  debrief: string | null             // Evening summary
  narrative: string | null           // Full day narrative
  sceneIds: string[]                 // Scene IDs in this day
  photoIds: string[]                 // All photo IDs in this day
  route: DayRoute | null
  stats: DayStats
}

export interface DayRoute {
  day: string
  points: { lat: number; lng: number; time: string | null; label: string | null }[]
}

export interface DayStats {
  photoCount: number
  sceneCount: number
  venuesVisited: string[]
  foodDrinks: string[]
  gentsPresent: string[]
  earliestPhoto: string | null       // HH:MM
  latestPhoto: string | null         // HH:MM
}

export interface MissionVerdict {
  bestMeal: { name: string; scene: string } | null
  bestVenue: { name: string; scene: string } | null
  mostChaoticMoment: string | null
  mvpScene: { id: string; reason: string } | null
  wouldReturn: { answer: boolean; reason: string }
  tripStats: {
    totalVenues: number
    totalFoodDrinks: number
    kmWalked: number | null          // Estimated from GPS points
    earliestPhoto: string            // HH:MM
    latestPhoto: string              // HH:MM
    photosPerDay: number[]
  }
}

export interface CrossMissionRef {
  entryId: string
  title: string
  date: string
  city: string
  sharedVenues: string[]             // Venues visited in both missions
  callback: string                   // Narrative callback: "Last time at 360 Bar..."
}

export interface TempoPoint {
  time: string                       // ISO timestamp
  intensity: number                  // 0-1, derived from photo frequency in surrounding window
  day: string
}
```

- [ ] **Step 2: Implement scene clustering**

Create `src/lib/sceneEngine.ts`:

```typescript
import type { EntryPhoto, Scene, TempoPoint, DayRoute } from '@/types/app'
import { logicalDay, formatDayLabel } from './dayBoundary'

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

/** Parse EXIF timestamp into { date, time, timestamp } */
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
  endDate?: string | null,
): Scene[] {
  // Separate photos with and without EXIF timestamps
  const withExif: (EntryPhoto & { parsed: NonNullable<ReturnType<typeof parseExif>> })[] = []
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
  const clusters: (typeof withExif)[] = []
  let current: typeof withExif = []

  for (const photo of withExif) {
    if (current.length === 0) {
      current.push(photo)
      continue
    }

    const prev = current[current.length - 1]
    const timeDiff = (photo.parsed.ts - prev.parsed.ts) / 60000  // minutes

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
      centroid: centroid(photos.filter(p => p.gps_lat && p.gps_lng).map(p => ({ lat: p.gps_lat!, lng: p.gps_lng! }))),
      photoIds: photos.map(p => p.id),
      heroPhotoId: null,
      mood: null,
      narrative: null,
    }]
  }

  // Build Scene objects from clusters
  const scenes: Scene[] = []
  // Group clusters by logical day
  const dayMap = new Map<string, typeof clusters>()

  for (const cluster of clusters) {
    const firstPhoto = cluster[0]
    const day = logicalDay(firstPhoto.parsed.date, firstPhoto.parsed.time)
    if (!dayMap.has(day)) dayMap.set(day, [])
    dayMap.get(day)!.push(cluster)
  }

  // Sort days chronologically
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
        title: null,           // Set later by AI analysis
        startTime: cluster[0].parsed.time,
        endTime: cluster[cluster.length - 1].parsed.time,
        centroid: centroid(gpsPoints),
        photoIds: cluster.map(p => p.id),
        heroPhotoId: null,     // Set later by AI analysis
        mood: null,            // Set later by AI analysis
        narrative: null,       // Set later by lore generation
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

  // Collect GPS points from photos, ordered by scene/time
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
          time: parsed?.time ?? null,
          label: scene.title,
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

  const WINDOW = 30 * 60 * 1000  // 30 minutes
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/sceneEngine.ts src/types/app.ts
git commit -m "feat(mission): scene clustering engine with GPS + temporal grouping"
```

---

### Task 1.3: Video Keyframe Extraction

**Files:**
- Create: `src/lib/videoKeyframes.ts`
- Modify: `src/components/chronicle/PhotoUpload.tsx` (accept video files)

- [ ] **Step 1: Implement keyframe extractor**

Create `src/lib/videoKeyframes.ts`:

```typescript
/**
 * Extract keyframes from a video file using HTML Canvas.
 * Returns an array of { blob, timestamp } for each extracted frame.
 *
 * Strategy: Extract 1 frame every `intervalSeconds` (default 3s).
 * Cap at `maxFrames` (default 10) to avoid overwhelming the AI pipeline.
 */
export async function extractKeyframes(
  videoFile: File,
  options: { intervalSeconds?: number; maxFrames?: number; maxWidth?: number } = {}
): Promise<{ blob: Blob; timestampSeconds: number }[]> {
  const { intervalSeconds = 3, maxFrames = 10, maxWidth = 1024 } = options

  const url = URL.createObjectURL(videoFile)
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'auto'

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      const duration = video.duration
      if (!duration || !isFinite(duration)) {
        URL.revokeObjectURL(url)
        resolve([])
        return
      }

      // Calculate frame times
      const totalFrames = Math.min(
        Math.floor(duration / intervalSeconds),
        maxFrames
      )
      const times: number[] = []
      for (let i = 0; i < totalFrames; i++) {
        times.push(i * intervalSeconds + intervalSeconds / 2)  // Center of each interval
      }

      // Set up canvas
      const scale = Math.min(1, maxWidth / video.videoWidth)
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      const frames: { blob: Blob; timestampSeconds: number }[] = []

      for (const time of times) {
        try {
          await seekTo(video, time)
          ctx.drawImage(video, 0, 0, w, h)
          const blob = await new Promise<Blob>((res, rej) => {
            canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/webp', 0.75)
          })
          frames.push({ blob, timestampSeconds: time })
        } catch {
          // Skip frames that fail to seek/capture
        }
      }

      URL.revokeObjectURL(url)
      resolve(frames)
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video'))
    }

    video.src = url
  })
}

/** Seek video to specific time and wait for frame to be ready */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Seek timeout')), 5000)
    video.onseeked = () => {
      clearTimeout(timeout)
      resolve()
    }
    video.currentTime = time
  })
}

/**
 * Get video metadata without extracting frames.
 * Returns duration, dimensions, and estimated EXIF date (from file modified date).
 */
export function getVideoMeta(file: File): { durationEstimate: number | null; date: string | null } {
  // File.lastModified gives us approximate capture time
  const date = file.lastModified
    ? new Date(file.lastModified).toISOString().slice(0, 10)
    : null
  return { durationEstimate: null, date }
}

/**
 * Check if a file is a video based on MIME type.
 */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}
```

- [ ] **Step 2: Update PhotoUpload to accept videos**

In `src/components/chronicle/PhotoUpload.tsx`, modify the file input accept attribute and add video handling:

```typescript
// Change the accept attribute on the file input (around line 50):
// From:
accept="image/*"
// To:
accept="image/*,video/*"

// In the addFiles handler, separate videos from photos:
async function processFiles(files: File[]) {
  const imageFiles: File[] = []
  const videoFiles: File[] = []

  for (const file of files) {
    if (isVideoFile(file)) {
      videoFiles.push(file)
    } else {
      imageFiles.push(file)
    }
  }

  // Process images as before
  addFiles(imageFiles)

  // Extract keyframes from each video
  for (const video of videoFiles) {
    const frames = await extractKeyframes(video, { maxFrames: 5, maxWidth: 1024 })
    // Convert frame blobs to File objects with video timestamp metadata
    const frameFiles = frames.map((f, i) => {
      const name = `${video.name}-frame-${i}.webp`
      return new File([f.blob], name, { type: 'image/webp' })
    })
    addFiles(frameFiles)

    // Also store original video reference for audio analysis later
    // (stored in entry.metadata.videos)
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/videoKeyframes.ts src/components/chronicle/PhotoUpload.tsx
git commit -m "feat(mission): video keyframe extraction + accept video uploads"
```

---

### Task 1.4: Batch GPS Reverse Geocoding

**Files:**
- Modify: `src/lib/geo.ts` (add batch reverse geocode)

- [ ] **Step 1: Add batch reverse geocode function**

In `src/lib/geo.ts`, add:

```typescript
/**
 * Reverse geocode multiple GPS points in batch.
 * Uses Google Geocoding API with deduplication (skip points within 50m of already-resolved).
 * Returns a Map from "lat,lng" key to resolved location info.
 */
export async function batchReverseGeocode(
  points: { lat: number; lng: number }[]
): Promise<Map<string, { city: string; country: string; country_code: string; venue: string | null }>> {
  const results = new Map<string, { city: string; country: string; country_code: string; venue: string | null }>()
  if (points.length === 0) return results

  // Deduplicate: cluster points within 50m and only geocode cluster centroids
  const DEDUP_METERS = 50
  const clusters: { lat: number; lng: number; keys: string[] }[] = []

  for (const point of points) {
    const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`
    let found = false
    for (const cluster of clusters) {
      const dist = haversineMeters(point.lat, point.lng, cluster.lat, cluster.lng)
      if (dist < DEDUP_METERS) {
        cluster.keys.push(key)
        found = true
        break
      }
    }
    if (!found) {
      clusters.push({ lat: point.lat, lng: point.lng, keys: [key] })
    }
  }

  // Geocode each unique cluster (rate-limited to avoid API quota)
  for (const cluster of clusters) {
    try {
      const geo = await fetchDetailedReverseGoogle(cluster.lat, cluster.lng)
      const poi = await fetchNearestPOIGoogle(cluster.lat, cluster.lng).catch(() => null)
      const result = {
        city: geo?.city ?? 'Unknown',
        country: geo?.country ?? 'Unknown',
        country_code: geo?.country_code ?? '',
        venue: poi?.name ?? null,
      }
      for (const key of cluster.keys) {
        results.set(key, result)
      }
    } catch {
      // Non-critical — skip failed geocodes
    }
  }

  return results
}

/** Haversine distance in meters (duplicated from sceneEngine for geo module independence) */
function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/geo.ts
git commit -m "feat(mission): batch GPS reverse geocoding with deduplication"
```

---

## Chunk 2: AI Photo Analysis Pipeline

**Scope:** New `analyze-mission-photos` edge function that sends photos to Gemini Flash for per-photo intelligence. Client-side orchestrator that batches requests and updates `entry_photos.ai_analysis`.

### Task 2.1: Create `analyze-mission-photos` Edge Function

**Files:**
- Create: `supabase/functions/analyze-mission-photos/index.ts`
- Modify: `supabase/config.toml` (add verify_jwt = false)

- [ ] **Step 1: Write the edge function**

Create `supabase/functions/analyze-mission-photos/index.ts`:

```typescript
import "https://deno.land/x/xhr@0.3.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GENT_VISUAL_ID } from "../_shared/gent-identities.ts"

const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") ?? ""

interface PhotoInput {
  id: string
  url: string
  gps_lat?: number | null
  gps_lng?: number | null
  venue_hint?: string | null  // From GPS reverse geocode
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { photos, entry_type, city, country } = await req.json() as {
      photos: PhotoInput[]
      entry_type: string
      city: string
      country: string
    }

    if (!photos?.length) {
      return new Response(JSON.stringify({ error: "No photos provided" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Process photos in batches of 4 (Gemini handles multiple images well)
    const BATCH_SIZE = 4
    const results: Record<string, unknown> = {}

    for (let i = 0; i < photos.length; i += BATCH_SIZE) {
      const batch = photos.slice(i, i + BATCH_SIZE)
      const batchResults = await analyzeBatch(batch, entry_type, city, country)
      Object.assign(results, batchResults)
    }

    return new Response(JSON.stringify({ analyses: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

async function analyzeBatch(
  photos: PhotoInput[],
  entryType: string,
  city: string,
  country: string,
): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    // Build multimodal content: images + analysis prompt
    const parts: unknown[] = []

    for (const photo of photos) {
      // Fetch image and convert to base64
      const imgRes = await fetch(photo.url, { signal: controller.signal })
      if (!imgRes.ok) continue
      const imgBuf = await imgRes.arrayBuffer()
      const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuf)))
      const mimeType = imgRes.headers.get("content-type") || "image/webp"

      parts.push({
        inlineData: { mimeType, data: base64 },
      })
      parts.push({
        text: `[Photo ID: ${photo.id}]${photo.venue_hint ? ` [Nearby: ${photo.venue_hint}]` : ""}${photo.gps_lat ? ` [GPS: ${photo.gps_lat},${photo.gps_lng}]` : ""}`,
      })
    }

    parts.push({
      text: `You are analyzing photos from a trip to ${city}, ${country} (entry type: ${entryType}).

${GENT_VISUAL_ID}

For EACH photo (identified by its [Photo ID]), return a JSON object with these fields:
- scene_type: one of "restaurant", "bar", "street", "landmark", "transport", "hotel", "market", "nature", "interior", "group_shot", "food", "selfie", "other"
- venue_name: name of venue/place if visible from signage, menus, or context (null if unknown). Use the [Nearby] hint if it matches what you see.
- description: one sentence describing what's happening in the photo
- gents_present: array of first names of identified Gents (from the visual guide above). Empty array if none visible.
- food_drinks: array of specific items visible (e.g. "wagyu tataki", "gin & tonic", "Turkish coffee"). Empty array if none.
- ephemera: array of objects {type, text, context} for any readable text in the photo — menus, signs, tickets, receipts, boarding passes, labels. type is one of "menu", "sign", "ticket", "receipt", "boarding_pass", "label", "other".
- mood: one of "energetic", "relaxed", "chaotic", "intimate", "adventurous", "festive", "contemplative"
- time_of_day_visual: one of "morning", "afternoon", "golden_hour", "evening", "night" — inferred from lighting/ambiance
- quality_score: 1-10 rating of photographic quality and narrative interest
- highlight_reason: if quality_score >= 8, explain why this is a standout photo (null otherwise)

Return ONLY a JSON object where keys are Photo IDs and values are the analysis objects. No markdown, no explanation.`,
    })

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_KEY}`

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("Gemini error:", err)
      return {}
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    // Extract JSON from response (may be wrapped in ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return {}

    const parsed = JSON.parse(jsonMatch[0])
    return parsed
  } catch (err) {
    console.error("Batch analysis error:", err)
    return {}
  } finally {
    clearTimeout(timeout)
  }
}
```

- [ ] **Step 2: Add to config.toml**

In `supabase/config.toml`, add:

```toml
[functions.analyze-mission-photos]
verify_jwt = false

[functions.generate-mission-narrative]
verify_jwt = false
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/analyze-mission-photos/index.ts supabase/config.toml
git commit -m "feat(mission): analyze-mission-photos edge function — Gemini vision per-photo intelligence"
```

---

### Task 2.2: Client-Side Photo Intelligence Orchestrator

**Files:**
- Create: `src/ai/missionIntel.ts`

- [ ] **Step 1: Implement the orchestrator**

Create `src/ai/missionIntel.ts`:

```typescript
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

  // Step 3: Call edge function in batches of 8 (4 per Gemini call × 2 batches per request)
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
    supabase
      .from('entry_photos')
      .update({ ai_analysis: analysis })
      .eq('id', photoId)
      .then(() => {})
      .catch(() => {})
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
    const venueNames = sceneAnalyses.map(a => a.venue_name).filter(Boolean)
    const title = venueNames.length > 0
      ? mostCommon(venueNames as string[])
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
```

- [ ] **Step 2: Commit**

```bash
git add src/ai/missionIntel.ts
git commit -m "feat(mission): client-side photo intelligence orchestrator"
```

---

### Task 2.3: Mission Narrative Generation Edge Function

**Files:**
- Create: `supabase/functions/generate-mission-narrative/index.ts`

- [ ] **Step 1: Write the narrative generation function**

This edge function receives the full mission intel (scenes, day structure, photo analyses) and generates:
1. Per-scene narratives (1-2 sentences each)
2. Per-day chapter narratives (briefing + narrative + debrief)
3. Overall trip arc (3-4 paragraphs)
4. One-liner
5. Title suggestions
6. Verdict

Create `supabase/functions/generate-mission-narrative/index.ts`:

```typescript
import "https://deno.land/x/xhr@0.3.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { GENT_VISUAL_ID, GENT_ALIASES } from "../_shared/gent-identities.ts"

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SceneInput {
  id: string
  title: string | null
  startTime: string | null
  endTime: string | null
  mood: string | null
  photoDescriptions: string[]       // From ai_analysis.description
  foodDrinks: string[]              // Aggregated from all photos
  gentsPresent: string[]            // Union of all photos
  ephemeraTexts: string[]           // Aggregated readable text
  venueHint: string | null
}

interface DayInput {
  label: string                     // "Day 1 — Thursday, 11 December"
  scenes: SceneInput[]
  stats: {
    photoCount: number
    sceneCount: number
    venues: string[]
    earliestPhoto: string | null
    latestPhoto: string | null
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const body = await req.json()
    const {
      title,
      city,
      country,
      participants,
      days,
      crossMissionContext,
      weatherSummary,
      moodTags,
      directorNotes,
      photoUrls,           // Up to 8 representative photos for vision context
    } = body as {
      title: string
      city: string
      country: string
      participants: string[]
      days: DayInput[]
      crossMissionContext: string | null
      weatherSummary: string | null
      moodTags: string[]
      directorNotes: string | null
      photoUrls: string[]
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 55000)

    try {
      // Build the rich prompt with all intelligence data
      const scenesSummary = days.map(day => {
        const scenesText = day.scenes.map(s => {
          const parts = [`- ${s.title ?? 'Unknown Scene'}`]
          if (s.startTime) parts.push(`(${s.startTime}${s.endTime ? '–' + s.endTime : ''})`)
          if (s.gentsPresent.length) parts.push(`[${s.gentsPresent.join(', ')}]`)
          if (s.foodDrinks.length) parts.push(`Food/drinks: ${s.foodDrinks.join(', ')}`)
          if (s.photoDescriptions.length) parts.push(`Photos show: ${s.photoDescriptions.join('; ')}`)
          if (s.ephemeraTexts.length) parts.push(`Text found: ${s.ephemeraTexts.join('; ')}`)
          return parts.join(' ')
        }).join('\n')
        return `### ${day.label} (${day.stats.photoCount} photos, ${day.stats.sceneCount} scenes)\nVenues: ${day.stats.venues.join(', ') || 'Unknown'}\nActive: ${day.stats.earliestPhoto ?? '?'} – ${day.stats.latestPhoto ?? '?'}\n${scenesText}`
      }).join('\n\n')

      const systemPrompt = `You are the Lorekeeper of The Gents Chronicles — a private lifestyle chronicle of three gentlemen (${participants.join(', ')}). You write in the voice of an intimate, literary narrator who was at every scene. Your prose is vivid, specific, and atmospheric — referencing real details from the intelligence below.

${GENT_VISUAL_ID}

Gent aliases: ${Object.entries(GENT_ALIASES).map(([k, v]) => `${k} = "${v}"`).join(', ')}

RULES:
- Use first names naturally. Reference specific venues, food, drinks, and moments from the scene data.
- Never fabricate details not supported by the intelligence data.
- Match the mood of each scene. A chaotic bar scene gets different energy than a contemplative morning walk.
- Avoid generic filler. Every sentence must earn its place with a specific detail, name, or observation.
- No emojis. Ever.
- If Director's Notes are provided, weave their observations into the narrative naturally.
${crossMissionContext ? `\nCROSS-MISSION CONTEXT (reference previous visits naturally):\n${crossMissionContext}` : ''}
${weatherSummary ? `\nWEATHER: ${weatherSummary}` : ''}
${moodTags?.length ? `\nMOOD TAGS (embody these, don't name them): ${moodTags.join(', ')}` : ''}
${directorNotes ? `\nDIRECTOR'S NOTES: ${directorNotes}` : ''}`

      const userPrompt = `Generate the complete narrative for this mission to ${city}, ${country}: "${title}"

INTELLIGENCE DATA:
${scenesSummary}

Return your response in this exact XML format:

${days.map((day, i) => day.scenes.map(s =>
  `<scene id="${s.id}">1-2 sentences narrating this specific scene</scene>`
).join('\n')).join('\n')}

${days.map((day, i) =>
  `<day${i + 1}_briefing>One-line morning mood-setter for ${day.label}. Set the tone — weather, energy, what was ahead.</day${i + 1}_briefing>
<day${i + 1}>2-4 sentences narrating the full day as a chapter. Reference specific scenes, meals, and moments. This should read as a cohesive day story.</day${i + 1}>
<day${i + 1}_debrief>One-line evening wrap-up. What actually happened vs. what was planned. Tone: reflective, wry.</day${i + 1}_debrief>`
).join('\n')}

<arc>3-4 paragraphs telling the story of the entire trip. This is the master narrative — it should have an opening that sets the scene, a body that captures the arc (the energy shifts, the key moments, the turning points), and a closing that reflects on what the trip meant. Rich, literary, specific.</arc>

<oneliner>One punchy sentence distilling the entire mission.</oneliner>

<title1>Suggested title option 1 (3-7 words)</title1>
<title2>Suggested title option 2 (3-7 words)</title2>
<title3>Suggested title option 3 (3-7 words)</title3>

<verdict_best_meal>Best meal of the trip: name and one-sentence reason</verdict_best_meal>
<verdict_best_venue>Best venue: name and one-sentence reason</verdict_best_venue>
<verdict_chaos>Most chaotic moment: one sentence</verdict_chaos>
<verdict_mvp_scene>MVP scene ID and one-sentence reason why</verdict_mvp_scene>
<verdict_return>Would The Gents return? Yes/No and a one-sentence reason (tongue-in-cheek)</verdict_return>`

      // Build message content with photos for vision context
      const content: unknown[] = []

      // Add up to 8 photos for visual context
      for (const url of photoUrls.slice(0, 8)) {
        content.push({
          type: "image",
          source: { type: "url", url },
        })
      }

      content.push({ type: "text", text: userPrompt })

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": ANTHROPIC_KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content }],
        }),
        signal: controller.signal,
      })

      if (!res.ok) {
        const err = await res.text()
        return new Response(JSON.stringify({ error: `Claude API error: ${err}` }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        })
      }

      const data = await res.json()
      const text = data.content?.[0]?.text ?? ""

      // Parse all XML sections
      const extract = (tag: string) => {
        const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
        return m?.[1]?.trim() ?? null
      }

      // Scene narratives
      const sceneNarratives: Record<string, string> = {}
      for (const day of days) {
        for (const scene of day.scenes) {
          const narrative = extract(`scene id="${scene.id}"`)
          if (narrative) sceneNarratives[scene.id] = narrative
        }
      }

      // Day chapters
      const dayChapters = days.map((_, i) => ({
        briefing: extract(`day${i + 1}_briefing`),
        narrative: extract(`day${i + 1}`),
        debrief: extract(`day${i + 1}_debrief`),
      }))

      // Overall
      const arc = extract("arc")
      const oneliner = extract("oneliner")
      const titles = [extract("title1"), extract("title2"), extract("title3")].filter(Boolean)

      // Verdict
      const verdict = {
        bestMeal: extract("verdict_best_meal"),
        bestVenue: extract("verdict_best_venue"),
        chaos: extract("verdict_chaos"),
        mvpScene: extract("verdict_mvp_scene"),
        wouldReturn: extract("verdict_return"),
      }

      return new Response(JSON.stringify({
        sceneNarratives,
        dayChapters,
        arc,
        oneliner,
        titles,
        verdict,
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})
```

- [ ] **Step 2: Create client-side wrapper**

Create `src/ai/missionLore.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import type { Scene, DayChapter, MissionIntel, EntryWithParticipants, PhotoAnalysis } from '@/types/app'
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
      const allAnalyses = allPhotos.map(id => photoAnalyses.get(id)).filter(Boolean) as PhotoAnalysis[]

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

  const participants = entry.participants?.map(p => p.name) ?? []
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
        weatherSummary: null,   // TODO: fetch from Open-Meteo
        moodTags,
        directorNotes,
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
```

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/generate-mission-narrative/ src/ai/missionLore.ts
git commit -m "feat(mission): mission narrative edge function + client orchestrator"
```

---

## Chunk 3: Cross-Mission Memory & Ephemera

**Scope:** Fetch previous missions to the same city for narrative callbacks. Aggregate ephemera from photo analyses. Build the verdict data structure.

### Task 3.1: Cross-Mission Memory

**Files:**
- Modify: `src/data/entries.ts` (extend fetchCityVisits)

- [ ] **Step 1: Extend `fetchCityVisits` for richer cross-mission data**

In `src/data/entries.ts`, add a new function alongside the existing one:

```typescript
/** Fetch previous missions to the same city with lore for cross-referencing */
export async function fetchCrossMissionContext(
  city: string,
  currentEntryId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from('entries')
    .select('id, title, date, lore, metadata')
    .eq('type', 'mission')
    .eq('city', city)
    .in('status', ['published', 'gathering_post'])
    .neq('id', currentEntryId)
    .order('date', { ascending: false })
    .limit(3)

  if (error || !data?.length) return null

  // Build a context string for Claude
  const lines = data.map(e => {
    const meta = e.metadata as Record<string, unknown> | null
    const venues = (meta?.landmarks as string[])?.join(', ') ?? 'unknown venues'
    const oneliner = (meta?.lore_oneliner as string) ?? ''
    return `- "${e.title}" (${e.date}): ${oneliner}. Venues: ${venues}`
  })

  return `Previous missions to ${city}:\n${lines.join('\n')}\nUse these naturally — reference shared venues, compare experiences, note changes.`
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/entries.ts
git commit -m "feat(mission): cross-mission memory — fetch previous trips to same city"
```

---

### Task 3.2: Aggregate Ephemera & Build Mission Intel

**Files:**
- Create: `src/lib/missionIntelBuilder.ts`

- [ ] **Step 1: Implement the intel builder**

This module takes raw photo analyses + scenes and builds the complete `MissionIntel` object:

```typescript
import type {
  EntryPhoto, PhotoAnalysis, Scene, MissionIntel,
  DayChapter, DayRoute, DayStats, Ephemera, TempoPoint,
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
        gentsPresent: [...new Set(dayAnalyses.flatMap(a => a.gents_present))],
        earliestPhoto: dayScenes[0]?.startTime ?? null,
        latestPhoto: dayScenes[dayScenes.length - 1]?.endTime ?? null,
      }

      return {
        day: dayScenes[0].day,
        dayIndex,
        label: formatDayLabel(dayIndex + 1, dayScenes[0].day),
        briefing: null,     // Set by narrative generation
        debrief: null,      // Set by narrative generation
        narrative: null,    // Set by narrative generation
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
      bestMeal: narrativeResult.verdict.bestMeal
        ? { name: narrativeResult.verdict.bestMeal, scene: '' }
        : null,
      bestVenue: narrativeResult.verdict.bestVenue
        ? { name: narrativeResult.verdict.bestVenue, scene: '' }
        : null,
      mostChaoticMoment: narrativeResult.verdict.chaos,
      mvpScene: narrativeResult.verdict.mvpScene
        ? { id: '', reason: narrativeResult.verdict.mvpScene }
        : null,
      wouldReturn: {
        answer: narrativeResult.verdict.wouldReturn?.toLowerCase().startsWith('yes') ?? true,
        reason: narrativeResult.verdict.wouldReturn ?? '',
      },
      tripStats: {
        totalVenues: [...new Set(scenes.map(s => s.title).filter(Boolean))].length,
        totalFoodDrinks: [...new Set(
          intel.scenes.flatMap(s => s.photoIds)
            .map(id => intel.scenes.find(s => s.photoIds.includes(id)))
            .filter(Boolean)
        )].length,
        kmWalked: null,  // Could estimate from GPS
        earliestPhoto: intel.days[0]?.stats.earliestPhoto ?? '',
        latestPhoto: intel.days[intel.days.length - 1]?.stats.latestPhoto ?? '',
        photosPerDay: intel.days.map(d => d.stats.photoCount),
      },
    },
    processed_at: new Date().toISOString(),
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/missionIntelBuilder.ts
git commit -m "feat(mission): mission intel builder — assembles scenes, ephemera, highlights, routes"
```

---

## Chunk 4: Mission Processing Pipeline in EntryNew

**Scope:** Rewire `EntryNew.tsx` to run the full intelligence pipeline after photo upload. Replace fire-and-forget with a progress overlay showing each stage.

### Task 4.1: Processing Overlay Component

**Files:**
- Create: `src/components/mission/MissionProcessingOverlay.tsx`

- [ ] **Step 1: Implement the overlay**

```typescript
import { motion, AnimatePresence } from 'framer-motion'

export type ProcessingStage =
  | 'uploading'
  | 'extracting_exif'
  | 'clustering_scenes'
  | 'analyzing_photos'
  | 'generating_narrative'
  | 'building_intel'
  | 'complete'

const STAGE_LABELS: Record<ProcessingStage, string> = {
  uploading: 'Uploading photos to vault...',
  extracting_exif: 'Extracting location & time data...',
  clustering_scenes: 'Identifying scenes...',
  analyzing_photos: 'AI analyzing each photo...',
  generating_narrative: 'Generating mission narrative...',
  building_intel: 'Assembling intelligence dossier...',
  complete: 'Mission dossier ready.',
}

const STAGE_ORDER: ProcessingStage[] = [
  'uploading', 'extracting_exif', 'clustering_scenes',
  'analyzing_photos', 'generating_narrative', 'building_intel', 'complete',
]

interface Props {
  stage: ProcessingStage
  photoProgress?: { done: number; total: number }
  analysisProgress?: { done: number; total: number }
}

export function MissionProcessingOverlay({ stage, photoProgress, analysisProgress }: Props) {
  const stageIdx = STAGE_ORDER.indexOf(stage)

  return (
    <div className="fixed inset-0 z-50 bg-obsidian/95 flex items-center justify-center">
      <div className="max-w-sm w-full px-6">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-gold.webp" alt="" className="w-16 h-16 animate-pulse" />
        </div>

        {/* Stage list */}
        <div className="space-y-3">
          {STAGE_ORDER.slice(0, -1).map((s, i) => {
            const isActive = i === stageIdx
            const isDone = i < stageIdx
            const isPending = i > stageIdx

            return (
              <motion.div
                key={s}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isPending ? 0.3 : 1, x: 0 }}
                className="flex items-center gap-3"
              >
                {/* Status indicator */}
                <div className={`w-2 h-2 rounded-full shrink-0 ${
                  isDone ? 'bg-gold' :
                  isActive ? 'bg-gold animate-pulse' :
                  'bg-ivory/20'
                }`} />

                {/* Label */}
                <span className={`text-xs font-body tracking-wide ${
                  isDone ? 'text-gold/60' :
                  isActive ? 'text-ivory' :
                  'text-ivory/30'
                }`}>
                  {STAGE_LABELS[s]}
                </span>

                {/* Progress detail */}
                {isActive && s === 'uploading' && photoProgress && (
                  <span className="text-[10px] text-gold/50 font-mono ml-auto">
                    {photoProgress.done}/{photoProgress.total}
                  </span>
                )}
                {isActive && s === 'analyzing_photos' && analysisProgress && (
                  <span className="text-[10px] text-gold/50 font-mono ml-auto">
                    {analysisProgress.done}/{analysisProgress.total}
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>

        {/* Bottom progress bar */}
        <div className="mt-8 h-0.5 bg-ivory/10 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gold/60 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${(stageIdx / (STAGE_ORDER.length - 1)) * 100}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission/MissionProcessingOverlay.tsx
git commit -m "feat(mission): processing overlay with stage-by-stage progress"
```

---

### Task 4.2: Rewire EntryNew Mission Pipeline

**Files:**
- Modify: `src/pages/EntryNew.tsx` (mission submission flow)

- [ ] **Step 1: Update the mission submission handler**

In `EntryNew.tsx`, replace the existing fire-and-forget mission flow (around lines 255-345) with the new staged pipeline. The key changes are:

1. Add state for `processingStage` and progress tracking
2. After photo upload, run EXIF extraction → scene clustering → photo analysis → narrative generation → intel assembly
3. Store the complete `MissionIntel` in `entry.metadata.mission_intel`
4. Show `MissionProcessingOverlay` during processing

```typescript
// New imports at top of EntryNew.tsx:
import { MissionProcessingOverlay, type ProcessingStage } from '@/components/mission/MissionProcessingOverlay'
import { clusterIntoScenes } from '@/lib/sceneEngine'
import { analyzePhotos, enrichScenesWithAnalysis } from '@/ai/missionIntel'
import { generateMissionNarrative } from '@/ai/missionLore'
import { buildMissionIntel, mergeNarratives } from '@/lib/missionIntelBuilder'
import { fetchCrossMissionContext } from '@/data/entries'

// New state:
const [processingStage, setProcessingStage] = useState<ProcessingStage | null>(null)
const [photoProgress, setPhotoProgress] = useState({ done: 0, total: 0 })
const [analysisProgress, setAnalysisProgress] = useState({ done: 0, total: 0 })

// In the mission branch of handleSubmit, after entry creation + participant adding:

// Stage 1: Upload photos
setProcessingStage('uploading')
setPhotoProgress({ done: 0, total: pendingFiles.length })
const { urls: uploadedUrls } = await uploadAll(entry.id, (done, total) => {
  setPhotoProgress({ done, total })
})

// Stage 2: Fetch uploaded photos with EXIF data
setProcessingStage('extracting_exif')
const freshPhotos = await fetchEntryPhotos(entry.id)

// Stage 3: Scene clustering
setProcessingStage('clustering_scenes')
const dateEnd = (formData.metadata as Record<string, unknown>)?.date_end as string | undefined
const rawScenes = clusterIntoScenes(freshPhotos, formData.date, dateEnd)

// Stage 4: AI photo analysis
setProcessingStage('analyzing_photos')
const analyses = await analyzePhotos(
  freshPhotos,
  'mission',
  entry.city ?? '',
  entry.country ?? '',
  (done, total) => setAnalysisProgress({ done, total }),
)
const enrichedScenes = enrichScenesWithAnalysis(rawScenes, analyses)

// Stage 5: Generate narrative
setProcessingStage('generating_narrative')
const crossContext = await fetchCrossMissionContext(entry.city ?? '', entry.id).catch(() => null)
const directorNotes = collectAllHints(entry.metadata as Record<string, unknown>)

const narrativeResult = await generateMissionNarrative(
  entryWithParticipants,
  enrichedScenes,
  analyses,
  uploadedUrls,
  crossContext,
  directorNotes,
)

// Stage 6: Build intel
setProcessingStage('building_intel')
const baseIntel = buildMissionIntel(freshPhotos, enrichedScenes, analyses)
const fullIntel: MissionIntel = narrativeResult
  ? mergeNarratives({
      ...baseIntel,
      tripArc: null,
      verdict: null,
      crossMissionRefs: [],
      processed_at: new Date().toISOString(),
    }, narrativeResult)
  : {
      ...baseIntel,
      tripArc: null,
      verdict: null,
      crossMissionRefs: [],
      processed_at: new Date().toISOString(),
    }

// Save intel to entry metadata
const updatedMeta = {
  ...(entry.metadata as Record<string, unknown> ?? {}),
  mission_intel: fullIntel,
  lore_oneliner: narrativeResult?.oneliner ?? null,
}
await updateEntry(entry.id, { metadata: updatedMeta } as Partial<EntryWithParticipants>)

// Save trip arc as main lore
if (narrativeResult?.arc) {
  await updateEntryLore(entry.id, narrativeResult.arc)
}

// Update title if suggested
if (narrativeResult?.titles?.[0]) {
  await updateEntry(entry.id, { title: narrativeResult.titles[0] } as Partial<EntryWithParticipants>)
}

// Fire-and-forget: stamp generation (unchanged)
createMissionStamp({ ...entry, title: narrativeResult?.titles?.[0] ?? entry.title })
  .then(stamp => generateStamp(stamp))
  .catch(() => {})

setProcessingStage('complete')
// Short delay then navigate
setTimeout(() => navigate(`/chronicle/${entry.id}`), 800)

// In the render, before the return:
{processingStage && (
  <MissionProcessingOverlay
    stage={processingStage}
    photoProgress={photoProgress}
    analysisProgress={analysisProgress}
  />
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/EntryNew.tsx
git commit -m "feat(mission): full intelligence pipeline in entry creation — scene clustering + AI analysis + narrative"
```

---

## Chunk 5: Mission Dossier UI

**Scope:** Replace the broken horizontal carousel in `MissionLayout` with a vertical scrolling dossier. New components: DossierVisaCard, DayChapter, SceneCard, RouteMap, TripTempoGraph, MissionVerdict, EphemeraGallery, DayStickyNav, HighlightReel, GentPresenceBar.

### Task 5.1: Sticky Day Navigation

**Files:**
- Create: `src/components/mission/DayStickyNav.tsx`

- [ ] **Step 1: Implement sticky day nav**

```typescript
import { cn } from '@/lib/utils'

interface Props {
  days: { label: string; id: string }[]
  activeDay: string | null
  onDayClick: (id: string) => void
  extraItems?: { label: string; id: string }[]  // Intel, Verdict, etc.
}

export function DayStickyNav({ days, activeDay, onDayClick, extraItems = [] }: Props) {
  const allItems = [
    ...days.map((d, i) => ({ label: `Day ${i + 1}`, id: d.id })),
    ...extraItems,
  ]

  return (
    <div className="sticky top-0 z-20 bg-obsidian/90 backdrop-blur-sm border-b border-gold/10 px-4 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {allItems.map(item => (
          <button
            key={item.id}
            onClick={() => onDayClick(item.id)}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-[10px] font-body font-semibold tracking-wider uppercase transition-colors',
              activeDay === item.id
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'text-ivory/40 border border-ivory/10 hover:text-ivory/60',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission/DayStickyNav.tsx
git commit -m "feat(mission): sticky day navigation pills"
```

---

### Task 5.2: Scene Card Component

**Files:**
- Create: `src/components/mission/SceneCard.tsx`

- [ ] **Step 1: Implement scene card**

```typescript
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Scene, EntryPhoto } from '@/types/app'
import { cn } from '@/lib/utils'

interface Props {
  scene: Scene
  photos: EntryPhoto[]
  isFirst?: boolean
}

export function SceneCard({ scene, photos, isFirst }: Props) {
  const [expanded, setExpanded] = useState(false)
  const heroPhoto = photos.find(p => p.id === scene.heroPhotoId) ?? photos[0]
  const otherPhotos = photos.filter(p => p.id !== heroPhoto?.id)

  return (
    <div className="relative">
      {/* Time connector line */}
      {!isFirst && (
        <div className="absolute left-3 -top-4 w-px h-4 bg-gold/20" />
      )}

      <div className="flex gap-3">
        {/* Time marker */}
        <div className="shrink-0 w-6 flex flex-col items-center pt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-gold/50" />
          {scene.startTime && (
            <span className="text-[8px] font-mono text-gold/40 mt-1 -rotate-90 origin-center whitespace-nowrap">
              {scene.startTime}
            </span>
          )}
        </div>

        {/* Scene content */}
        <div className="flex-1 min-w-0">
          {/* Scene header */}
          <div className="flex items-baseline gap-2 mb-2">
            <h4 className="text-xs font-body font-semibold text-ivory/80 truncate">
              {scene.title ?? 'Scene'}
            </h4>
            {scene.mood && (
              <span className="text-[8px] font-mono text-gold/30 uppercase shrink-0">
                {scene.mood}
              </span>
            )}
          </div>

          {/* Hero photo */}
          {heroPhoto && (
            <div className="relative rounded-lg overflow-hidden mb-2" style={{ aspectRatio: '16/9' }}>
              <img src={heroPhoto.url} alt="" className="w-full h-full object-cover" />
            </div>
          )}

          {/* Narrative */}
          {scene.narrative && (
            <p className="text-[13px] font-display text-ivory/75 leading-relaxed mb-2 italic">
              {scene.narrative}
            </p>
          )}

          {/* Expandable photo strip */}
          {otherPhotos.length > 0 && (
            <>
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-[9px] font-mono text-gold/40 hover:text-gold/60 transition-colors mb-2"
              >
                {expanded ? 'Collapse' : `+${otherPhotos.length} more photos`}
              </button>
              <AnimatePresence>
                {expanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="grid grid-cols-3 gap-1 overflow-hidden"
                  >
                    {otherPhotos.map(p => (
                      <div key={p.id} className="rounded overflow-hidden" style={{ aspectRatio: '1' }}>
                        <img src={p.url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission/SceneCard.tsx
git commit -m "feat(mission): scene card component with hero photo, narrative, expandable strip"
```

---

### Task 5.3: Route Map Component

**Files:**
- Create: `src/components/mission/RouteMap.tsx`

- [ ] **Step 1: Implement route map**

```typescript
import { useEffect, useRef } from 'react'
import { getGoogleMaps } from '@/lib/geo'
import type { DayRoute, Scene } from '@/types/app'

interface Props {
  route: DayRoute
  scenes: Scene[]
  height?: number
}

export function RouteMap({ route, scenes, height = 200 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)

  useEffect(() => {
    if (!mapRef.current || route.points.length < 2) return

    let cancelled = false

    getGoogleMaps().then(google => {
      if (cancelled || !mapRef.current) return

      // Calculate bounds
      const bounds = new google.maps.LatLngBounds()
      route.points.forEach(p => bounds.extend({ lat: p.lat, lng: p.lng }))

      const map = new google.maps.Map(mapRef.current, {
        center: bounds.getCenter(),
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: false,
        mapTypeControl: false,
        streetViewControl: false,
        styles: darkMapStyles,
      })
      map.fitBounds(bounds, 40)
      mapInstance.current = map

      // Draw route polyline
      new google.maps.Polyline({
        path: route.points.map(p => ({ lat: p.lat, lng: p.lng })),
        strokeColor: '#c9a84c',
        strokeOpacity: 0.6,
        strokeWeight: 2,
        map,
      })

      // Add scene markers
      for (const scene of scenes) {
        if (!scene.centroid) continue
        const marker = new google.maps.Marker({
          position: scene.centroid,
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 5,
            fillColor: '#c9a84c',
            fillOpacity: 0.9,
            strokeColor: '#0a0a0f',
            strokeWeight: 1.5,
          },
          title: scene.title ?? undefined,
        })

        // Info window on click
        if (scene.title) {
          const info = new google.maps.InfoWindow({
            content: `<div style="color:#0a0a0f;font-family:sans-serif;font-size:11px;padding:2px">${scene.title}${scene.startTime ? ` · ${scene.startTime}` : ''}</div>`,
          })
          marker.addListener('click', () => info.open(map, marker))
        }
      }
    })

    return () => { cancelled = true }
  }, [route, scenes])

  if (route.points.length < 2) return null

  return (
    <div
      ref={mapRef}
      className="w-full rounded-lg overflow-hidden border border-gold/10"
      style={{ height }}
    />
  )
}

// Dark map styles (same as existing in geo.ts)
const darkMapStyles: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c9a84c' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0a0a0f' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0d0d1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission/RouteMap.tsx
git commit -m "feat(mission): route map component with gold polyline + scene markers"
```

---

### Task 5.4: Trip Tempo Graph, Verdict, Ephemera, Highlight Reel, Gent Presence

**Files:**
- Create: `src/components/mission/TripTempoGraph.tsx`
- Create: `src/components/mission/MissionVerdict.tsx`
- Create: `src/components/mission/EphemeraGallery.tsx`
- Create: `src/components/mission/HighlightReel.tsx`
- Create: `src/components/mission/GentPresenceBar.tsx`

- [ ] **Step 1: Trip Tempo Graph**

`src/components/mission/TripTempoGraph.tsx`:

```typescript
import type { TempoPoint } from '@/types/app'

interface Props {
  tempo: TempoPoint[]
  height?: number
}

export function TripTempoGraph({ tempo, height = 40 }: Props) {
  if (tempo.length < 3) return null

  // Build SVG path from tempo points
  const width = 100  // percentage-based viewBox
  const points = tempo.map((p, i) => ({
    x: (i / (tempo.length - 1)) * width,
    y: height - p.intensity * (height - 4),
  }))

  // Smooth curve through points
  const pathD = points.reduce((d, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`
    const prev = points[i - 1]
    const cpx = (prev.x + p.x) / 2
    return `${d} C ${cpx} ${prev.y}, ${cpx} ${p.y}, ${p.x} ${p.y}`
  }, '')

  // Fill area under curve
  const fillD = `${pathD} L ${width} ${height} L 0 ${height} Z`

  return (
    <div className="w-full px-1">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="tempo-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c9a84c" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#c9a84c" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#tempo-fill)" />
        <path d={pathD} fill="none" stroke="#c9a84c" strokeWidth="0.5" opacity="0.6" />
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Mission Verdict**

`src/components/mission/MissionVerdict.tsx`:

```typescript
import type { MissionVerdict as VerdictType } from '@/types/app'

interface Props {
  verdict: VerdictType
}

export function MissionVerdict({ verdict }: Props) {
  const items = [
    { label: 'Best Meal', value: verdict.bestMeal?.name },
    { label: 'Best Venue', value: verdict.bestVenue?.name },
    { label: 'Most Chaotic', value: verdict.mostChaoticMoment },
    { label: 'MVP Scene', value: verdict.mvpScene?.reason },
    {
      label: 'Would Return?',
      value: verdict.wouldReturn.reason,
      highlight: verdict.wouldReturn.answer,
    },
  ].filter(i => i.value)

  return (
    <div className="rounded-xl border border-gold/15 bg-obsidian/50 p-4 space-y-3">
      <h3 className="text-[9px] font-body font-semibold tracking-[0.3em] text-gold/50 uppercase">
        The Verdict
      </h3>
      {items.map(item => (
        <div key={item.label}>
          <span className="text-[8px] font-mono text-gold/40 uppercase tracking-wider">
            {item.label}
          </span>
          <p className="text-[13px] font-display text-ivory/80 leading-relaxed mt-0.5">
            {item.value}
          </p>
        </div>
      ))}

      {/* Trip stats */}
      {verdict.tripStats && (
        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gold/10">
          <Stat label="Venues" value={verdict.tripStats.totalVenues} />
          <Stat label="Earliest" value={verdict.tripStats.earliestPhoto} />
          <Stat label="Latest" value={verdict.tripStats.latestPhoto} />
        </div>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="text-center">
      <div className="text-sm font-display text-gold">{value}</div>
      <div className="text-[7px] font-mono text-ivory/30 uppercase tracking-wider">{label}</div>
    </div>
  )
}
```

- [ ] **Step 3: Ephemera Gallery**

`src/components/mission/EphemeraGallery.tsx`:

```typescript
import type { Ephemera } from '@/types/app'

interface Props {
  ephemera: Ephemera[]
}

const TYPE_LABELS: Record<string, string> = {
  menu: 'Menu',
  sign: 'Signage',
  ticket: 'Ticket',
  receipt: 'Receipt',
  boarding_pass: 'Boarding Pass',
  label: 'Label',
  other: 'Found Text',
}

export function EphemeraGallery({ ephemera }: Props) {
  if (ephemera.length === 0) return null

  return (
    <div className="space-y-2">
      <h3 className="text-[9px] font-body font-semibold tracking-[0.3em] text-gold/50 uppercase">
        Ephemera
      </h3>
      <div className="grid grid-cols-2 gap-2">
        {ephemera.map((item, i) => (
          <div
            key={i}
            className="rounded-lg p-3 border border-gold/10"
            style={{
              background: 'linear-gradient(135deg, #f5f0e8 0%, #e8e0d0 100%)',
            }}
          >
            <span className="text-[7px] font-mono text-obsidian/40 uppercase tracking-wider">
              {TYPE_LABELS[item.type] ?? item.type}
            </span>
            <p className="text-[11px] font-body text-obsidian/80 mt-1 leading-snug">
              {item.text}
            </p>
            <p className="text-[9px] font-body text-obsidian/50 mt-1 italic">
              {item.context}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Highlight Reel**

`src/components/mission/HighlightReel.tsx`:

```typescript
import type { EntryPhoto, PhotoAnalysis } from '@/types/app'

interface Props {
  highlightIds: string[]
  photos: EntryPhoto[]
  analyses: Map<string, PhotoAnalysis> | Record<string, PhotoAnalysis>
}

export function HighlightReel({ highlightIds, photos, analyses }: Props) {
  if (highlightIds.length === 0) return null

  const getAnalysis = (id: string) =>
    analyses instanceof Map ? analyses.get(id) : (analyses as Record<string, PhotoAnalysis>)[id]

  return (
    <div className="space-y-3">
      <h3 className="text-[9px] font-body font-semibold tracking-[0.3em] text-gold/50 uppercase">
        Highlight Reel
      </h3>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
        {highlightIds.map(id => {
          const photo = photos.find(p => p.id === id)
          const analysis = getAnalysis(id)
          if (!photo) return null
          return (
            <div key={id} className="shrink-0 w-60">
              <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '4/3' }}>
                <img src={photo.url} alt="" className="w-full h-full object-cover" />
              </div>
              {analysis?.highlight_reason && (
                <p className="text-[10px] font-body text-ivory/50 mt-1.5 leading-snug">
                  {analysis.highlight_reason}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Gent Presence Bar**

`src/components/mission/GentPresenceBar.tsx`:

```typescript
interface Props {
  gentsPresent: string[]
}

const GENT_COLORS: Record<string, string> = {
  haris: '#c9a84c',    // gold
  vedad: '#7c9885',    // sage
  almedin: '#8b7355',  // bronze
}

export function GentPresenceBar({ gentsPresent }: Props) {
  if (gentsPresent.length === 0) return null

  return (
    <div className="flex gap-1">
      {gentsPresent.map(name => (
        <div
          key={name}
          className="w-1.5 h-1.5 rounded-full"
          style={{ backgroundColor: GENT_COLORS[name.toLowerCase()] ?? '#c9a84c' }}
          title={name}
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 6: Commit all**

```bash
git add src/components/mission/TripTempoGraph.tsx src/components/mission/MissionVerdict.tsx src/components/mission/EphemeraGallery.tsx src/components/mission/HighlightReel.tsx src/components/mission/GentPresenceBar.tsx
git commit -m "feat(mission): tempo graph, verdict, ephemera, highlight reel, gent presence components"
```

---

### Task 5.5: Day Chapter Component

**Files:**
- Create: `src/components/mission/DayChapter.tsx`

- [ ] **Step 1: Implement day chapter**

```typescript
import type { DayChapter as DayChapterType, Scene, EntryPhoto } from '@/types/app'
import { SceneCard } from './SceneCard'
import { RouteMap } from './RouteMap'
import { TripTempoGraph } from './TripTempoGraph'
import { GentPresenceBar } from './GentPresenceBar'

interface Props {
  chapter: DayChapterType
  scenes: Scene[]
  photos: EntryPhoto[]
  tempo?: import('@/types/app').TempoPoint[]
}

export function DayChapter({ chapter, scenes, photos, tempo }: Props) {
  const photoMap = new Map(photos.map(p => [p.id, p]))

  // Filter tempo to this day
  const dayTempo = tempo?.filter(t => t.day === chapter.day) ?? []

  return (
    <div id={`day-${chapter.dayIndex}`} className="space-y-4">
      {/* Day header */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[10px] font-body font-semibold tracking-[0.2em] text-gold/50 uppercase">
            {chapter.label}
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-[8px] font-mono text-ivory/30">
              {chapter.stats.photoCount} photos · {chapter.stats.sceneCount} scenes
            </span>
            <GentPresenceBar gentsPresent={chapter.stats.gentsPresent} />
          </div>
        </div>
        <div className="h-px bg-gradient-to-r from-gold/30 to-transparent" />
      </div>

      {/* Morning briefing */}
      {chapter.briefing && (
        <div className="pl-4 border-l border-gold/20">
          <span className="text-[7px] font-mono text-gold/30 uppercase tracking-wider">Briefing</span>
          <p className="text-[12px] font-display text-ivory/60 italic mt-0.5">
            {chapter.briefing}
          </p>
        </div>
      )}

      {/* Tempo graph for this day */}
      {dayTempo.length > 3 && <TripTempoGraph tempo={dayTempo} height={24} />}

      {/* Route map */}
      {chapter.route && chapter.route.points.length >= 2 && (
        <RouteMap
          route={chapter.route}
          scenes={scenes.filter(s => chapter.sceneIds.includes(s.id))}
          height={180}
        />
      )}

      {/* Scenes */}
      <div className="space-y-4 pl-1">
        {scenes
          .filter(s => chapter.sceneIds.includes(s.id))
          .map((scene, i) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              photos={scene.photoIds.map(id => photoMap.get(id)).filter(Boolean) as EntryPhoto[]}
              isFirst={i === 0}
            />
          ))}
      </div>

      {/* Day narrative */}
      {chapter.narrative && (
        <div className="px-2">
          <p className="text-[14px] font-display text-ivory/80 leading-[1.8] first-letter:text-2xl first-letter:text-gold first-letter:font-bold first-letter:float-left first-letter:mr-1.5">
            {chapter.narrative}
          </p>
        </div>
      )}

      {/* Evening debrief */}
      {chapter.debrief && (
        <div className="pl-4 border-l border-ivory/10">
          <span className="text-[7px] font-mono text-ivory/20 uppercase tracking-wider">Debrief</span>
          <p className="text-[12px] font-display text-ivory/50 italic mt-0.5">
            {chapter.debrief}
          </p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/mission/DayChapter.tsx
git commit -m "feat(mission): day chapter component — briefing, route map, scenes, narrative, debrief"
```

---

### Task 5.6: Main Mission Dossier Layout

**Files:**
- Create: `src/components/mission/MissionDossier.tsx`
- Create: `src/components/mission/DossierVisaCard.tsx`
- Modify: `src/pages/EntryDetail.tsx` (route to new component)

- [ ] **Step 1: Extract and clean up Visa Card**

Create `src/components/mission/DossierVisaCard.tsx` — extract the visa card rendering from `MissionLayout.tsx` lines 180-288 into a standalone component. Same styling, same props, but self-contained.

(This is a direct extraction — keep the existing passport-style cream card with flag, photo band, destination, bearers, one-liner, stamp. No changes to the visual design.)

- [ ] **Step 2: Implement MissionDossier**

Create `src/components/mission/MissionDossier.tsx`:

```typescript
import { useState, useEffect, useRef, useCallback } from 'react'
import type { EntryWithParticipants, EntryPhoto, MissionIntel, PassportStamp } from '@/types/app'
import { fetchStampByEntryId } from '@/data/stamps'
import { fetchCityVisits, type CityVisit } from '@/data/entries'
import { DossierVisaCard } from './DossierVisaCard'
import { DayStickyNav } from './DayStickyNav'
import { DayChapter } from './DayChapter'
import { HighlightReel } from './HighlightReel'
import { EphemeraGallery } from './EphemeraGallery'
import { MissionVerdict } from './MissionVerdict'
import { TripTempoGraph } from './TripTempoGraph'

interface Props {
  entry: EntryWithParticipants
  photos: EntryPhoto[]
  isCreator: boolean
  onEntryUpdate: (entry: EntryWithParticipants) => void
  loreSlot?: React.ReactNode
  controlsSlot?: React.ReactNode
}

export function MissionDossier({ entry, photos, isCreator, onEntryUpdate, loreSlot, controlsSlot }: Props) {
  const [stamp, setStamp] = useState<PassportStamp | null>(null)
  const [cityVisit, setCityVisit] = useState<CityVisit | null>(null)
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const intel = (entry.metadata as Record<string, unknown>)?.mission_intel as MissionIntel | undefined

  // Fetch auxiliary data
  useEffect(() => {
    let cancelled = false
    fetchStampByEntryId(entry.id).then(s => { if (!cancelled) setStamp(s) }).catch(() => {})
    if (entry.city) {
      fetchCityVisits(entry.city, entry.id).then(v => { if (!cancelled) setCityVisit(v) }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [entry.id, entry.city])

  // Track active day on scroll
  const handleScroll = useCallback(() => {
    if (!scrollRef.current || !intel?.days.length) return
    const container = scrollRef.current
    const scrollTop = container.scrollTop + 120  // offset for sticky nav

    for (let i = intel.days.length - 1; i >= 0; i--) {
      const el = document.getElementById(`day-${i}`)
      if (el && el.offsetTop <= scrollTop) {
        setActiveDay(`day-${i}`)
        return
      }
    }
    setActiveDay(null)
  }, [intel?.days.length])

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Build photo analyses map from stored ai_analysis
  const analysesMap = new Map<string, import('@/types/app').PhotoAnalysis>()
  for (const p of photos) {
    if (p.ai_analysis) analysesMap.set(p.id, p.ai_analysis)
  }

  // Fallback: if no mission_intel yet, show legacy MissionLayout
  if (!intel) {
    // Import and render old MissionLayout as fallback
    // (This ensures existing missions without intel still render)
    return <LegacyFallback entry={entry} photos={photos} isCreator={isCreator} onEntryUpdate={onEntryUpdate} loreSlot={loreSlot} controlsSlot={controlsSlot} />
  }

  return (
    <div ref={scrollRef} onScroll={handleScroll}>
      {/* Visa Card */}
      <div className="px-4 pt-5">
        <DossierVisaCard entry={entry} stamp={stamp} cityVisit={cityVisit} />
      </div>

      {/* Trip Tempo */}
      {intel.tempo.length > 3 && (
        <div className="px-4 mt-4">
          <TripTempoGraph tempo={intel.tempo} height={32} />
        </div>
      )}

      {/* Sticky Day Nav */}
      <div className="mt-4">
        <DayStickyNav
          days={intel.days.map((d, i) => ({ label: d.label, id: `day-${i}` }))}
          activeDay={activeDay}
          onDayClick={scrollToSection}
          extraItems={[
            ...(intel.highlights.length > 0 ? [{ label: 'Highlights', id: 'highlights' }] : []),
            ...(intel.verdict ? [{ label: 'Verdict', id: 'verdict' }] : []),
          ]}
        />
      </div>

      {/* Day Chapters */}
      <div className="px-4 mt-4 space-y-8">
        {intel.days.map(chapter => (
          <DayChapter
            key={chapter.day}
            chapter={chapter}
            scenes={intel.scenes.filter(s => chapter.sceneIds.includes(s.id))}
            photos={photos}
            tempo={intel.tempo}
          />
        ))}
      </div>

      {/* Trip Arc (overall narrative) */}
      {intel.tripArc && (
        <div className="px-4 mt-8">
          <h3 className="text-[9px] font-body font-semibold tracking-[0.3em] text-gold/50 uppercase mb-3">
            The Arc
          </h3>
          {intel.tripArc.split('\n\n').map((para, i) => (
            <p key={i} className="text-[14px] font-display text-ivory/80 leading-[1.8] mb-4 first-letter:text-2xl first-letter:text-gold first-letter:font-bold first-letter:float-left first-letter:mr-1.5">
              {para}
            </p>
          ))}
        </div>
      )}

      {/* Highlight Reel */}
      {intel.highlights.length > 0 && (
        <div id="highlights" className="px-4 mt-6">
          <HighlightReel highlightIds={intel.highlights} photos={photos} analyses={analysesMap} />
        </div>
      )}

      {/* Ephemera */}
      {intel.ephemera.length > 0 && (
        <div className="px-4 mt-6">
          <EphemeraGallery ephemera={intel.ephemera} />
        </div>
      )}

      {/* Verdict */}
      {intel.verdict && (
        <div id="verdict" className="px-4 mt-6">
          <MissionVerdict verdict={intel.verdict} />
        </div>
      )}

      {/* Lore section (Director's Notes + controls) */}
      <div className="px-4 mt-6">
        {loreSlot}
      </div>

      {/* Expandable More section */}
      <div className="px-4 mt-4 pb-8">
        {controlsSlot}
      </div>
    </div>
  )
}

// Legacy fallback for missions without intel
function LegacyFallback(props: Props) {
  // Lazy import to avoid circular deps
  const { MissionLayout } = require('@/components/chronicle/MissionLayout')
  return <MissionLayout {...props} />
}
```

- [ ] **Step 3: Update EntryDetail to use MissionDossier**

In `src/pages/EntryDetail.tsx`, change the mission rendering path:

```typescript
// Replace:
import { MissionLayout } from '@/components/chronicle/MissionLayout'

// With:
import { MissionDossier } from '@/components/mission/MissionDossier'

// In the render, change:
// if (isMission) return <MissionLayout ... />
// To:
if (isMission) {
  return (
    <PageWrapper scrollable>
      <MissionDossier
        entry={entry}
        photos={photos}
        isCreator={isCreator}
        onEntryUpdate={setEntry}
        loreSlot={loreSection}
        controlsSlot={controlsSection}
      />
    </PageWrapper>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/mission/MissionDossier.tsx src/components/mission/DossierVisaCard.tsx src/pages/EntryDetail.tsx
git commit -m "feat(mission): MissionDossier layout — vertical scroll dossier replacing horizontal carousel"
```

---

## Chunk 6: Cleanup, Migration & Polish

**Scope:** Deprecate the old Story auto-creation for missions (keep for manual arcs). Fix the timeline date display. Add lore regeneration support for the new intel pipeline. Deploy config updates.

### Task 6.1: Deprecate Auto-Story for Missions

**Files:**
- Modify: `src/pages/EntryNew.tsx` (remove createMissionStory call)
- Modify: `src/data/stories.ts` (add deprecation comment)

- [ ] **Step 1: Remove createMissionStory from EntryNew**

In the new mission pipeline (Task 4.2), the `createMissionStory()` call is no longer needed since mission intel lives in `entry.metadata.mission_intel`. Remove it.

Keep `createMissionStory` in `stories.ts` but add a comment marking it as deprecated for auto-creation; it's still used for manual story arcs.

- [ ] **Step 2: Commit**

```bash
git add src/pages/EntryNew.tsx src/data/stories.ts
git commit -m "refactor(mission): deprecate auto-story creation — intel now lives in entry metadata"
```

---

### Task 6.2: Fix Timeline Date Display

**Files:**
- Modify: `src/components/chronicle/MissionLayout.tsx` (legacy timeline)
- Modify: `src/components/mission/DossierVisaCard.tsx` (new visa card)

- [ ] **Step 1: Fix date format in timeline**

The current code on line 416 of MissionLayout.tsx shows `{ month: 'short', year: '2-digit' }` which produces "Dec 25" (month + 2-digit year) — misleading as it looks like a day. Change to show the actual date:

```typescript
// From:
{new Date(v.date + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })}

// To:
{new Date(v.date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit', timeZone: 'UTC' })}
```

This produces "11 Dec 25" — clear and unambiguous.

- [ ] **Step 2: Commit**

```bash
git add src/components/chronicle/MissionLayout.tsx
git commit -m "fix(mission): timeline dates now show day + month + year instead of ambiguous month + year"
```

---

### Task 6.3: Support Lore Regeneration with New Pipeline

**Files:**
- Modify: `src/pages/EntryDetail.tsx` (regenerate handler)

- [ ] **Step 1: Update regenerate flow**

In `EntryDetail.tsx`, the `handleRegenerateLore` function should check for existing `mission_intel` and re-run the narrative generation step (not the full photo analysis) using the existing analyses:

```typescript
// In handleRegenerateLore, for missions:
const intel = (entry.metadata as Record<string, unknown>)?.mission_intel as MissionIntel | undefined
if (intel) {
  // Re-run narrative only (skip photo analysis — already done)
  const analysesMap = new Map<string, PhotoAnalysis>()
  for (const p of photos) {
    if (p.ai_analysis) analysesMap.set(p.id, p.ai_analysis)
  }

  const crossContext = await fetchCrossMissionContext(entry.city ?? '', entry.id).catch(() => null)
  const directorNotes = collectAllHints(entry.metadata as Record<string, unknown>)

  const result = await generateMissionNarrative(
    entry, intel.scenes, analysesMap, photos.map(p => p.url),
    crossContext, directorNotes,
  )

  if (result) {
    const updatedIntel = mergeNarratives(intel, result)
    const meta = { ...(entry.metadata as Record<string, unknown>), mission_intel: updatedIntel }
    await updateEntry(entry.id, { metadata: meta } as Partial<EntryWithParticipants>)
    if (result.arc) await updateEntryLore(entry.id, result.arc)
    setEntry({ ...entry, lore: result.arc ?? entry.lore, metadata: meta })
  }
  return
}
// ...existing fallback for missions without intel
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/EntryDetail.tsx
git commit -m "feat(mission): regenerate lore uses existing photo intel — skips re-analysis"
```

---

### Task 6.4: Deploy Configuration

**Files:**
- Modify: `supabase/config.toml`
- Run: `tsc -b` to verify types
- Run: deploy

- [ ] **Step 1: Verify config.toml has new functions**

Ensure both new edge functions are listed:

```toml
[functions.analyze-mission-photos]
verify_jwt = false

[functions.generate-mission-narrative]
verify_jwt = false
```

- [ ] **Step 2: Type check**

Run: `npx tsc -b`
Expected: No errors

- [ ] **Step 3: Commit and push**

```bash
git add -A
git commit -m "feat(mission): mission intelligence overhaul — complete pipeline"
git push
```

- [ ] **Step 4: Verify deploy**

Run: `gh run watch $(gh run list --limit 1 --json databaseId -q '.[0].databaseId')`
Expected: All green — Vercel + Supabase migrations + Edge Functions

---

## Chunk 7: Advanced Intelligence Features

**Scope:** Director's Cut (per-scene editing), Gent Perspectives (multi-narrator per-scene notes), Ledger of Encounters (unnamed characters linked retroactively), Soundtrack integration, Audio intelligence from videos, Trip Tempo Graph visualization, Gent Presence heatmap.

> **Run `/simplify` before starting this chunk.**

### Task 7.1: Director's Cut — Per-Scene Editing

**Files:**
- Create: `src/components/mission/SceneEditor.tsx`
- Modify: `src/components/mission/SceneCard.tsx` (add edit affordance)
- Modify: `src/ai/missionLore.ts` (add `regenerateSceneNarrative()`)
- Modify: `supabase/functions/generate-mission-narrative/index.ts` (add single-scene mode)

**Concept:** After the AI generates scene narratives, the creator can tap any scene card to enter edit mode. They can:
1. Edit the scene narrative text directly
2. Add a "director's note" — insider context the AI couldn't know ("This is where Vedad nearly started a diplomatic incident")
3. Hit "Regenerate" to re-run the AI on just that scene, incorporating the director's note
4. Change the scene title (auto-generated from venue/time)

- [ ] **Step 1: Create SceneEditor overlay component**

```typescript
// src/components/mission/SceneEditor.tsx
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Scene, PhotoAnalysis, EntryPhoto } from '@/types/app'

interface Props {
  scene: Scene
  photos: EntryPhoto[]
  analyses: Map<string, PhotoAnalysis>
  onSave: (updated: { narrative?: string; title?: string; directorNote?: string }) => void
  onRegenerate: (directorNote: string) => Promise<string | null>
  onClose: () => void
}

export function SceneEditor({ scene, photos, analyses, onSave, onRegenerate, onClose }: Props) {
  const [title, setTitle] = useState(scene.title ?? '')
  const [narrative, setNarrative] = useState(scene.narrative ?? '')
  const [directorNote, setDirectorNote] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [narrative])

  const handleRegenerate = async () => {
    if (!directorNote.trim()) return
    setRegenerating(true)
    const result = await onRegenerate(directorNote.trim())
    if (result) setNarrative(result)
    setRegenerating(false)
  }

  const handleSave = () => {
    onSave({
      narrative: narrative !== scene.narrative ? narrative : undefined,
      title: title !== scene.title ? title : undefined,
      directorNote: directorNote.trim() || undefined,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-obsidian/95 backdrop-blur-sm overflow-y-auto"
    >
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-display text-gold text-lg">Edit Scene</h3>
          <button onClick={onClose} className="text-ivory/40 text-sm">Cancel</button>
        </div>

        {/* Scene title */}
        <div>
          <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-1 block">
            Scene Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-ivory/5 border border-ivory/10 rounded px-3 py-2 text-ivory font-body text-sm"
          />
        </div>

        {/* Narrative */}
        <div>
          <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-1 block">
            Narrative
          </label>
          <textarea
            ref={textareaRef}
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            className="w-full bg-ivory/5 border border-ivory/10 rounded px-3 py-2 text-ivory font-body text-sm resize-none min-h-[100px]"
          />
        </div>

        {/* Director's Note */}
        <div>
          <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-1 block">
            Director's Note (context for AI)
          </label>
          <textarea
            value={directorNote}
            onChange={e => setDirectorNote(e.target.value)}
            placeholder="What really happened here? Add insider context the photos can't show..."
            className="w-full bg-ivory/5 border border-ivory/10 rounded px-3 py-2 text-ivory/60 font-body text-sm resize-none min-h-[80px] placeholder:text-ivory/20"
          />
          {directorNote.trim() && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="mt-2 px-3 py-1.5 text-xs font-body font-semibold text-gold border border-gold/30 rounded-full hover:bg-gold/10 disabled:opacity-40"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate with Note'}
            </button>
          )}
        </div>

        {/* Photo strip (read-only context) */}
        <div>
          <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-1 block">
            Scene Photos ({photos.length})
          </label>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {photos.map(p => (
              <img
                key={p.id}
                src={p.url}
                className="w-16 h-16 object-cover rounded flex-shrink-0 border border-ivory/10"
                alt=""
              />
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-3 bg-gold/20 text-gold font-display text-sm rounded-lg border border-gold/30"
        >
          Save Changes
        </button>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Add single-scene regeneration to edge function**

In `supabase/functions/generate-mission-narrative/index.ts`, add a `mode: 'single_scene'` path:

```typescript
// At the top of the handler, after parsing request:
const { entry, mode, scene, photoUrls, directorNote, analyses, crossContext } = await req.json()

if (mode === 'single_scene') {
  // Single-scene regeneration — focused prompt with director's note
  const sceneAnalyses = (scene.photoIds ?? [])
    .map((id: string) => analyses?.[id])
    .filter(Boolean)

  const scenePhotos = (scene.photoIds ?? [])
    .map((id: string) => photoUrls?.[id])
    .filter(Boolean)

  const prompt = `You are the chronicler of The Gents. Rewrite the narrative for this specific scene from their mission.

Scene: ${scene.title ?? 'Untitled scene'}
Time: ${scene.startTime ?? 'unknown'} — ${scene.endTime ?? 'unknown'}
Location: ${entry.city}, ${entry.country}
${sceneAnalyses.length > 0 ? `\nPhoto intelligence:\n${sceneAnalyses.map((a: PhotoAnalysis) => `- ${a.description}${a.venue_name ? ` (${a.venue_name})` : ''}${a.food_drinks?.length ? ` [${a.food_drinks.join(', ')}]` : ''}`).join('\n')}` : ''}
${directorNote ? `\nDirector's Note (IMPORTANT — incorporate this context naturally): ${directorNote}` : ''}
${crossContext ? `\nPrevious visits: ${crossContext}` : ''}

Write 2-3 sentences capturing the essence of this moment. First person plural ("We", "The Gents"). No emojis.

<scene_narrative>Your narrative here.</scene_narrative>`

  const content = [
    ...scenePhotos.slice(0, 4).map((url: string) => ({ type: 'image' as const, source: { type: 'url' as const, url } })),
    { type: 'text' as const, text: prompt },
  ]

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{ role: 'user', content }],
    }),
    signal: AbortSignal.timeout(15000),
  })

  const result = await response.json()
  const raw = result.content?.[0]?.text?.trim() ?? ''
  const match = raw.match(/<scene_narrative>([\s\S]*?)<\/scene_narrative>/)
  const narrative = match?.[1]?.trim() ?? raw.replace(/<[^>]+>/g, '').trim()

  return new Response(JSON.stringify({ narrative }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ...existing full-mission narrative logic continues below
```

- [ ] **Step 3: Add client wrapper for single-scene regeneration**

In `src/ai/missionLore.ts`:

```typescript
/** Regenerate narrative for a single scene with optional director's note */
export async function regenerateSceneNarrative(
  entry: Entry,
  scene: Scene,
  photoUrls: Record<string, string>,
  analyses: Record<string, PhotoAnalysis>,
  directorNote?: string,
  crossContext?: string | null,
): Promise<string | null> {
  const { data } = await supabase.functions.invoke('generate-mission-narrative', {
    body: {
      entry,
      mode: 'single_scene',
      scene,
      photoUrls,
      analyses,
      directorNote: directorNote ?? null,
      crossContext: crossContext ?? null,
    },
  })
  return data?.narrative ?? null
}
```

- [ ] **Step 4: Add edit affordance to SceneCard**

In `src/components/mission/SceneCard.tsx`, add a pencil icon button (creator-only) that opens SceneEditor:

```typescript
// Add to SceneCard props:
isCreator?: boolean
onEdit?: () => void

// In the card header, after the scene title:
{isCreator && onEdit && (
  <button
    onClick={(e) => { e.stopPropagation(); onEdit() }}
    className="p-1 text-ivory/30 hover:text-gold transition-colors"
    aria-label="Edit scene"
  >
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
    </svg>
  </button>
)}
```

- [ ] **Step 5: Wire SceneEditor into MissionDossier**

In `MissionDossier.tsx`, manage editing state:

```typescript
const [editingScene, setEditingScene] = useState<Scene | null>(null)

// In DayChapter rendering, pass onEdit to each SceneCard:
onEdit={() => setEditingScene(scene)}

// At the bottom of MissionDossier, render the editor overlay:
<AnimatePresence>
  {editingScene && (
    <SceneEditor
      scene={editingScene}
      photos={photos.filter(p => editingScene.photoIds.includes(p.id))}
      analyses={analysesMap}
      onSave={async (updates) => {
        const intel = entry.metadata.mission_intel as MissionIntel
        const updatedScenes = intel.scenes.map(s =>
          s.id === editingScene.id
            ? { ...s, ...updates.title && { title: updates.title }, ...updates.narrative && { narrative: updates.narrative } }
            : s
        )
        const updatedIntel = { ...intel, scenes: updatedScenes }
        await updateEntry(entry.id, { metadata: { ...entry.metadata, mission_intel: updatedIntel } })
        onEntryUpdate({ ...entry, metadata: { ...entry.metadata, mission_intel: updatedIntel } })
      }}
      onRegenerate={async (note) => {
        const photoUrlMap: Record<string, string> = {}
        const analysisMap: Record<string, PhotoAnalysis> = {}
        for (const p of photos) {
          photoUrlMap[p.id] = p.url
          if (p.ai_analysis) analysisMap[p.id] = p.ai_analysis
        }
        return regenerateSceneNarrative(entry, editingScene, photoUrlMap, analysisMap, note)
      }}
      onClose={() => setEditingScene(null)}
    />
  )}
</AnimatePresence>
```

- [ ] **Step 6: Commit**

```bash
git add src/components/mission/SceneEditor.tsx src/components/mission/SceneCard.tsx src/components/mission/MissionDossier.tsx src/ai/missionLore.ts supabase/functions/generate-mission-narrative/index.ts
git commit -m "feat(mission): Director's Cut — per-scene editing with AI regeneration + director's notes"
```

---

### Task 7.2: Gent Perspectives — Multi-Narrator Per-Scene Notes

**Files:**
- Create: `src/components/mission/GentPerspectives.tsx`
- Modify: `src/types/app.ts` (add `GentSceneNote` type)
- Modify: `src/components/mission/SceneCard.tsx` (show perspective indicator)
- Modify: `src/components/mission/MissionDossier.tsx` (perspective modal)

**Concept:** Each Gent who participated in the mission can add their own notes to any scene. These are stored in `entry.metadata.mission_intel.gent_scene_notes` keyed by `{sceneId}:{gentId}`. The scene card shows a small avatar indicator when other Gents have added notes. Tapping reveals all perspectives in a modal — like unreliable narrators recounting the same moment differently.

- [ ] **Step 1: Define type**

In `src/types/app.ts`:

```typescript
/** Per-gent note on a specific scene */
export interface GentSceneNote {
  sceneId: string
  gentId: string
  gentAlias: string
  note: string
  addedAt: string  // ISO timestamp
}
```

And extend `MissionIntel`:

```typescript
export interface MissionIntel {
  // ...existing fields
  gent_scene_notes?: GentSceneNote[]
}
```

- [ ] **Step 2: Create GentPerspectives component**

```typescript
// src/components/mission/GentPerspectives.tsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { GentSceneNote, Scene, Gent } from '@/types/app'

interface Props {
  scene: Scene
  notes: GentSceneNote[]
  participants: Gent[]
  currentGentId: string
  isParticipant: boolean
  onAddNote: (sceneId: string, note: string) => void
}

export function GentPerspectives({ scene, notes, participants, currentGentId, isParticipant, onAddNote }: Props) {
  const [myNote, setMyNote] = useState(
    notes.find(n => n.gentId === currentGentId)?.note ?? ''
  )
  const [editing, setEditing] = useState(false)
  const otherNotes = notes.filter(n => n.gentId !== currentGentId)

  return (
    <div className="space-y-4">
      {/* Other Gents' perspectives */}
      {otherNotes.map(n => {
        const gent = participants.find(g => g.id === n.gentId)
        return (
          <div key={n.gentId} className="flex gap-3">
            <img
              src={gent?.avatar_url ?? ''}
              alt=""
              className="w-8 h-8 rounded-full border border-gold/20 shrink-0 mt-1"
            />
            <div>
              <p className="text-[10px] font-body uppercase tracking-widest text-gold/60 mb-0.5">
                {gent?.display_name ?? 'Unknown'}
              </p>
              <p className="text-ivory/70 font-body text-sm italic leading-relaxed">
                "{n.note}"
              </p>
            </div>
          </div>
        )
      })}

      {/* Current Gent's note (editable if participant) */}
      {isParticipant && (
        <div className="border-t border-ivory/5 pt-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={myNote}
                onChange={e => setMyNote(e.target.value)}
                placeholder="What do you remember about this moment?"
                className="w-full bg-ivory/5 border border-ivory/10 rounded px-3 py-2 text-ivory/60 font-body text-sm resize-none min-h-[60px] placeholder:text-ivory/20"
                maxLength={300}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onAddNote(scene.id, myNote.trim()); setEditing(false) }}
                  disabled={!myNote.trim()}
                  className="px-3 py-1 text-xs font-body font-semibold text-gold border border-gold/30 rounded-full disabled:opacity-30"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1 text-xs font-body text-ivory/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-body text-ivory/30 hover:text-gold transition-colors"
            >
              {myNote ? 'Edit your perspective' : '+ Add your perspective'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Add perspective indicator to SceneCard**

In `SceneCard.tsx`, below the narrative text:

```typescript
// Props addition:
perspectiveCount?: number  // Number of Gents who added notes
onShowPerspectives?: () => void

// In render, after narrative:
{perspectiveCount != null && perspectiveCount > 0 && (
  <button
    onClick={onShowPerspectives}
    className="flex items-center gap-1.5 text-[10px] font-body text-ivory/30 hover:text-gold transition-colors mt-2"
  >
    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197" />
    </svg>
    {perspectiveCount} {perspectiveCount === 1 ? 'perspective' : 'perspectives'}
  </button>
)}
```

- [ ] **Step 4: Wire into MissionDossier with save logic**

```typescript
// In MissionDossier state:
const [perspectiveScene, setPerspectiveScene] = useState<Scene | null>(null)

// Handler to save a Gent's note:
const handleAddNote = async (sceneId: string, note: string) => {
  const intel = entry.metadata.mission_intel as MissionIntel
  const existing = (intel.gent_scene_notes ?? []).filter(
    n => !(n.sceneId === sceneId && n.gentId === gent.id)
  )
  const updated: GentSceneNote[] = [
    ...existing,
    { sceneId, gentId: gent.id, gentAlias: gent.alias, note, addedAt: new Date().toISOString() },
  ]
  const updatedIntel = { ...intel, gent_scene_notes: updated }
  await updateEntry(entry.id, { metadata: { ...entry.metadata, mission_intel: updatedIntel } })
  onEntryUpdate({ ...entry, metadata: { ...entry.metadata, mission_intel: updatedIntel } })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/mission/GentPerspectives.tsx src/components/mission/SceneCard.tsx src/components/mission/MissionDossier.tsx src/types/app.ts
git commit -m "feat(mission): Gent Perspectives — multi-narrator per-scene notes with avatar indicators"
```

---

### Task 7.3: Trip Tempo Graph Visualization

**Files:**
- Create: `src/components/mission/TripTempoGraph.tsx`
- Modify: `src/components/mission/MissionDossier.tsx` (render tempo below visa card)

**Concept:** SVG waveform showing photo frequency over time, placed between the visa card and the first day chapter. Gold bars on dark background, with day boundaries marked. Visual energy arc of the trip.

- [ ] **Step 1: Implement TripTempoGraph**

```typescript
// src/components/mission/TripTempoGraph.tsx
import type { TempoPoint } from '@/types/app'

interface Props {
  points: TempoPoint[]
  className?: string
}

export function TripTempoGraph({ points, className }: Props) {
  if (points.length < 3) return null

  const WIDTH = 320
  const HEIGHT = 48
  const PADDING = 4

  // Group by day for day boundary markers
  const days = [...new Set(points.map(p => p.day))].sort()

  // Normalize x-axis across all points (time-based)
  const times = points.map(p => new Date(p.time).getTime())
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const range = maxT - minT || 1

  const barWidth = Math.max(2, (WIDTH - PADDING * 2) / points.length - 1)

  return (
    <div className={className}>
      <p className="text-[9px] font-body uppercase tracking-[0.2em] text-ivory/20 mb-1.5">Trip Tempo</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-12" preserveAspectRatio="none">
        {/* Day boundary lines */}
        {days.slice(1).map(day => {
          const firstInDay = points.find(p => p.day === day)
          if (!firstInDay) return null
          const x = PADDING + ((new Date(firstInDay.time).getTime() - minT) / range) * (WIDTH - PADDING * 2)
          return (
            <line
              key={day}
              x1={x} y1={0} x2={x} y2={HEIGHT}
              stroke="rgba(245,240,232,0.08)"
              strokeWidth={0.5}
              strokeDasharray="2,2"
            />
          )
        })}

        {/* Intensity bars */}
        {points.map((p, i) => {
          const x = PADDING + ((times[i] - minT) / range) * (WIDTH - PADDING * 2)
          const h = Math.max(1, p.intensity * (HEIGHT - PADDING * 2))
          const y = HEIGHT - PADDING - h
          const opacity = 0.2 + p.intensity * 0.6
          return (
            <rect
              key={i}
              x={x - barWidth / 2}
              y={y}
              width={barWidth}
              height={h}
              rx={barWidth / 2}
              fill={`rgba(201,168,76,${opacity})`}
            />
          )
        })}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Render in MissionDossier between visa card and first day chapter**

```typescript
// In MissionDossier, after the visa card section:
{intel?.tempo && intel.tempo.length > 2 && (
  <TripTempoGraph points={intel.tempo} className="px-4 py-3" />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mission/TripTempoGraph.tsx src/components/mission/MissionDossier.tsx
git commit -m "feat(mission): Trip Tempo Graph — SVG waveform showing photo frequency over time"
```

---

### Task 7.4: Gent Presence Bar

**Files:**
- Create: `src/components/mission/GentPresenceBar.tsx`
- Modify: `src/components/mission/SceneCard.tsx` (render presence bar)

**Concept:** Horizontal row of small avatar circles showing which Gents were identified in each scene's photos (from `ai_analysis.gents_present`). Shows "who was where when" at a glance. If a Gent wasn't detected in any scene photos but was a participant, their avatar appears dimmed.

- [ ] **Step 1: Implement GentPresenceBar**

```typescript
// src/components/mission/GentPresenceBar.tsx
import type { Gent } from '@/types/app'
import { cn } from '@/lib/utils'

interface Props {
  participants: Gent[]
  presentAliases: string[]  // Aliases detected in scene photos
}

export function GentPresenceBar({ participants, presentAliases }: Props) {
  if (participants.length === 0) return null

  return (
    <div className="flex gap-1.5 items-center">
      {participants.map(gent => {
        const isPresent = presentAliases.some(
          a => a.toLowerCase().includes(gent.alias) || a.toLowerCase().includes(gent.display_name.toLowerCase())
        )
        return (
          <img
            key={gent.id}
            src={gent.avatar_url ?? ''}
            alt={gent.display_name}
            className={cn(
              'w-5 h-5 rounded-full border transition-opacity',
              isPresent
                ? 'border-gold/40 opacity-100'
                : 'border-ivory/10 opacity-25 grayscale',
            )}
            title={`${gent.display_name}${isPresent ? ' (present)' : ' (not seen)'}`}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 2: Integrate into SceneCard**

In `SceneCard.tsx`, derive present aliases from photo analyses and render:

```typescript
// Derive present Gents from scene photo analyses
const presentAliases = useMemo(() => {
  const all = scene.photoIds
    .map(id => analyses?.get(id)?.gents_present ?? [])
    .flat()
  return [...new Set(all)]
}, [scene, analyses])

// In render, after the time/location line:
<GentPresenceBar participants={participants} presentAliases={presentAliases} />
```

- [ ] **Step 3: Commit**

```bash
git add src/components/mission/GentPresenceBar.tsx src/components/mission/SceneCard.tsx
git commit -m "feat(mission): Gent Presence Bar — who was detected in each scene"
```

---

### Task 7.5: Ledger of Encounters — Unnamed Characters Linked Retroactively

**Files:**
- Create: `src/hooks/useMissionEncounters.ts`
- Modify: `src/components/mission/MissionDossier.tsx` (encounters section)
- Modify: `src/components/circle/PersonDetail.tsx` (show mission mentions)

**Concept:** When the AI analyzes photos, it may describe unnamed people: "a bartender", "a waiter", "someone at the next table". These descriptions are stored in `ai_analysis.unnamed_characters`. If a contact is later added to Circle and tagged in the entry via `person_appearances`, the dossier retroactively links the description to the person: "the bartender" becomes "Marco from Fige Udvar" with a link to their dossier.

- [ ] **Step 1: Extend PhotoAnalysis type**

In `src/types/app.ts`, add to `PhotoAnalysis`:

```typescript
export interface PhotoAnalysis {
  // ...existing fields
  unnamed_characters?: UnnamedCharacter[]
}

export interface UnnamedCharacter {
  description: string         // "A bartender in a black apron"
  role: string               // "bartender", "waiter", "friend", "stranger"
  approximate_age?: string   // "mid-30s"
  distinguishing: string     // "tall, beard, glasses"
}
```

- [ ] **Step 2: Create useMissionEncounters hook**

```typescript
// src/hooks/useMissionEncounters.ts
import { useMemo } from 'react'
import type { EntryPhoto, Person, UnnamedCharacter } from '@/types/app'

interface MissionEncounter {
  character: UnnamedCharacter
  photoId: string
  linkedPerson: Person | null  // Set if tagged in Circle
}

export function useMissionEncounters(
  photos: EntryPhoto[],
  taggedPeople: Person[],
): MissionEncounter[] {
  return useMemo(() => {
    const encounters: MissionEncounter[] = []

    for (const photo of photos) {
      const chars = (photo.ai_analysis as any)?.unnamed_characters as UnnamedCharacter[] | undefined
      if (!chars) continue

      for (const char of chars) {
        // Try to match with tagged people by fuzzy description overlap
        // This is intentionally simple — exact matching is done manually by the user
        const linked = taggedPeople.find(p => {
          if (!p.notes) return false
          // Check if the person's notes mention the role or description
          const combined = `${p.notes} ${p.labels?.join(' ') ?? ''}`.toLowerCase()
          return combined.includes(char.role.toLowerCase())
        })

        encounters.push({ character: char, photoId: photo.id, linkedPerson: linked ?? null })
      }
    }

    return encounters
  }, [photos, taggedPeople])
}
```

- [ ] **Step 3: Add encounters section to MissionDossier**

After the verdict section, before the intelligence report:

```typescript
// If there are unnamed characters detected across all photos:
{encounters.length > 0 && (
  <section className="px-4 py-6 border-t border-ivory/5">
    <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-ivory/30 mb-3">
      Ledger of Encounters
    </h3>
    <div className="space-y-3">
      {encounters.map((enc, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-ivory/5 border border-ivory/10 flex items-center justify-center shrink-0">
            {enc.linkedPerson?.photo_url ? (
              <img src={enc.linkedPerson.photo_url} className="w-full h-full rounded-full object-cover" alt="" />
            ) : (
              <span className="text-ivory/20 text-xs">?</span>
            )}
          </div>
          <div>
            <p className="text-ivory/80 font-body text-sm">
              {enc.linkedPerson ? (
                <a href={`/circle/${enc.linkedPerson.id}`} className="text-gold hover:underline">
                  {enc.linkedPerson.name}
                </a>
              ) : (
                <span className="italic text-ivory/40">{enc.character.description}</span>
              )}
            </p>
            <p className="text-[10px] font-body text-ivory/30">
              {enc.character.role}{enc.character.approximate_age ? ` · ${enc.character.approximate_age}` : ''}
            </p>
          </div>
        </div>
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 4: Update analyze-mission-photos prompt to detect unnamed characters**

In the Gemini analysis prompt, add:

```
If there are non-Gent people visible in the photo, describe them briefly:
"unnamed_characters": [
  { "description": "A bartender in a black apron", "role": "bartender", "approximate_age": "mid-30s", "distinguishing": "tall, beard, glasses" }
]
Only include people who play a visible role in the scene (serving, talking to The Gents, etc.). Skip crowds/background passersby.
```

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useMissionEncounters.ts src/components/mission/MissionDossier.tsx src/types/app.ts supabase/functions/analyze-mission-photos/index.ts
git commit -m "feat(mission): Ledger of Encounters — unnamed characters with retroactive Circle linking"
```

---

### Task 7.6: Soundtrack Integration

**Files:**
- Create: `src/components/mission/SoundtrackPicker.tsx`
- Modify: `src/components/chronicle/forms/MissionForm.tsx` (add soundtrack field)
- Modify: `src/types/app.ts` (add `MissionSoundtrack` type)
- Modify: `supabase/functions/generate-mission-narrative/index.ts` (adapt prose style to soundtrack mood)

**Concept:** Optional field during mission creation or editing. User can set a genre/mood per day (e.g., "jazz", "electronic", "acoustic") or a playlist name. The AI adapts its prose style — jazz gets smoky, syncopated language; electronic gets kinetic, pulse-driven; acoustic gets warm, intimate. Stored in `entry.metadata.soundtrack`.

- [ ] **Step 1: Define type**

In `src/types/app.ts`:

```typescript
export interface MissionSoundtrack {
  overall_mood?: string    // "jazz", "electronic", "acoustic", "rock", "ambient"
  per_day?: Record<string, string>  // { "2026-03-14": "jazz", "2026-03-15": "electronic" }
  playlist_name?: string   // "Budapest Nights — Spotify"
}
```

- [ ] **Step 2: Create SoundtrackPicker**

```typescript
// src/components/mission/SoundtrackPicker.tsx
import { useState } from 'react'
import { cn } from '@/lib/utils'

const MOODS = [
  { id: 'jazz', label: 'Jazz', icon: '♪' },
  { id: 'electronic', label: 'Electronic', icon: '◈' },
  { id: 'acoustic', label: 'Acoustic', icon: '○' },
  { id: 'rock', label: 'Rock', icon: '◆' },
  { id: 'ambient', label: 'Ambient', icon: '∿' },
  { id: 'hiphop', label: 'Hip-Hop', icon: '◉' },
  { id: 'classical', label: 'Classical', icon: '♯' },
] as const

interface Props {
  value: string | undefined
  onChange: (mood: string) => void
}

export function SoundtrackPicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-2 block">
        Soundtrack Mood (shapes narrative voice)
      </label>
      <div className="flex flex-wrap gap-2">
        {MOODS.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(value === m.id ? '' : m.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-body font-semibold border transition-colors',
              value === m.id
                ? 'bg-gold/15 text-gold border-gold/30'
                : 'text-ivory/40 border-ivory/10 hover:text-ivory/60',
            )}
          >
            <span className="mr-1">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add to MissionForm**

In `MissionForm.tsx`, after the mood tags section:

```typescript
import { SoundtrackPicker } from '@/components/mission/SoundtrackPicker'

// In form state:
const [soundtrackMood, setSoundtrackMood] = useState(
  (initialData?.metadata?.soundtrack as MissionSoundtrack)?.overall_mood ?? ''
)

// In render, after mood tags:
<SoundtrackPicker value={soundtrackMood} onChange={setSoundtrackMood} />

// In submit, add to metadata:
metadata: { ...metadata, soundtrack: { overall_mood: soundtrackMood || undefined } }
```

- [ ] **Step 4: Add soundtrack-aware prose directives to narrative edge function**

In `supabase/functions/generate-mission-narrative/index.ts`, before the main prompt:

```typescript
const soundtrack = entry.metadata?.soundtrack as { overall_mood?: string } | undefined
const soundtrackDirective = soundtrack?.overall_mood
  ? {
      jazz: 'Let the prose swing — syncopated rhythms, smoky imagery, notes that linger. The sentences should feel like a late-night set: unhurried, warm, occasionally surprising.',
      electronic: 'The prose pulses — kinetic, precise, propulsive. Short sentences that build. The city is a circuit board and the night is voltage.',
      acoustic: 'Write with warmth and intimacy. The sentences are unhurried, wooden, resonant. Close-up details, soft lighting, the kind of prose that sounds good read aloud in a quiet room.',
      rock: 'Raw energy in the prose. Bold declarations, vivid physical details, volume. These sentences do not ask permission.',
      ambient: 'The prose drifts — atmospheric, textured, contemplative. Long vowels, soft focus, the space between moments matters as much as the moments themselves.',
      hiphop: 'Rhythmic, confident prose with internal cadence. Bold metaphors, cultural references, swagger balanced with observation. The sentences have bars.',
      classical: 'Structured, elevated prose with measured pacing. Rich vocabulary, formal-but-not-stiff constructions, a sense of composition and deliberate beauty.',
    }[soundtrack.overall_mood] ?? ''
  : ''

// Insert into the main prompt:
${soundtrackDirective ? `\nNarrative voice: ${soundtrackDirective}` : ''}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/mission/SoundtrackPicker.tsx src/components/chronicle/forms/MissionForm.tsx src/types/app.ts supabase/functions/generate-mission-narrative/index.ts
git commit -m "feat(mission): Soundtrack integration — mood picker shapes AI narrative voice"
```

---

### Task 7.7: Video Audio Intelligence

**Files:**
- Modify: `src/lib/videoKeyframes.ts` (add audio extraction)
- Create: `src/lib/audioAnalysis.ts` (client-side audio metadata)
- Modify: `supabase/functions/analyze-mission-photos/index.ts` (accept audio clips for Gemini analysis)

**Concept:** When a video is uploaded, in addition to keyframe extraction, we extract a short audio clip (first 15 seconds). This audio is sent to Gemini Flash (which handles audio natively) for analysis: ambient music detection, language identification, noise level estimation. Results enrich the scene narrative ("the bar was playing jazz", "Hungarian chatter in the background").

- [ ] **Step 1: Add audio extraction to videoKeyframes.ts**

```typescript
/**
 * Extract a short audio clip from a video file.
 * Returns a WAV Blob of the first `durationSeconds` of audio.
 */
export async function extractAudioClip(
  videoFile: File,
  durationSeconds = 15,
): Promise<Blob | null> {
  // Use AudioContext to decode and extract audio
  try {
    const arrayBuffer = await videoFile.arrayBuffer()
    const audioCtx = new AudioContext()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

    // Take first N seconds
    const sampleRate = audioBuffer.sampleRate
    const numSamples = Math.min(
      sampleRate * durationSeconds,
      audioBuffer.length,
    )

    // Create offline context to render the audio
    const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate)
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineCtx.destination)
    source.start(0, 0, durationSeconds)

    const rendered = await offlineCtx.startRendering()
    const channelData = rendered.getChannelData(0)

    // Encode as WAV
    return encodeWav(channelData, sampleRate)
  } catch {
    return null // Video may not have audio track
  }
}

/** Encode Float32Array PCM data as a WAV Blob */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)       // PCM
  view.setUint16(22, 1, true)       // Mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  // PCM data
  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}
```

- [ ] **Step 2: Create audio analysis metadata type**

In `src/types/app.ts`:

```typescript
export interface AudioIntelligence {
  has_music: boolean
  music_genre?: string         // "jazz", "electronic", "pop", etc.
  music_description?: string   // "soft piano jazz playing in background"
  ambient_noise: 'quiet' | 'moderate' | 'loud' | 'very_loud'
  languages_detected?: string[] // ["Hungarian", "English"]
  description: string          // "Lively bar atmosphere with jazz piano and Hungarian conversation"
}
```

Extend `PhotoAnalysis` (used for video keyframes too):

```typescript
export interface PhotoAnalysis {
  // ...existing fields
  audio_intel?: AudioIntelligence  // Only present for video-derived frames
}
```

- [ ] **Step 3: Add audio analysis to edge function**

In `analyze-mission-photos`, when a batch includes audio data:

```typescript
// If the request includes audio clips (base64 WAV), analyze them with Gemini
if (audioBase64) {
  const audioPrompt = `Analyze this audio clip from a travel video. Return JSON:
{
  "has_music": true/false,
  "music_genre": "jazz" (if music detected, null otherwise),
  "music_description": "soft piano jazz playing in background",
  "ambient_noise": "quiet|moderate|loud|very_loud",
  "languages_detected": ["Hungarian", "English"],
  "description": "One-sentence description of the audio atmosphere"
}`

  // Gemini supports audio/wav inline
  const audioContent = [
    { inlineData: { mimeType: 'audio/wav', data: audioBase64 } },
    { text: audioPrompt },
  ]
  // ...call Gemini with audio content
}
```

- [ ] **Step 4: Feed audio intel into narrative generation**

In `generate-mission-narrative`, when scenes have audio intelligence:

```typescript
// For scenes with audio intel (from videos):
const audioContext = scene.audioIntel
  ? `Audio atmosphere: ${scene.audioIntel.description}${scene.audioIntel.music_description ? `. Music: ${scene.audioIntel.music_description}` : ''}`
  : ''

// Add to per-scene prompt context
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/videoKeyframes.ts src/lib/audioAnalysis.ts src/types/app.ts supabase/functions/analyze-mission-photos/index.ts supabase/functions/generate-mission-narrative/index.ts
git commit -m "feat(mission): video audio intelligence — music detection, ambient noise, language identification"
```

---

## Summary of Changes

| Layer | What Changed |
|-------|-------------|
| **Database** | `entry_photos` gets `gps_lat`, `gps_lng`, `ai_analysis` columns |
| **Client Logic** | New `sceneEngine.ts` (clustering), `videoKeyframes.ts` (keyframes + audio), `routeBuilder.ts`, `missionIntelBuilder.ts`, `audioAnalysis.ts` |
| **AI Client** | New `missionIntel.ts` (photo analysis orchestrator), `missionLore.ts` (narrative orchestrator + single-scene regen) |
| **Edge Functions** | New `analyze-mission-photos` (Gemini vision + audio), `generate-mission-narrative` (Claude narrative, full + single-scene mode) |
| **UI Components** | 14 new mission components: DossierVisaCard, DayChapter, SceneCard, SceneEditor, RouteMap, TripTempoGraph, MissionVerdict, EphemeraGallery, DayStickyNav, HighlightReel, GentPresenceBar, GentPerspectives, SoundtrackPicker, MissionProcessingOverlay |
| **Entry Creation** | Full staged pipeline with progress overlay, video support, soundtrack mood picker |
| **Data Model** | `entry.metadata.mission_intel` holds complete dossier (scenes, days, routes, ephemera, verdict, tempo, gent notes, encounters, soundtrack) |
| **Story System** | Auto-creation deprecated for missions; manual story arcs unchanged |
| **Cross-Mission** | Previous trips to same city referenced in narrative; Gent scene perspectives; retroactive encounter linking |
| **Audio** | Video audio clips analyzed for music, language, ambient noise — enriches scene narratives |
