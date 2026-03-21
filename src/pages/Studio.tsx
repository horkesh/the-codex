import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { fetchAllStats } from '@/data/stats'
import { useThresholds } from '@/hooks/useThresholds'
import type { GentStats, GentAlias } from '@/types/app'
import { motion, AnimatePresence } from 'framer-motion'
import { ImageIcon, Share2, Sparkles, Camera, Award, ChevronLeft, ChevronRight } from 'lucide-react'

import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { Button, Spinner, OnboardingTip } from '@/components/ui'
import { useUIStore } from '@/store/ui'
import { fetchEntries, fetchEntry as fetchEntryFull, fetchEntryPhotos } from '@/data/entries'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { PhotoFilterContext, getFilter } from '@/lib/photoFilters'
import { getStoredFilter } from '@/hooks/useEntryFilter'
import { formatDate } from '@/lib/utils'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations'
import { exportAndShare } from '@/export/exporter'
import { generateTemplateBg } from '@/ai/templateBg'
import type { Entry, EntryWithParticipants } from '@/types/app'

// Template imports
import { NightOutCard } from '@/export/templates/NightOutCard'
import { MissionCarousel } from '@/export/templates/MissionCarousel'
import { SteakVerdict } from '@/export/templates/SteakVerdict'
import { IftarCard } from '@/export/templates/IftarCard'
import { EidCard } from '@/export/templates/EidCard'
import { PS5MatchCard } from '@/export/templates/PS5MatchCard'
import { GatheringInviteCard } from '@/export/templates/GatheringInviteCard'
import { CountdownCard } from '@/export/templates/CountdownCard'
import { ToastCard } from '@/export/templates/ToastCard'
import { ToastSessionCard } from '@/export/templates/ToastSessionCard'
import { InterludeCard } from '@/export/templates/InterludeCard'
import { LiveMusicCard } from '@/export/templates/LiveMusicCard'
import { DebriefPage } from '@/export/templates/DebriefPage'
import { PassportIdPage } from '@/export/templates/PassportIdPage'
import { GatheringRecap } from '@/export/templates/GatheringRecap'
import { WrappedCard } from '@/export/templates/WrappedCard'
import { RivalryCard } from '@/export/templates/RivalryCard'
import { AchievementCard } from '@/export/templates/AchievementCard'
import { YearInReview } from '@/export/templates/YearInReview'
import { fetchEarnedAchievements } from '@/data/achievements'
import type { EarnedAchievement } from '@/data/achievements'
import { VisaCardSlide, HeroLoreSlide, PhotoGridSlide, DebriefSlide, StampSlide, DayPolaroidSlide, buildVisaCarouselManifest } from '@/export/templates/visa-carousel'
import { ToastCarouselPreview } from '@/export/templates/toast-carousel'
import { fetchStampByEntryId } from '@/data/stamps'
import { exportMultipleToPng, shareMultipleImages } from '@/export/exporter'
import { useAuthStore } from '@/store/auth'
import { useToastSession } from '@/hooks/useToastSession'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TemplateId =
  | 'night_out_card' | 'night_out_card_v2' | 'night_out_card_v3' | 'night_out_card_v4'
  | 'live_music_v1' | 'live_music_v2' | 'live_music_v3' | 'live_music_v4'
  | 'mission_carousel' | 'mission_carousel_v2' | 'mission_carousel_v3' | 'mission_carousel_v4'
  | 'steak_verdict' | 'steak_verdict_v2' | 'steak_verdict_v3' | 'steak_verdict_v4'
  | 'iftar_card' | 'iftar_card_v2' | 'iftar_card_v3' | 'iftar_card_v4'
  | 'eid_card'
  | 'ps5_match_card' | 'ps5_match_card_v2' | 'ps5_match_card_v3' | 'ps5_match_card_v4'
  | 'gathering_invite'
  | 'countdown'
  | 'toast_card' | 'toast_card_v2' | 'toast_card_v3' | 'toast_card_v4'
  | 'toast_session_v1' | 'toast_session_v2' | 'toast_session_v3' | 'toast_session_v4'
  | 'toast_carousel'
  | 'interlude_card'
  | 'debrief_page'
  | 'passport_id_page'
  | 'gathering_recap'
  | 'wrapped_card'
  | 'rivalry_card'
  | 'achievement_card'
  | 'visa_carousel'
  | 'year_in_review'

interface TemplateConfig {
  id: TemplateId
  label: string
  dims: string
  /** Which aspect ratio to pass when generating an AI background */
  bgAspect?: '1:1' | '3:4' | '9:16'
  /** Only show this template when the entry has this metadata.flavour */
  requiresFlavour?: string
}

// ---------------------------------------------------------------------------
// Template map — which templates are available per entry type
// ---------------------------------------------------------------------------

