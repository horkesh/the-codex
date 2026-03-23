import exifr from 'exifr'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined

export interface LocationFill {
  city?: string
  country?: string
  country_code?: string
  location?: string
  date?: string
  /** Local time extracted from EXIF DateTimeOriginal, format HH:MM */
  time?: string
  lat?: number
  lng?: number
  /** Set when the GPS coords matched a saved Place within 200m. */
  matchedPlaceName?: string
  /** Full street address from Google Places formattedAddress */
  address?: string
  /** Date from the last photo's EXIF (for mission end-date auto-fill) */
  lastPhotoDate?: string
  /** If true, overwrite existing form values. If false/undefined, only fill empty fields. */
  overwrite?: boolean
}

export interface GeoAddress {
  city?: string
  country?: string
  country_code?: string
  address?: string
}

/**
 * Returns the device's current GPS position, or null if unavailable/denied.
 * Uses a cached fix up to 60s old so it resolves instantly on repeat calls.
 */
export function getDevicePosition(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null)
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 6000, maximumAge: 60_000 },
    )
  })
}

/**
 * Reverse geocodes a lat/lng pair via Google Geocoding API. Returns null on failure.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  if (!GOOGLE_MAPS_KEY) return reverseGeocodeNominatim(lat, lng)
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return reverseGeocodeNominatim(lat, lng)
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) return reverseGeocodeNominatim(lat, lng)
    return parseGoogleGeoResult(data.results)
  } catch {
    return reverseGeocodeNominatim(lat, lng)
  }
}

/** Parse Google Geocoding results into a GeoAddress. */
function parseGoogleGeoResult(results: GoogleGeoResult[]): GeoAddress {
  const addr: GeoAddress = {}
  // Scan all results for the most specific components
  for (const result of results) {
    for (const comp of result.address_components) {
      if (comp.types.includes('locality') && !addr.city) {
        addr.city = comp.long_name
      }
      if (comp.types.includes('administrative_area_level_1') && !addr.city) {
        addr.city = comp.long_name
      }
      if (comp.types.includes('country')) {
        if (!addr.country) addr.country = comp.long_name
        if (!addr.country_code) addr.country_code = comp.short_name
      }
      if (comp.types.includes('route') && !addr.address) {
        const streetNum = result.address_components.find(c => c.types.includes('street_number'))
        addr.address = streetNum
          ? `${comp.long_name} ${streetNum.long_name}`
          : comp.long_name
      }
    }
  }
  return addr
}

interface GoogleGeoResult {
  address_components: Array<{ long_name: string; short_name: string; types: string[] }>
  formatted_address: string
  types: string[]
}

/** Fallback: Nominatim reverse geocode */
async function reverseGeocodeNominatim(lat: number, lng: number): Promise<GeoAddress | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      { headers: { 'User-Agent': 'TheGentsChronicles/1.0' }, signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const a = data.address ?? {}
    return {
      city: a.city || a.town || a.village || a.municipality,
      country: a.country,
      country_code: a.country_code?.toUpperCase(),
      address: [a.road, a.house_number].filter(Boolean).join(' ') || undefined,
    }
  } catch {
    return null
  }
}

/**
 * Returns distance in metres between two lat/lng points (haversine).
 */
