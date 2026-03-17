export { VisaCardSlide } from './VisaCardSlide'
export { HeroLoreSlide } from './HeroLoreSlide'
export { PhotoGridSlide } from './PhotoGridSlide'
export { DebriefSlide } from './DebriefSlide'
export { StampSlide } from './StampSlide'

import type { EntryWithParticipants, PassportStamp } from '@/types/app'

export interface SlideConfig {
  id: string
  label: string
}

/**
 * Determine which slides to generate based on available content.
 * Returns ordered array of slide configs. Max 7 slides.
 */
export function buildVisaCarouselManifest(
  entry: EntryWithParticipants,
  photoCount: number,
  stamp: PassportStamp | null,
): SlideConfig[] {
  const slides: SlideConfig[] = [
    { id: 'visa-card', label: 'Visa Card' },
    { id: 'hero-lore', label: 'Hero + Lore' },
  ]

  // Photo grid slides: 4 photos per slide, max 3 slides, skip first photo (hero)
  const availablePhotos = Math.max(0, photoCount - 1)
  const photoSlideCount = Math.min(3, Math.ceil(availablePhotos / 4))
  for (let i = 0; i < photoSlideCount; i++) {
    slides.push({ id: `photo-grid-${i}`, label: `Photos ${i + 1}` })
  }

  const meta = entry.metadata as Record<string, unknown>
  if (meta?.mission_debrief) {
    slides.push({ id: 'debrief', label: 'Intelligence Report' })
  }

  if (stamp?.image_url) {
    slides.push({ id: 'stamp', label: 'Mission Stamp' })
  }

  return slides.slice(0, 7)
}