const TEMPLATES_BY_TYPE: Record<string, TemplateConfig[]> = {
  night_out: [
    { id: 'night_out_card',    label: 'Classic',       dims: '1080×1350', bgAspect: '3:4' },
    { id: 'night_out_card_v2', label: 'Bold',          dims: '1080×1350', bgAspect: '3:4' },
    { id: 'night_out_card_v3', label: 'Quote',         dims: '1080×1350', bgAspect: '3:4' },
    { id: 'night_out_card_v4', label: 'Date Stamp',    dims: '1080×1350', bgAspect: '3:4' },
    { id: 'live_music_v1',    label: 'Marquee',       dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'live_music' },
    { id: 'live_music_v2',    label: 'Poster',        dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'live_music' },
    { id: 'live_music_v3',    label: 'Setlist',       dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'live_music' },
    { id: 'live_music_v4',    label: 'Vinyl',         dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'live_music' },
  ],
  mission: [
    { id: 'mission_carousel',    label: 'Classic',     dims: '1080×1350', bgAspect: '3:4' },
    { id: 'mission_carousel_v2', label: 'Bold City',   dims: '1080×1350', bgAspect: '3:4' },
    { id: 'mission_carousel_v3', label: 'Passport',    dims: '1080×1350', bgAspect: '3:4' },
    { id: 'mission_carousel_v4', label: 'Overlay',     dims: '1080×1350', bgAspect: '3:4' },
    { id: 'visa_carousel',        label: 'Visa Carousel', dims: '1080×1350', bgAspect: '3:4' },
    { id: 'debrief_page',        label: 'Debrief Notes', dims: '1080×1350', bgAspect: '3:4' },
  ],
  steak: [
    { id: 'steak_verdict',    label: 'Classic',        dims: '1080×1350', bgAspect: '3:4' },
    { id: 'steak_verdict_v2', label: 'Score Hero',     dims: '1080×1350', bgAspect: '3:4' },
    { id: 'steak_verdict_v3', label: 'Minimal',        dims: '1080×1350', bgAspect: '3:4' },
    { id: 'steak_verdict_v4', label: 'Cut Forward',    dims: '1080×1350', bgAspect: '3:4' },
    { id: 'iftar_card',       label: 'Crescent',       dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'iftar' },
    { id: 'iftar_card_v2',    label: 'Spread',         dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'iftar' },
    { id: 'iftar_card_v3',    label: 'Contemplative',  dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'iftar' },
    { id: 'iftar_card_v4',    label: 'Gathering',      dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'iftar' },
    { id: 'eid_card',         label: 'Bajram',         dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'eid' },
  ],
  playstation: [
    { id: 'ps5_match_card',    label: 'Scoreboard',    dims: '1080×1350', bgAspect: '3:4' },
    { id: 'ps5_match_card_v2', label: 'Winner',        dims: '1080×1350', bgAspect: '3:4' },
    { id: 'ps5_match_card_v3', label: 'Quote',         dims: '1080×1350', bgAspect: '3:4' },
    { id: 'ps5_match_card_v4', label: 'Stats Grid',    dims: '1080×1350', bgAspect: '3:4' },
  ],
  gathering: [
    { id: 'gathering_invite', label: 'Invite Card',    dims: '1080×1350', bgAspect: '3:4' },
    { id: 'countdown',        label: 'Countdown',      dims: '1080×1350', bgAspect: '3:4' },
    { id: 'gathering_recap',  label: 'Recap',          dims: '1080×1350', bgAspect: '3:4' },
  ],
  toast: [
    { id: 'toast_card',       label: 'Classic',        dims: '1080×1350', bgAspect: '3:4' },
    { id: 'toast_card_v2',    label: 'Cocktail Menu',  dims: '1080×1350', bgAspect: '3:4' },
    { id: 'toast_card_v3',    label: 'Quote',          dims: '1080×1350', bgAspect: '3:4' },
    { id: 'toast_card_v4',    label: 'Date Stamp',     dims: '1080×1350', bgAspect: '3:4' },
    { id: 'toast_session_v1', label: 'Session Classic', dims: '1080×1350', bgAspect: '3:4' },
    { id: 'toast_session_v2', label: 'Session Centered', dims: '1080×1350', bgAspect: '3:4' },
    { id: 'toast_session_v3', label: 'Session Quote',   dims: '1080×1350', bgAspect: '3:4' },
    { id: 'toast_session_v4', label: 'Session Code',    dims: '1080×1350', bgAspect: '3:4' },
    { id: 'toast_carousel',   label: 'Carousel',         dims: '1080×1350', bgAspect: '3:4' },
  ],
  interlude:   [{ id: 'interlude_card',   label: 'Interlude Card',  dims: '1080×1350', bgAspect: '3:4' }],
  annual: [
    { id: 'wrapped_card',     label: 'Wrapped Card',    dims: '1080×1350', bgAspect: '3:4' },
    { id: 'year_in_review',   label: 'Year in Review',  dims: '1080×1350', bgAspect: '3:4' },
  ],
  comparison:  [{ id: 'rivalry_card',     label: 'The Rivalry',     dims: '1080×1350', bgAspect: '3:4' }],
  achievement: [{ id: 'achievement_card', label: 'Achievement Card', dims: '1080×1350', bgAspect: '3:4' }],
  passport:    [{ id: 'passport_id_page', label: 'Passport ID',      dims: '1080×1350', bgAspect: '3:4' }],
}

// Scale factor for the in-page preview
const PREVIEW_SCALE = 0.28
// The template canvas is always 1080px wide; height varies by dims ratio
const CANVAS_WIDTH = 1080

// Derive preview container height from dims string (e.g. "1080×1350")
function previewContainerHeight(dims: string): number {
  const parts = dims.split('×')
  if (parts.length !== 2) return Math.round(CANVAS_WIDTH * PREVIEW_SCALE)
  const h = parseInt(parts[1], 10)
  const w = parseInt(parts[0], 10)
  if (!h || !w) return Math.round(CANVAS_WIDTH * PREVIEW_SCALE)
  return Math.round((CANVAS_WIDTH * (h / w)) * PREVIEW_SCALE)
}

// ---------------------------------------------------------------------------
// Visa Carousel Preview — renders all slides, shows one at a time
// ---------------------------------------------------------------------------

interface CarouselState {
  manifest: Array<{ id: string; label: string }>
  activeSlide: number
  setActiveSlide: (n: number) => void
  exportAll: () => Promise<void>
  exporting: boolean
}