export function haversineMetres(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

/**
 * Google Places Nearby Search — find the nearest named POI within 150m.
 * Uses the Maps JS API PlacesService (CORS-safe) instead of the REST endpoint.
 */
export async function fetchNearestPOIGoogle(lat: number, lng: number): Promise<string | null> {
  if (!GOOGLE_MAPS_KEY) return fetchNearestPOINominatim(lat, lng)
  try {
    // Load the Google Maps JS API with Places library
    const google = await loadGoogleMapsPlaces()
    if (!google) return fetchNearestPOINominatim(lat, lng)

    // PlacesService requires a DOM element (can be a hidden div)
    const div = document.createElement('div')
    const service = new google.maps.places.PlacesService(div)
    const location = new google.maps.LatLng(lat, lng)

    return new Promise<string | null>((resolve) => {
      const timeout = setTimeout(() => resolve(fetchNearestPOINominatim(lat, lng)), 5000)
      service.nearbySearch(
        { location, radius: 150, type: 'establishment' },
        (results, status) => {
          clearTimeout(timeout)
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
            resolve(fetchNearestPOINominatim(lat, lng))
            return
          }
          // Pick the closest result
          let best: { name: string; dist: number } | null = null
          for (const place of results) {
            if (!place.name || !place.geometry?.location) continue
            const dist = haversineMetres(lat, lng, place.geometry.location.lat(), place.geometry.location.lng())
            if (!best || dist < best.dist) best = { name: place.name, dist }
          }
          resolve(best?.name ?? null)
        },
      )
    })
  } catch {
    return fetchNearestPOINominatim(lat, lng)
  }
}

/** Load the Google Maps JS API with Places library via script tag */
let _googlePromise: Promise<typeof google | null> | null = null
function loadGoogleMapsPlaces(): Promise<typeof google | null> {
  if (_googlePromise) return _googlePromise
  _googlePromise = new Promise((resolve) => {
    // Already loaded (e.g. by @vis.gl/react-google-maps)
    if (typeof google !== 'undefined' && google.maps?.places) {
      resolve(google)
      return
    }
    // Check if script is already in DOM but hasn't finished loading
    const existing = document.querySelector('script[src*="maps.googleapis.com"]') as HTMLScriptElement | null
    if (existing) {
      // Wait for it to load, then check for places
      const check = () => {
        if (typeof google !== 'undefined' && google.maps?.places) resolve(google)
        else setTimeout(check, 100)
      }
      const timeout = setTimeout(() => resolve(null), 8000)
      existing.addEventListener('load', () => { clearTimeout(timeout); check() })
      check()
      return
    }
    // Load it ourselves
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`
    script.async = true
    script.onload = () => {
      if (typeof google !== 'undefined' && google.maps?.places) resolve(google)
      else resolve(null)
    }
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
  return _googlePromise
}

/** Google reverse geocode — returns city, country, and best-effort location name. */
async function fetchDetailedReverseGoogle(lat: number, lng: number): Promise<{
  city?: string; country?: string; country_code?: string; location?: string
} | null> {
  if (!GOOGLE_MAPS_KEY) return fetchDetailedReverseNominatim(lat, lng)
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_KEY}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return fetchDetailedReverseNominatim(lat, lng)
    const data = await res.json()
    if (data.status !== 'OK' || !data.results?.length) return fetchDetailedReverseNominatim(lat, lng)

    const addr = parseGoogleGeoResult(data.results)
    // Try to get POI/establishment name from the first result
    const firstResult = data.results[0]
    const isPOI = firstResult.types?.some((t: string) =>
      ['establishment', 'point_of_interest', 'food', 'restaurant', 'bar', 'cafe'].includes(t)
    )
    const location = isPOI ? firstResult.address_components?.[0]?.long_name : undefined

    return {
      city: addr.city,
      country: addr.country,
      country_code: addr.country_code,
      location,
    }
  } catch {
    return fetchDetailedReverseNominatim(lat, lng)
  }
}

/** Fallback: Nominatim reverse geocode with location name. */
async function fetchDetailedReverseNominatim(lat: number, lng: number): Promise<{
  city?: string; country?: string; country_code?: string; location?: string
} | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18`,
      { headers: { 'User-Agent': 'TheGentsChronicles/1.0' }, signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const a = data.address ?? {}
    const poiName = a.amenity || a.leisure || a.tourism || a.shop
    const first = data.display_name?.split(',')[0]?.trim()
    return {
      city: a.city || a.town || a.village || a.municipality,
      country: a.country,
      country_code: a.country_code?.toUpperCase(),
      location: poiName || first,
    }
  } catch {
    return null
  }
}

/** Fallback: Overpass API — find the nearest named POI within 150m. */
async function fetchNearestPOINominatim(lat: number, lng: number): Promise<string | null> {
  try {
    const query = `[out:json][timeout:5];(
      node(around:150,${lat},${lng})["amenity"~"restaurant|bar|cafe|pub|nightclub|cinema|theatre|biergarten|ice_cream"];
      node(around:150,${lat},${lng})["tourism"~"hotel|hostel|guest_house|museum|attraction|viewpoint"];
      node(around:150,${lat},${lng})["leisure"~"fitness_centre|sports_centre|bowling_alley|stadium"];
      node(around:150,${lat},${lng})["shop"~"mall"];
    );out body 3;`
    const res = await fetch(
      `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
      { signal: AbortSignal.timeout(5000) },
    )
    if (!res.ok) return null
    const data = await res.json()
    const elements = data.elements as Array<{ tags?: Record<string, string>; lat: number; lon: number }> | undefined
    if (!elements?.length) return null

    let best: { name: string; dist: number } | null = null
    for (const el of elements) {
      const name = el.tags?.name
      if (!name) continue
      const dist = haversineMetres(lat, lng, el.lat, el.lon)
      if (!best || dist < best.dist) best = { name, dist }
    }
    return best?.name ?? null
  } catch {
    return null
  }
}

/**
 * Forward geocode a city name to coordinates using Google Geocoding API.
 * Falls back to Nominatim if Google key is not set.
 */
export async function forwardGeocode(city: string, country?: string): Promise<[number, number] | null> {
  if (GOOGLE_MAPS_KEY) {
    try {
      const q = country ? `${city}, ${country}` : city
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(q)}&key=${GOOGLE_MAPS_KEY}`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'OK' && data.results?.[0]?.geometry?.location) {
          const { lat, lng } = data.results[0].geometry.location
          return [lat, lng]
        }
      }
    } catch { /* fall through to Nominatim */ }
  }
  // Nominatim fallback
  try {
    const countryParam = country ? `&country=${encodeURIComponent(country)}` : ''
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(city)}${countryParam}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(5000) },
    )
    const results = await res.json() as Array<{ lat: string; lon: string }>
    if (results[0]) return [parseFloat(results[0].lat), parseFloat(results[0].lon)]
  } catch { /* silent */ }
  return null
}

