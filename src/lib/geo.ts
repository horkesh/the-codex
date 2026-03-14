import exifr from 'exifr'

export interface DetectedLocation {
  city?: string
  country?: string
  country_code?: string
  location?: string
  date?: string
}

/**
 * Reads EXIF GPS + datetime from a photo and reverse-geocodes via Nominatim.
 * Returns null if no useful data is found.
 */
export async function extractLocationFromPhoto(file: File): Promise<DetectedLocation | null> {
  try {
    const exif = await exifr.parse(file, { gps: true, pick: ['DateTimeOriginal'] })
    if (!exif) return null

    const result: DetectedLocation = {}

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
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${exif.latitude}&lon=${exif.longitude}&format=json&zoom=10`,
        { headers: { 'User-Agent': 'TheGentsChronicles/1.0' } },
      )
      if (res.ok) {
        const data = await res.json()
        const addr = data.address ?? {}
        result.city = addr.city || addr.town || addr.village || addr.municipality
        result.country = addr.country
        result.country_code = addr.country_code?.toUpperCase()
        // First token of display_name as the specific venue hint
        const first = data.display_name?.split(',')[0]?.trim()
        if (first) result.location = first
      }
    }

    return (result.date || result.city || result.country) ? result : null
  } catch {
    return null
  }
}