function VisaCarouselPreview({ entry, innerRef, activeSlide, setActiveSlide, onStateReady }: {
  entry: Entry
  innerRef: React.Ref<HTMLDivElement>
  activeSlide: number
  setActiveSlide: (n: number) => void
  onStateReady: (state: CarouselState | null) => void
}) {
  const [fullEntry, setFullEntry] = useState<import('@/types/app').EntryWithParticipants | null>(null)
  const [carouselPhotos, setCarouselPhotos] = useState<Array<{ id: string; url: string; caption: string | null }>>([])

  const [carouselStamp, setCarouselStamp] = useState<import('@/types/app').PassportStamp | null>(null)
  const slideRefs = useRef<Array<HTMLDivElement | null>>([])
  const [carouselExporting, setCarouselExporting] = useState(false)

  useEffect(() => {
    fetchEntryFull(entry.id).then(setFullEntry).catch(() => {})
    fetchEntryPhotos(entry.id).then(p => setCarouselPhotos(p.map(x => ({ id: x.id, url: x.url, caption: x.caption })))).catch(() => {})
    fetchStampByEntryId(entry.id).then(setCarouselStamp).catch(() => {})
  }, [entry.id])

  const manifest = useMemo(() => {
    if (!fullEntry) return []
    return buildVisaCarouselManifest(fullEntry, carouselPhotos.length, carouselStamp)
  }, [fullEntry, carouselPhotos.length, carouselStamp])

  // Expose active slide ref as innerRef for single-slide export
  useEffect(() => {
    const activeEl = slideRefs.current[activeSlide]
    if (activeEl && typeof innerRef === 'function') innerRef(activeEl)
    else if (activeEl && innerRef && typeof innerRef === 'object') (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = activeEl
  }, [activeSlide, innerRef, manifest])

  const handleExportAll = useCallback(async () => {
    if (!fullEntry) return
    setCarouselExporting(true)
    try {
      const els = slideRefs.current.filter(Boolean) as HTMLElement[]
      const blobs = await exportMultipleToPng(els)
      await shareMultipleImages(blobs, `visa-${fullEntry.city ?? 'mission'}`)
    } catch (e) {
      console.error('Carousel export failed:', e)
    } finally {
      setCarouselExporting(false)
    }
  }, [fullEntry])

  // Report state to parent so nav renders with fresh React state
  const carouselStateObj = useMemo<CarouselState | null>(() => {
    if (manifest.length === 0) return null
    return { manifest, activeSlide, setActiveSlide, exportAll: handleExportAll, exporting: carouselExporting }
  }, [manifest, activeSlide, setActiveSlide, handleExportAll, carouselExporting])

  useEffect(() => {
    onStateReady(carouselStateObj)
  }, [carouselStateObj, onStateReady])

  if (!fullEntry) return <div ref={innerRef as React.RefObject<HTMLDivElement>} style={{ width: 1080, height: 1350, background: '#F5F0E1' }} />

  const meta = fullEntry.metadata as Record<string, unknown>
  const dayEpisodes = meta?.day_episodes as import('@/types/app').StoryDayEpisode[] | undefined

  // Build photo lookup by ID for day slides
  const photoById = useMemo(() => {
    const map = new Map<string, { url: string }>()
    for (const p of carouselPhotos) map.set(p.id, p)
    return map
  }, [carouselPhotos])

  // Legacy photo grid chunks (fallback for non-day entries)
  const gridPhotos = carouselPhotos.slice(1)
  const photoChunks: Array<typeof carouselPhotos> = []
  for (let i = 0; i < gridPhotos.length && photoChunks.length < 3; i += 4) {
    photoChunks.push(gridPhotos.slice(i, i + 4))
  }

  /** Pick best 3 photos for a day — evenly sample from the day's photos */
  function bestPhotosForDay(photoIds: string[]): { url: string }[] {
    const available = photoIds.map(id => photoById.get(id)).filter(Boolean) as { url: string }[]
    if (available.length <= 3) return available
    // Sample: first, middle, last for variety
    return [
      available[0],
      available[Math.floor(available.length / 2)],
      available[available.length - 1],
    ]
  }

  const setSlideRef = (idx: number) => (el: HTMLDivElement | null) => { slideRefs.current[idx] = el }

  return (
    <div>
      {manifest.map((slide, i) => (
        <div key={slide.id} style={{ display: i === activeSlide ? 'block' : 'none' }}>
          {slide.id === 'visa-card' && (
            <VisaCardSlide ref={setSlideRef(i)} entry={fullEntry} stamp={carouselStamp} />
          )}
          {slide.id === 'hero-lore' && (
            <HeroLoreSlide ref={setSlideRef(i)} entry={fullEntry} />
          )}
          {slide.id.startsWith('day-') && (() => {
            const dayIdx = parseInt(slide.id.split('-')[1])
            const ep = dayEpisodes?.[dayIdx]
            if (!ep) return null
            return (
              <DayPolaroidSlide
                ref={setSlideRef(i)}
                dayLabel={ep.label}
                oneliner={ep.oneliner ?? null}
                photos={bestPhotosForDay(ep.photoIds)}
                entryTitle={fullEntry.title}
              />
            )
          })()}
          {slide.id.startsWith('photo-grid-') && (() => {
            const chunkIdx = parseInt(slide.id.split('-')[2])
            return (
              <PhotoGridSlide
                ref={setSlideRef(i)}
                photos={photoChunks[chunkIdx] ?? []}
                entryTitle={fullEntry.title}
                entryDate={fullEntry.date}
              />
            )
          })()}
          {slide.id === 'debrief' && (
            <DebriefSlide
              ref={setSlideRef(i)}
              debrief={(meta?.mission_debrief as string) ?? ''}
              landmarks={(meta?.landmarks as string[]) ?? []}
              highlights={(meta?.debrief_highlights as string[]) ?? []}
              riskAssessment={(meta?.risk_assessment as string) ?? null}
            />
          )}
          {slide.id === 'stamp' && carouselStamp && (
            <StampSlide ref={setSlideRef(i)} stamp={carouselStamp} entryTitle={fullEntry.title} />
          )}
        </div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Template renderer — maps template id → component
// ---------------------------------------------------------------------------

interface TemplateRendererProps {
  templateId: TemplateId
  entry: EntryWithParticipants
  innerRef: React.Ref<HTMLDivElement>
  backgroundUrl?: string
  rewardKeys?: Set<string>
  comparisonParam?: string
  achievementData?: { name: string; description: string; earnedBy: string; earnedAt: string } | null
  gent?: { display_name: string; alias: string; full_alias: string; avatar_url: string | null }
  carouselActiveSlide?: number
  carouselSetActiveSlide?: (n: number) => void
  onCarouselStateReady?: (state: CarouselState | null) => void
  trackOfNight?: { name: string; artist: string } | null
}

function RivalryCardWrapper({
  innerRef,
  backgroundUrl,
  comparisonParam,
}: {
  innerRef: React.Ref<HTMLDivElement>
  backgroundUrl?: string
  comparisonParam?: string
}) {
  const [stats, setStats] = useState<GentStats[]>([])
  useEffect(() => {
    fetchAllStats().then(setStats).catch(() => {})
  }, [])
  const parts = (comparisonParam ?? 'keys:bass').split(':')
  const aliasA = (parts[0] ?? 'keys') as GentAlias
  const aliasB = (parts[1] ?? 'bass') as GentAlias
  const statA = stats.find((s) => s.alias === aliasA)
  const statB = stats.find((s) => s.alias === aliasB)
  if (!statA || !statB) {
    return (
      <div
        ref={innerRef as React.RefObject<HTMLDivElement>}
        style={{ width: '1080px', height: '1350px', backgroundColor: '#0D0B0F' }}
      />
    )
  }
  return <RivalryCard ref={innerRef} gentA={statA} gentB={statB} backgroundUrl={backgroundUrl} />
}

function TemplateRenderer({ templateId, entry, innerRef, backgroundUrl, rewardKeys, comparisonParam, achievementData, gent, carouselActiveSlide, carouselSetActiveSlide, onCarouselStateReady, trackOfNight }: TemplateRendererProps) {
  switch (templateId) {
    case 'night_out_card':
      return <NightOutCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={1} />
    case 'night_out_card_v2':
      return <NightOutCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={2} />
    case 'night_out_card_v3':
      return <NightOutCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={3} />
    case 'night_out_card_v4':
      return <NightOutCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={4} />
    case 'live_music_v1':
      return <LiveMusicCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={1} />
    case 'live_music_v2':
      return <LiveMusicCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={2} />
    case 'live_music_v3':
      return <LiveMusicCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={3} />
    case 'live_music_v4':
      return <LiveMusicCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={4} />
    case 'mission_carousel':
      return <MissionCarousel ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} variant={1} />
    case 'mission_carousel_v2':
      return <MissionCarousel ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} variant={2} />
    case 'mission_carousel_v3':
      return <MissionCarousel ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} variant={3} />
    case 'mission_carousel_v4':
      return <MissionCarousel ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} variant={4} />
    case 'steak_verdict':
      return <SteakVerdict ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} variant={1} />
    case 'steak_verdict_v2':
      return <SteakVerdict ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} variant={2} />
    case 'steak_verdict_v3':
      return <SteakVerdict ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} variant={3} />
    case 'steak_verdict_v4':
      return <SteakVerdict ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} variant={4} />
    case 'iftar_card':
      return <IftarCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={1} />
    case 'iftar_card_v2':
      return <IftarCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={2} />
    case 'iftar_card_v3':
      return <IftarCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={3} />
    case 'iftar_card_v4':
      return <IftarCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={4} />
    case 'eid_card':
      return <EidCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'ps5_match_card':
      return <PS5MatchCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={1} />
    case 'ps5_match_card_v2':
      return <PS5MatchCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={2} />
    case 'ps5_match_card_v3':
      return <PS5MatchCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={3} />
    case 'ps5_match_card_v4':
      return <PS5MatchCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={4} />
    case 'gathering_invite':
      return <GatheringInviteCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} rewardKeys={rewardKeys} />
    case 'countdown':
      return <CountdownCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'toast_card':
      return <ToastCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={1} />
    case 'toast_card_v2':
      return <ToastCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={2} />
    case 'toast_card_v3':
      return <ToastCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={3} />
    case 'toast_card_v4':
      return <ToastCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={4} />
    case 'toast_session_v1':
      return <ToastSessionCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={1} trackOfNight={trackOfNight} />
    case 'toast_session_v2':
      return <ToastSessionCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={2} />
    case 'toast_session_v3':
      return <ToastSessionCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={3} />
    case 'toast_session_v4':
      return <ToastSessionCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={4} />
    case 'toast_carousel':
      return <ToastCarouselPreview ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'interlude_card':
      return <InterludeCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'visa_carousel':
      return <VisaCarouselPreview entry={entry} innerRef={innerRef} activeSlide={carouselActiveSlide ?? 0} setActiveSlide={carouselSetActiveSlide ?? (() => {})} onStateReady={onCarouselStateReady ?? (() => {})} />
    case 'debrief_page':
      return <DebriefPage ref={innerRef} entry={entry} />
    case 'passport_id_page':
      if (!gent) return null
      return <PassportIdPage ref={innerRef} gent={gent} />
    case 'gathering_recap':
      return <GatheringRecap ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} />
    case 'wrapped_card':
      return (
        <WrappedCard
          ref={innerRef}
          year={new Date().getFullYear()}
          totalMissions={0}
          totalCountries={0}
          totalSteaks={0}
          totalNightsOut={0}
          totalToasts={0}
        />
      )
    case 'year_in_review':
      return (
        <YearInReview
          ref={innerRef}
          year={new Date().getFullYear()}
          totalMissions={0}
          totalCountries={0}
          totalCities={0}
          totalSteaks={0}
          totalNightsOut={0}
          totalToasts={0}
          totalEntries={0}
        />
      )
    case 'rivalry_card':
      return <RivalryCardWrapper innerRef={innerRef} backgroundUrl={backgroundUrl} comparisonParam={comparisonParam} />
    case 'achievement_card':
      if (!achievementData) return <div ref={innerRef as React.RefObject<HTMLDivElement>} style={{ width: '1080px', height: '1350px', backgroundColor: '#0a0a0f' }} />
      return <AchievementCard ref={innerRef} name={achievementData.name} description={achievementData.description} earnedBy={achievementData.earnedBy} earnedAt={achievementData.earnedAt} />
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface EntryCardProps {
  entry: Entry
  isActive: boolean
  onClick: () => void
}