/**
 * Reverse geocode for Whereabouts — returns neighborhood + city string.
 */
export async function reverseGeocodeNeighborhood(lat: number, lng: number): Promise<string> {
  if (GOOGLE_MAPS_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=neighborhood|sublocality|locality&key=${GOOGLE_MAPS_KEY}`,
        { signal: AbortSignal.timeout(5000) },
      )
      if (res.ok) {
        const data = await res.json()
        if (data.status === 'OK' && data.results?.length) {
          const parts: string[] = []
          for (const comp of data.results[0].address_components) {
            if (comp.types.includes('neighborhood') || comp.types.includes('sublocality')) {
              parts.unshift(comp.long_name)
            } else if (comp.types.includes('locality')) {
              parts.push(comp.long_name)
            }
          }
          if (parts.length) return parts.join(', ')
        }
      }
    } catch { /* fall through */ }
  }
  // Nominatim fallback
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=12`,
      { headers: { 'User-Agent': 'TheGentsChronicles/1.0' }, signal: AbortSignal.timeout(5000) },
    )
    const data = await res.json()
    const suburb = data.address?.suburb || data.address?.neighbourhood || data.address?.quarter
    const city = data.address?.city || data.address?.town || data.address?.village
    return [suburb, city].filter(Boolean).join(', ') || 'Unknown location'
  } catch {
    return 'Unknown location'
  }
}

/**
 * Reads EXIF GPS + datetime from a photo and reverse-geocodes via Google (or Nominatim fallback) + POI lookup.
 * Returns null if no useful data is found.
 * Includes lat/lng so the caller can do proximity checks against saved places.
 */
