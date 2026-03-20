/**
 * Day boundary logic — a "day" runs 05:01 to 05:00 next calendar day.
 * Photos taken at 02:30 Saturday belong to Friday's episode.
 */

const DAY_CUTOFF_HOUR = 5

/** Given an ISO date and optional HH:MM time, return the "logical day" YYYY-MM-DD */
export function logicalDay(date: string, time?: string | null): string {
  if (!time) return date
  const hour = parseInt(time.split(':')[0], 10)
  if (isNaN(hour) || hour >= DAY_CUTOFF_HOUR) return date
  // Before 3am → belongs to previous calendar day
  const d = new Date(date + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().split('T')[0]
}

export interface DayEpisode {
  day: string       // YYYY-MM-DD (logical day)
  label: string     // "Day 1 — Friday, 14 March"
  photoIds: string[]
}

/** Group photos into day episodes using 3am boundary */
export function groupIntoDays(
  photos: Array<{ id: string; exifDate?: string | null; exifTime?: string | null }>,
  startDate: string,
  endDate?: string | null,
): DayEpisode[] {
  // Build day map
  const dayMap = new Map<string, string[]>()

  for (const photo of photos) {
    const day = logicalDay(photo.exifDate ?? startDate, photo.exifTime)
    if (!dayMap.has(day)) dayMap.set(day, [])
    dayMap.get(day)!.push(photo.id)
  }

  // If no photos have EXIF dates but we have a date range, create empty day shells
  if (dayMap.size === 0 && endDate) {
    const s = new Date(startDate + 'T12:00:00Z')
    const e = new Date(endDate + 'T12:00:00Z')
    while (s <= e) {
      dayMap.set(s.toISOString().split('T')[0], [])
      s.setUTCDate(s.getUTCDate() + 1)
    }
  }

  // Sort days chronologically and build episodes
  const sortedDays = Array.from(dayMap.keys()).sort()
  return sortedDays.map((day, i) => ({
    day,
    label: formatDayLabel(i + 1, day),
    photoIds: dayMap.get(day) ?? [],
  }))
}

export function formatDayLabel(num: number, date: string): string {
  const d = new Date(date + 'T12:00:00Z')
  const weekday = d.toLocaleDateString('en-GB', { weekday: 'long', timeZone: 'UTC' })
  const dayMonth = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })
  return `Day ${num} — ${weekday}, ${dayMonth}`
}