function EntryCardItem({ entry, isActive, onClick }: EntryCardProps) {
  const meta = ENTRY_TYPE_META[entry.type]

  return (
    <motion.button
      variants={staggerItem}
      type="button"
      onClick={onClick}
      className={[
        'flex-shrink-0 w-44 p-3 rounded-xl text-left transition-all duration-200',
        'bg-slate-mid border',
        isActive
          ? 'border-gold/70 shadow-[0_0_0_1px_rgba(201,168,76,0.25)]'
          : 'border-white/8 hover:border-white/20',
      ].join(' ')}
      style={isActive ? { borderLeftWidth: '3px', borderLeftColor: '#C9A84C' } : {}}
      aria-pressed={isActive}
    >
      {/* Type badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <meta.Icon size={14} aria-hidden="true" className="text-ivory-dim shrink-0" />
        <span className="text-[10px] font-body tracking-widest uppercase text-ivory-dim">
          {meta.label}
        </span>
      </div>

      {/* Title */}
      <p className="font-display text-sm text-ivory leading-snug line-clamp-2 mb-1.5">
        {entry.title}
      </p>

      {/* Date */}
      <p className="text-[11px] font-mono text-ivory-dim">
        {formatDate(entry.date)}
      </p>
    </motion.button>
  )
}