export async function extractLocationFromPhoto(file: File): Promise<LocationFill | null> {
  try {
    const exif = await exifr.parse(file, { gps: true, tiff: true, exif: true, xmp: false, iptc: false, jfif: false, ihdr: false, icc: false })
    if (!exif) return null

    const result: LocationFill = {}

    // EXIF date: "YYYY:MM:DD HH:MM:SS" — normalize to ISO before parsing
    if (exif.DateTimeOriginal) {
      const raw = exif.DateTimeOriginal instanceof Date
        ? exif.DateTimeOriginal.toISOString()
        : String(exif.DateTimeOriginal).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
      const d = new Date(raw)
      if (!isNaN(d.getTime())) result.date = d.toISOString().split('T')[0]
      const timeMatch = raw.match(/[T ](\d{2}):(\d{2})/)
      if (timeMatch) result.time = `${timeMatch[1]}:${timeMatch[2]}`
    }

    // GPS reverse geocoding + POI lookup (parallel)
    if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number') {
      result.lat = exif.latitude
      result.lng = exif.longitude

      const [geoResult, poiResult] = await Promise.all([
        fetchDetailedReverseGoogle(exif.latitude, exif.longitude),
        fetchNearestPOIGoogle(exif.latitude, exif.longitude),
      ])

      if (geoResult) {
        result.city = geoResult.city
        result.country = geoResult.country
        result.country_code = geoResult.country_code
        result.location = poiResult ?? geoResult.location
        console.debug('[geo] Reverse:', geoResult.location, '| POI:', poiResult, '→', result.location)
      }
    }

    return (result.date || result.city || result.country) ? result : null
  } catch {
    return null
  }
}

/**
 * Batch reverse geocode an array of GPS points.
 * Clusters points within 50m of each other, geocodes only one point per cluster,
 * then maps every input point back to its cluster result.
 *
 * Returns a Map keyed by "lat.toFixed(6),lng.toFixed(6)".
 */
export async function batchReverseGeocode(
  points: { lat: number; lng: number }[],
): Promise<Map<string, { city: string; country: string; country_code: string; venue: string | null }>> {
  const result = new Map<string, { city: string; country: string; country_code: string; venue: string | null }>()
  if (!points.length) return result

  // --- Cluster: assign each point to the first existing cluster within 50m ---
  type Cluster = {
    centroid: { lat: number; lng: number }
    keys: string[]
  }
  const clusters: Cluster[] = []

  for (const pt of points) {
    const key = `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`
    let assigned = false
    for (const cluster of clusters) {
      if (haversineMetres(pt.lat, pt.lng, cluster.centroid.lat, cluster.centroid.lng) <= 50) {
        cluster.keys.push(key)
        assigned = true
        break
      }
    }
    if (!assigned) {
      clusters.push({ centroid: { lat: pt.lat, lng: pt.lng }, keys: [key] })
    }
  }

  // --- Geocode each cluster centroid ---
  for (let i = 0; i < clusters.length; i++) {
    if (i > 0) {
      // 100ms rate-limit delay between calls
      await new Promise<void>((resolve) => setTimeout(resolve, 100))
    }
    const { centroid, keys } = clusters[i]
    try {
      const [geo, venue] = await Promise.all([
        reverseGeocode(centroid.lat, centroid.lng),
        fetchNearestPOIGoogle(centroid.lat, centroid.lng),
      ])
      const entry = {
        city: geo?.city ?? '',
        country: geo?.country ?? '',
        country_code: geo?.country_code ?? '',
        venue: venue ?? null,
      }
      for (const key of keys) {
        result.set(key, entry)
      }
    } catch {
      // Non-critical — skip failed clusters silently
    }
  }

  return result
}

/** Extract only the EXIF date from a photo (no geocoding). */
export async function extractExifDate(file: File): Promise<string | null> {
  try {
    const exif = await exifr.parse(file, ['DateTimeOriginal'])
    if (!exif?.DateTimeOriginal) return null
    const raw = exif.DateTimeOriginal instanceof Date
      ? exif.DateTimeOriginal.toISOString()
      : String(exif.DateTimeOriginal).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
    const d = new Date(raw)
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0]
  } catch {
    return null
  }
}

