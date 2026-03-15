import exifr from 'exifr'

export interface LocationFill {
  city?: string
  country?: string
  country_code?: string
  location?: string
  date?: string
  lat?: number
  lng?: number
  /** Set when the GPS coords matched a saved Place within 200m. */
  matchedPlaceName?: string
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
 * Reverse geocodes a lat/lng pair via Nominatim. Returns null on failure.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoAddress | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14`,
      { headers: { 'User-Agent': 'TheGentsChronicles/1.0' } },
    )
    if (!res.ok) return null
    const data = await res.json()
    const addr = data.address ?? {}
    return {
      city: addr.city || addr.town || addr.village || addr.municipality,
      country: addr.country,
      country_code: addr.country_code?.toUpperCase(),
      address: [addr.road, addr.house_number].filter(Boolean).join(' ') || undefined,
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
 * Reads EXIF GPS + datetime from a photo and reverse-geocodes via Nominatim.
 * Returns null if no useful data is found.
 * Includes lat/lng so the caller can do proximity checks against saved places.
 */
export async function extractLocationFromPhoto(file: File): Promise<LocationFill | null> {
  try {
    const exif = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal'] })
    if (!exif) return null

    const result: LocationFill = {}

    // EXIF date: "YYYY:MM:DD HH:MM:SS" — normalize to ISO before parsing
    if (exif.DateTimeOriginal) {
      const raw = exif.DateTimeOriginal instanceof Date
        ? exif.DateTimeOriginal.toISOString()
        : String(exif.DateTimeOriginal).replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3')
      const d = new Date(raw)
      if (!isNaN(d.getTime())) result.date = d.toISOString().split('T')[0]
    }

    // GPS reverse geocoding
    if (typeof exif.latitude === 'number' && typeof exif.longitude === 'number') {
      result.lat = exif.latitude
      result.lng = exif.longitude

      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${exif.latitude}&lon=${exif.longitude}&format=json&zoom=18`,
        { headers: { 'User-Agent': 'TheGentsChronicles/1.0' } },
      )
      if (res.ok) {
        const data = await res.json()
        const addr = data.address ?? {}
        result.city = addr.city || addr.town || addr.village || addr.municipality
        result.country = addr.country
        result.country_code = addr.country_code?.toUpperCase()
        // Prefer the named POI fields Nominatim returns at zoom=18 (amenity, leisure,
        // tourism, shop) over display_name which can be a street address instead.
        const poiName = addr.amenity || addr.leisure || addr.tourism || addr.shop
        const first = data.display_name?.split(',')[0]?.trim()
        const location = poiName || first
        if (location) result.location = location
        console.debug('[geo] Nominatim addr:', addr, '→ location:', location)
      }
    }

    return (result.date || result.city || result.country) ? result : null
  } catch {
    return null
  }
}