interface TemplateOptionProps {
  config: TemplateConfig
  isActive: boolean
  onClick: () => void
}

function TemplateOption({ config, isActive, onClick }: TemplateOptionProps) {
  return (
    <motion.button
      variants={staggerItem}
      type="button"
      onClick={onClick}
      className={[
        'p-4 rounded-xl border text-left transition-all duration-200',
        'bg-slate-mid',
        isActive
          ? 'border-gold/70 bg-gold/5'
          : 'border-white/8 hover:border-white/20',
      ].join(' ')}
      aria-pressed={isActive}
    >
      {/* Icon placeholder */}
      <div
        className={[
          'w-10 h-10 rounded-lg flex items-center justify-center mb-3',
          isActive ? 'bg-gold/15' : 'bg-white/5',
        ].join(' ')}
      >
        <ImageIcon
          size={18}
          className={isActive ? 'text-gold' : 'text-ivory-dim'}
          strokeWidth={1.5}
        />
      </div>

      {/* Label */}
      <p
        className={[
          'font-body text-sm font-medium leading-snug mb-1',
          isActive ? 'text-gold' : 'text-ivory',
        ].join(' ')}
      >
        {config.label}
      </p>

      {/* Dimensions */}
      <p className="font-mono text-[11px] text-ivory-dim">{config.dims}</p>
    </motion.button>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function Studio() {
  const [searchParams] = useSearchParams()
  const preselectedEntryId = searchParams.get('entry')
  const comparisonParam = searchParams.get('comparison')
  const achievementParam = searchParams.get('achievement')

  const { rewardKeys } = useThresholds()
  const { gent } = useAuthStore()

  const [entries, setEntries] = useState<Entry[]>([])
  const [selectedEntry, setSelectedEntry] = useState<EntryWithParticipants | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId | null>(null)
  const [exporting, setExporting] = useState(false)
  const addToast = useUIStore(s => s.addToast)
  const [loading, setLoading] = useState(true)
  const [bgUrl, setBgUrl] = useState<string | null>(null)
  const [generatingBg, setGeneratingBg] = useState(false)

  // Achievement mode state
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([])
  const [selectedAchievement, setSelectedAchievement] = useState<EarnedAchievement | null>(null)

  const templateRef = useRef<HTMLDivElement>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // Carousel state — lifted so nav renders with fresh React state
  const [carouselActiveSlide, setCarouselActiveSlide] = useState(0)
  const [carouselState, setCarouselState] = useState<CarouselState | null>(null)
  const handleCarouselStateReady = useCallback((state: CarouselState | null) => setCarouselState(state), [])

  // Toast session data for track of the night on export templates
  const { session: toastSession } = useToastSession(selectedEntry?.type === 'toast' ? selectedEntry?.id : undefined)
  const trackOfNight = useMemo(() => {
    const t = toastSession?.tracks?.find(tr => tr.is_track_of_night)
    return t ? { name: t.name, artist: t.artist } : null
  }, [toastSession])

  // Achievement data for the template renderer
  const achievementData = useMemo(() => {
    if (!selectedAchievement || !gent) return null
    return {
      name: selectedAchievement.name,
      description: selectedAchievement.description,
      earnedBy: gent.display_name,
      earnedAt: selectedAchievement.earned_at,
    }
  }, [selectedAchievement, gent])

  // Load entries on mount; honour ?entry=, ?comparison=, and ?achievement= params
  useEffect(() => {
    // Comparison mode — no entries needed
    if (comparisonParam) {
      setSelectedTemplate('rivalry_card')
      setLoading(false)
      return
    }
    // Achievement mode — load achievements instead of entries
    if (achievementParam !== null) {
      if (!gent) { setLoading(false); return }
      fetchEarnedAchievements(gent.id)
        .then((earned) => {
          setAchievements(earned)
          setSelectedTemplate('achievement_card')
          // If a specific achievement name was provided in the param, pre-select it
          if (achievementParam) {
            const match = earned.find((a) => a.type === achievementParam || a.name === achievementParam)
            if (match) setSelectedAchievement(match)
          } else if (earned.length > 0) {
            setSelectedAchievement(earned[0])
          }
          setLoading(false)
        })
        .catch(() => setLoading(false))
      return
    }
    let cancelled = false
    fetchEntries({})
      .then((fetched) => {
        if (cancelled) return
        setEntries(fetched)
        if (preselectedEntryId) {
          const match = fetched.find((x) => x.id === preselectedEntryId)
          if (match) {
            setSelectedEntry({ ...match, participants: [] })
            if (match.cover_image_url) {
              setBgUrl(match.cover_image_url)
            }
            // Auto-select first template for that type if available
            const templates = TEMPLATES_BY_TYPE[match.type] ?? []
            if (templates.length > 0) setSelectedTemplate(templates[0].id)
            // Fetch full entry with participants
            fetchEntryFull(match.id).then(full => { if (full && !cancelled) setSelectedEntry(full) }).catch(() => {})
          }
        }
        setLoading(false)
      })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [preselectedEntryId, comparisonParam, achievementParam, gent])

  // When entry changes, reset template selection and use cover image as default background
  function handleSelectEntry(entry: Entry) {
    if (selectedEntry?.id === entry.id) return
    // Immediately set with empty participants, then fetch full entry
    setSelectedEntry({ ...entry, participants: [] })
    setBgUrl(entry.cover_image_url ?? null)
    const templates = TEMPLATES_BY_TYPE[entry.type] ?? []
    setSelectedTemplate(templates.length > 0 ? templates[0].id : null)
    fetchEntryFull(entry.id).then(full => { if (full) setSelectedEntry(full) }).catch(() => {})
  }

  // When template changes, keep the current background (cover or AI)
  function handleSelectTemplate(templateId: TemplateId) {
    setSelectedTemplate(templateId)
    setCarouselActiveSlide(0)
    setCarouselState(null)
  }

  async function handleGenerateBg() {
    if (!selectedEntry || !activeTemplateConfig) return
    setGeneratingBg(true)
    try {
      const url = await generateTemplateBg(selectedEntry, activeTemplateConfig.bgAspect ?? '3:4')
      if (url) setBgUrl(url)
    } finally {
      setGeneratingBg(false)
    }
  }

  function handleUseCoverImage() {
    if (!selectedEntry?.cover_image_url) return
    setBgUrl(selectedEntry.cover_image_url)
  }

  async function handleExport() {
    const el = exportRef.current ?? templateRef.current
    if (!el) return
    setExporting(true)
    const filename = comparisonParam
      ? `codex-rivalry-${comparisonParam}.png`
      : selectedAchievement
        ? `codex-achievement-${selectedAchievement.type}.png`
        : `codex-${selectedEntry?.type ?? 'export'}-${selectedEntry?.date ?? Date.now()}.png`
    try {
      await exportAndShare(el, filename)
    } catch (err) {
      console.error('Export failed:', err)
      addToast('Export failed. Try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  const availableTemplates = selectedAchievement
    ? (TEMPLATES_BY_TYPE['achievement'] ?? [])
    : selectedEntry
      ? (TEMPLATES_BY_TYPE[selectedEntry.type] ?? []).filter(t => {
          if (!t.requiresFlavour) return true
          const meta = selectedEntry.metadata as Record<string, unknown> | undefined
          return meta?.flavour === t.requiresFlavour
        })
      : []

  const activeTemplateConfig = selectedTemplate
    ? availableTemplates.find((t) => t.id === selectedTemplate) ?? null
    : null

  const bgSource: 'cover' | 'ai' | null = useMemo(() => {
    if (!bgUrl) return null
    return bgUrl === selectedEntry?.cover_image_url ? 'cover' : 'ai'
  }, [bgUrl, selectedEntry?.cover_image_url])

  const filterContextValue = useMemo(
    () => getFilter(getStoredFilter(selectedEntry?.id)).css,
    [selectedEntry?.id],
  )

  const gentData = useMemo(() => gent ? {
    display_name: gent.display_name,
    alias: gent.alias,
    full_alias: gent.full_alias ?? gent.alias,
    avatar_url: gent.avatar_url,
  } : undefined, [gent])

  // ---------------------------------------------------------------------------
  // Render: loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <>
        <TopBar title="Studio" />
        <SectionNav />
        <PageWrapper>
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <Spinner size="lg" />
            <p className="text-sm text-ivory-dim font-body">Loading chronicle…</p>
          </div>
        </PageWrapper>
      </>
    )
  }

  // ---------------------------------------------------------------------------
  // Render: main
  // ---------------------------------------------------------------------------

  return (
    <>
      <TopBar title="Studio" />
      <SectionNav />

      <PageWrapper padded={false} className="flex flex-col gap-0">

        <OnboardingTip
          tipKey="studio"
          title="The Studio"
          body="Pick any entry from the list below to generate a shareable export card. AI backgrounds are generated per entry type. Use Export to Studio from any entry detail page to jump straight here."
        />

        {/* ------------------------------------------------------------------ */}
        {/* Step 1: Entry selector                                              */}
        {/* ------------------------------------------------------------------ */}

        {/* Comparison mode banner */}
        {comparisonParam && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="mx-4 mt-4 mb-5 px-4 py-3 rounded-xl bg-slate-mid border border-white/8 flex items-center gap-3"
          >
            <div className="min-w-0">
              <p className="font-display text-sm text-ivory">The Rivalry</p>
              <p className="text-[11px] font-mono text-ivory-dim mt-0.5">
                {comparisonParam.replace(':', ' vs ')}
              </p>
            </div>
          </motion.div>
        )}

        {/* Achievement mode — achievement selector */}
        {achievementParam !== null && (
          <motion.section
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="px-4 pt-4 pb-5"
          >
            <p className="text-[11px] font-body tracking-widest uppercase text-gold-muted mb-3">
              01 — Select Achievement
            </p>

            {achievements.length === 0 ? (
              <p className="text-sm text-ivory-dim font-body py-6 text-center">
                No achievements earned yet.
              </p>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="flex gap-3 overflow-x-auto scrollbar-none pb-1"
              >
                {achievements.map((ach) => (
                  <motion.button
                    key={ach.type}
                    variants={staggerItem}
                    type="button"
                    onClick={() => setSelectedAchievement(ach)}
                    className={[
                      'flex-shrink-0 w-44 p-3 rounded-xl text-left transition-all duration-200',
                      'bg-slate-mid border',
                      selectedAchievement?.type === ach.type
                        ? 'border-gold/70 shadow-[0_0_0_1px_rgba(201,168,76,0.25)]'
                        : 'border-white/8 hover:border-white/20',
                    ].join(' ')}
                    style={selectedAchievement?.type === ach.type ? { borderLeftWidth: '3px', borderLeftColor: '#C9A84C' } : {}}
                    aria-pressed={selectedAchievement?.type === ach.type}
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Award size={14} aria-hidden="true" className="text-gold shrink-0" />
                      <span className="text-[10px] font-body tracking-widest uppercase text-ivory-dim">
                        Achievement
                      </span>
                    </div>
                    <p className="font-display text-sm text-ivory leading-snug line-clamp-2 mb-1.5">
                      {ach.name}
                    </p>
                    <p className="text-[11px] font-mono text-ivory-dim line-clamp-1">
                      {ach.description}
                    </p>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </motion.section>
        )}

        {/* Only show the full selector if there was no preselected param */}
        {!preselectedEntryId && !comparisonParam && achievementParam === null && (
          <motion.section
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="px-4 pt-4 pb-5"
          >
            <p className="text-[11px] font-body tracking-widest uppercase text-gold-muted mb-3">
              01 — Select Entry
            </p>

            {entries.length === 0 ? (
              <p className="text-sm text-ivory-dim font-body py-6 text-center">
                No published entries yet.
              </p>
            ) : (
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="flex gap-3 overflow-x-auto scrollbar-none pb-1 -mx-0"
              >
                {entries.map((entry) => (
                  <EntryCardItem
                    key={entry.id}
                    entry={entry}
                    isActive={selectedEntry?.id === entry.id}
                    onClick={() => handleSelectEntry(entry)}
                  />
                ))}
              </motion.div>
            )}
          </motion.section>
        )}

        {/* When preselected: show a compact "selected entry" banner (not in comparison mode) */}
        {preselectedEntryId && !comparisonParam && selectedEntry && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="mx-4 mt-4 mb-5 px-4 py-3 rounded-xl bg-slate-mid border border-white/8 flex items-center gap-3"
          >
            {(() => { const { Icon: EntryIcon } = ENTRY_TYPE_META[selectedEntry.type]; return <EntryIcon size={20} aria-hidden="true" className="shrink-0 text-ivory-muted" /> })()}
            <div className="min-w-0">
              <p className="font-display text-sm text-ivory truncate">
                {selectedEntry.title}
              </p>
              <p className="text-[11px] font-mono text-ivory-dim mt-0.5">
                {formatDate(selectedEntry.date)}
              </p>
            </div>
          </motion.div>
        )}

        {/* Divider */}
        {(selectedEntry || comparisonParam || selectedAchievement) && (
          <div className="mx-4 border-t border-white/8 mb-0" />
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Step 2: Template picker                                             */}
        {/* ------------------------------------------------------------------ */}

        <AnimatePresence mode="wait">
          {selectedEntry && (
            <motion.section
              key={selectedEntry.id + '-templates'}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pt-5 pb-5"
            >
              <p className="text-[11px] font-body tracking-widest uppercase text-gold-muted mb-3">
                02 — Choose Template
              </p>

              {availableTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <p className="text-sm text-ivory-dim font-body text-center">
                    No export templates available for{' '}
                    <span className="text-ivory">
                      {ENTRY_TYPE_META[selectedEntry.type].label}
                    </span>{' '}
                    entries yet.
                  </p>
                </div>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-2 gap-3"
                >
                  {availableTemplates.map((tpl) => (
                    <TemplateOption
                      key={tpl.id}
                      config={tpl}
                      isActive={selectedTemplate === tpl.id}
                      onClick={() => handleSelectTemplate(tpl.id)}
                    />
                  ))}
                </motion.div>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ------------------------------------------------------------------ */}
        {/* Step 3: Preview + Export                                            */}
        {/* ------------------------------------------------------------------ */}

        <AnimatePresence mode="wait">
          {(selectedEntry || comparisonParam || selectedAchievement) && selectedTemplate && (activeTemplateConfig || comparisonParam || selectedAchievement) && (
            <motion.section
              key={(selectedEntry?.id ?? selectedAchievement?.type ?? 'comparison') + '-' + selectedTemplate}
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pb-8"
            >
              {/* Divider */}
              <div className="border-t border-white/8 mb-5" />

              <p className="text-[11px] font-body tracking-widest uppercase text-gold-muted mb-3">
                03 — Preview
              </p>

              {/* Preview wrapper */}
              <div
                className="w-full rounded-xl overflow-hidden border border-white/8 bg-obsidian mb-4"
                style={{
                  height: previewContainerHeight(activeTemplateConfig?.dims ?? '1080×1350'),
                }}
              >
                {/* Scaled-down template canvas */}
                <div
                  style={{
                    width: `${CANVAS_WIDTH}px`,
                    transform: `scale(${PREVIEW_SCALE})`,
                    transformOrigin: 'top left',
                    pointerEvents: 'none',
                  }}
                >
                  <PhotoFilterContext.Provider value={filterContextValue}>
                    <TemplateRenderer
                      templateId={selectedTemplate}
                      entry={selectedEntry ?? ({ participants: [] } as unknown as EntryWithParticipants)}
                      innerRef={templateRef}
                      backgroundUrl={bgUrl ?? undefined}
                      rewardKeys={rewardKeys}
                      comparisonParam={comparisonParam ?? undefined}
                      achievementData={achievementData}
                      gent={gentData}
                      carouselActiveSlide={carouselActiveSlide}
                      carouselSetActiveSlide={setCarouselActiveSlide}
                      onCarouselStateReady={handleCarouselStateReady}
                      trackOfNight={trackOfNight}
                    />
                  </PhotoFilterContext.Provider>
                </div>
              </div>

              {/* Hidden full-size render for export — no transforms, no overflow clip */}
              <div style={{ position: 'fixed', left: -9999, top: 0, zIndex: -1, pointerEvents: 'none' }}>
                <PhotoFilterContext.Provider value={filterContextValue}>
                  <TemplateRenderer
                    templateId={selectedTemplate}
                    entry={selectedEntry ?? ({ participants: [] } as unknown as EntryWithParticipants)}
                    innerRef={exportRef}
                    backgroundUrl={bgUrl ?? undefined}
                    rewardKeys={rewardKeys}
                    comparisonParam={comparisonParam ?? undefined}
                    achievementData={achievementData}
                    gent={gentData}
                    carouselActiveSlide={carouselActiveSlide}
                    carouselSetActiveSlide={setCarouselActiveSlide}
                    onCarouselStateReady={() => {}}
                    trackOfNight={trackOfNight}
                  />
                </PhotoFilterContext.Provider>
              </div>

              {/* Carousel nav — rendered outside the scaled preview container */}
              {selectedTemplate === 'visa_carousel' && carouselState && carouselState.manifest.length >= 2 && (
                  <div className="flex items-center justify-between mb-3 mt-1">
                    <button
                      type="button"
                      onClick={() => setCarouselActiveSlide(Math.max(0, carouselActiveSlide - 1))}
                      disabled={carouselActiveSlide === 0}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 disabled:opacity-30 transition-opacity"
                    >
                      <ChevronLeft size={16} className="text-ivory" />
                    </button>

                    <div className="flex items-center gap-3">
                      {/* Dot indicators */}
                      <div className="flex gap-1.5">
                        {carouselState.manifest.map((slide, i) => (
                          <button
                            key={slide.id}
                            type="button"
                            onClick={() => setCarouselActiveSlide(i)}
                            className={[
                              'w-2 h-2 rounded-full transition-all duration-200',
                              i === carouselActiveSlide ? 'bg-gold w-5' : 'bg-white/20 hover:bg-white/40',
                            ].join(' ')}
                            aria-label={slide.label}
                          />
                        ))}
                      </div>
                      {/* Slide counter */}
                      <span className="text-[11px] font-mono text-ivory-dim">
                        {carouselActiveSlide + 1}/{carouselState.manifest.length}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCarouselActiveSlide(Math.min(carouselState.manifest.length - 1, carouselActiveSlide + 1))}
                      disabled={carouselActiveSlide === carouselState.manifest.length - 1}
                      className="w-8 h-8 rounded-full flex items-center justify-center bg-white/5 border border-white/10 disabled:opacity-30 transition-opacity"
                    >
                      <ChevronRight size={16} className="text-ivory" />
                    </button>
                  </div>
              )}

              {/* Dims label */}
              <p className="text-[11px] font-mono text-ivory-dim text-center mb-4">
                {activeTemplateConfig?.dims ?? '1080×1350'} px · PNG · 3×
              </p>

              {/* Background source picker */}
              <div className="flex gap-2 mb-3">
                {/* Cover image button — only if entry has a cover */}
                {selectedEntry?.cover_image_url && (
                  <Button
                    variant="ghost"
                    size="md"
                    fullWidth
                    onClick={handleUseCoverImage}
                    className={[
                      'gap-2 border transition-all',
                      bgSource === 'cover'
                        ? 'border-gold/50 bg-gold/8 text-gold'
                        : 'border-white/10 hover:border-white/25',
                    ].join(' ')}
                  >
                    <Camera size={14} strokeWidth={1.5} />
                    Cover Photo
                  </Button>
                )}
                {/* AI background button */}
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  loading={generatingBg}
                  onClick={handleGenerateBg}
                  className={[
                    'gap-2 border transition-all',
                    bgSource === 'ai'
                      ? 'border-gold/50 bg-gold/8 text-gold'
                      : 'border-white/10 hover:border-gold/30',
                  ].join(' ')}
                >
                  {!generatingBg && <Sparkles size={14} strokeWidth={1.5} className="text-gold" />}
                  {generatingBg ? 'Generating…' : bgSource === 'ai' ? 'AI Styled' : selectedEntry?.cover_image_url ? 'AI Restyle' : 'Generate AI'}
                </Button>
              </div>

              {/* Export buttons */}
              {selectedTemplate === 'visa_carousel' && carouselState && carouselState.manifest.length > 1 ? (
                    <div className="flex gap-2 mb-2">
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={exporting}
                        onClick={handleExport}
                        className="gap-2"
                      >
                        {!exporting && <Share2 size={16} strokeWidth={2} />}
                        {exporting ? 'Exporting…' : 'Export Slide'}
                      </Button>
                      <Button
                        variant="primary"
                        size="lg"
                        fullWidth
                        loading={carouselState.exporting}
                        onClick={carouselState.exportAll}
                        className="gap-2"
                      >
                        {!carouselState.exporting && <Share2 size={16} strokeWidth={2} />}
                        {carouselState.exporting ? 'Exporting…' : `Export All (${carouselState.manifest.length})`}
                      </Button>
                    </div>
              ) : (
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={exporting}
                  onClick={handleExport}
                  className="gap-2"
                >
                  {!exporting && <Share2 size={16} strokeWidth={2} />}
                  {exporting ? 'Exporting…' : 'Export & Share'}
                </Button>
              )}
            </motion.section>
          )}
        </AnimatePresence>

        {/* ------------------------------------------------------------------ */}
        {/* Empty state — no entry selected and there were no entries           */}
        {/* ------------------------------------------------------------------ */}

        {!loading && entries.length === 0 && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center justify-center py-24 px-8 gap-4"
          >
            <p className="font-display text-lg text-ivory text-center">
              The Studio is Ready
            </p>
            <p className="text-sm text-ivory-dim text-center font-body leading-relaxed">
              Once you have published entries in The Chronicle, you can craft
              shareable cards and stories here.
            </p>
          </motion.div>
        )}

        {/* Prompt when entries exist but none selected yet */}
        {!loading && entries.length > 0 && !selectedEntry && !preselectedEntryId && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            className="flex flex-col items-center justify-center py-10 px-8 gap-2"
          >
            <p className="text-sm text-ivory-dim font-body text-center">
              Select an entry above to see available templates.
            </p>
          </motion.div>
        )}

      </PageWrapper>
    </>
  )
}
