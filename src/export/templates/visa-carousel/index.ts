export { VisaCardSlide } from './VisaCardSlide'
export { HeroLoreSlide } from './HeroLoreSlide'
export { PhotoGridSlide } from './PhotoGridSlide'
export { DebriefSlide } from './DebriefSlide'
export { StampSlide } from './StampSlide'
export { DayPolaroidSlide } from './DayPolaroidSlide'

import type { EntryWithParticipants, PassportStamp, StoryDayEpisode } from '@/types/app'

export interface SlideConfig {
  id: string
  label: string
}

/**
 * Determine which slides to generate based on available content.
 * When day_episodes exist: visa card + per-day polaroid slides.
 * Fallback: visa card + hero + photo grids + debrief + stamp.
 * Max 7 slides.
 */
export function buildVisaCarouselManifest(
  entry: EntryWithParticipants,
  photoCount: number,
  stamp: PassportStamp | null,
): SlideConfig[] {
  const meta = entry.metadata as Record<string, unknown>
  const dayEpisodes = meta?.day_episodes as StoryDayEpisode[] | undefined

  // Multi-day missions: visa card + day polaroid slides
  if (dayEpisodes && dayEpisodes.length > 1) {
    const slides: SlideConfig[] = [
      { id: 'visa-card', label: 'Visa Card' },
    ]
    for (let i = 0; i < dayEpisodes.length; i++) {
      if (dayEpisodes[i].photoIds.length > 0) {
        slides.push({ id: `day-${i}`, label: dayEpisodes[i].label })
      }
    }
    return slides.slice(0, 7)
  }

  // Fallback: original structure for non-mission or single-day entries
  const slides: SlideConfig[] = [
    { id: 'visa-card', label: 'Visa Card' },
    { id: 'hero-lore', label: 'Hero + Lore' },
  ]

  const availablePhotos = Math.max(0, photoCount - 1)
  const photoSlideCount = Math.min(3, Math.ceil(availablePhotos / 4))
  for (let i = 0; i < photoSlideCount; i++) {
    slides.push({ id: `photo-grid-${i}`, label: `Photos ${i + 1}` })
  }

  if (meta?.mission_debrief) {
    slides.push({ id: 'debrief', label: 'Intelligence Report' })
  }

  if (stamp?.image_url) {
    slides.push({ id: 'stamp', label: 'Mission Stamp' })
  }

  return slides.slice(0, 7)
}
