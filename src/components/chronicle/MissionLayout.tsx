import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui'
import { fetchStampByEntryId } from '@/data/stamps'
import { fetchCityVisits, type CityVisit } from '@/data/entries'
import { flagEmoji, cn, getCoverCrop } from '@/lib/utils'
import { generateMissionDebrief } from '@/ai/debrief'
import { Sparkles, RefreshCw, ChevronDown, ChevronLeft, ChevronRight, Move, Check, X, ZoomIn, ZoomOut } from 'lucide-react'
import { SoundtrackSection } from '@/components/mission/SoundtrackSection'
import { ListenButton } from '@/components/ui/ListenButton'
import { stopGlobalAudio } from '@/lib/audioManager'
import { useUIStore } from '@/store/ui'
import { updateEntry } from '@/data/entries'
import {
  getOneliner, visaWord, aliasDisplay,
  getCountryVisaInfo, visaNumber, getCityInfo,
  getSeason, SEASON_FILTER, toRoman, monthYear, calcDuration,
} from '@/export/templates/shared/utils'
import type { PassportStamp, EntryWithParticipants, StoryDayEpisode } from '@/types/app'

interface EntryPhoto {
  id: string
  url: string
  caption: string | null
  sort_order: number
  taken_by: string | null
}

interface MissionLayoutProps {
  entry: EntryWithParticipants
  photos: EntryPhoto[]
  isCreator: boolean
  onEntryUpdate: (entry: EntryWithParticipants) => void
  onSetAsCover?: (url: string) => void
  loreSlot?: React.ReactNode
  controlsSlot?: React.ReactNode
}

/* ── Helpers ── */

function loreParagraphs(lore: string | null): string[] {
  if (!lore) return []
  return lore.split(/\n\n+/).filter(Boolean)
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 my-7">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/30" />
      <span className="text-[9px] font-body font-semibold tracking-[0.25em] text-gold/60 uppercase whitespace-nowrap">
        {label}
      </span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/30" />
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════ */

export function MissionLayout({ entry, photos, isCreator, onEntryUpdate, onSetAsCover, loreSlot, controlsSlot }: MissionLayoutProps) {
  const addToast = useUIStore(s => s.addToast)

  const [stamp, setStamp] = useState<PassportStamp | null>(null)
  const [cityVisit, setCityVisit] = useState<CityVisit | null>(null)
  const [generatingDebrief, setGeneratingDebrief] = useState(false)
  const [controlsExpanded, setControlsExpanded] = useState(false)
  const [activePage, setActivePage] = useState(0)
  const [carouselHeight, setCarouselHeight] = useState<number | undefined>(undefined)
  const scrollRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLDivElement | null)[]>([])
  const touchRef = useRef<{ x: number; y: number; t: number } | null>(null)
  const isScrollingRef = useRef(false)

  // Cover photo adjust state
  const [coverEditing, setCoverEditing] = useState(false)
  const [coverPos, setCoverPos] = useState({ x: 50, y: 50 })
  const [coverScale, setCoverScale] = useState(1)
  const coverDragging = useRef(false)
  const coverLastTouch = useRef({ x: 0, y: 0 })
  const coverContainerRef = useRef<HTMLDivElement>(null)

  // Read day episodes directly from entry metadata (no Story dependency)
  const entryMeta = entry.metadata as Record<string, unknown> | undefined
  const rawEpisodes = entryMeta?.day_episodes as StoryDayEpisode[] | undefined
  const dayEpisodes = (rawEpisodes && rawEpisodes.length >= 1) ? rawEpisodes : []

  // Fetch stamp + city visits on mount
  useEffect(() => {
    let cancelled = false
    fetchStampByEntryId(entry.id).then(s => { if (!cancelled) setStamp(s) }).catch(() => {})
    if (entry.city) {
      fetchCityVisits(entry.city, entry.id).then(v => { if (!cancelled) setCityVisit(v) }).catch(() => {})
    }
    return () => { cancelled = true }
  }, [entry.id, entry.city])

  async function handleGenerateDebrief() {
    if (!entry || generatingDebrief) return
    setGeneratingDebrief(true)
    try {
      const urls = photos.map(p => p.url)
      const result = await generateMissionDebrief(entry, urls)
      if (result?.debrief) {
        const meta = {
          ...(entry.metadata as Record<string, unknown> ?? {}),
          mission_debrief: result.debrief,
          landmarks: result.landmarks,
          debrief_highlights: result.highlights,
          risk_assessment: result.risk_assessment,
        }
        await updateEntry(entry.id, { metadata: meta } as Partial<EntryWithParticipants>)
        onEntryUpdate({ ...entry, metadata: meta })
        addToast('Mission debrief generated.', 'success')
      } else {
        addToast('Could not generate debrief. Try again.', 'error')
      }
    } catch {
      addToast('Debrief generation failed.', 'error')
    } finally {
      setGeneratingDebrief(false)
    }
  }

  /* ── Cover adjust handlers ── */

  function startCoverEdit() {
    const crop = getCoverCrop(entry)
    setCoverPos({ x: crop.x, y: crop.y })
    setCoverScale(crop.scale)
    setCoverEditing(true)
  }

  async function saveCoverEdit() {
    setCoverEditing(false)
    const meta = { ...(entry.metadata as Record<string, unknown> ?? {}), cover_pos_x: coverPos.x, cover_pos_y: coverPos.y, cover_scale: coverScale }
    const updated = { ...entry, metadata: meta }
    onEntryUpdate?.(updated)
    await updateEntry(entry.id, { metadata: meta } as Partial<EntryWithParticipants>).catch(() => {})
  }

  const handleCoverPointerDown = useCallback((e: React.PointerEvent) => {
    if (!coverEditing) return
    coverDragging.current = true
    coverLastTouch.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [coverEditing])

  const handleCoverPointerMove = useCallback((e: React.PointerEvent) => {
    if (!coverDragging.current || !coverEditing || !coverContainerRef.current) return
    const rect = coverContainerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - coverLastTouch.current.x) / rect.width) * -100
    const dy = ((e.clientY - coverLastTouch.current.y) / rect.height) * -100
    coverLastTouch.current = { x: e.clientX, y: e.clientY }
    setCoverPos(prev => ({
      x: Math.max(0, Math.min(100, prev.x + dx)),
      y: Math.max(0, Math.min(100, prev.y + dy)),
    }))
  }, [coverEditing])

  const handleCoverPointerUp = useCallback(() => { coverDragging.current = false }, [])

  /* ── Derived data ── */

  const dateEnd = (entry.metadata as Record<string, unknown>)?.date_end as string | undefined
  const duration = calcDuration(entry.date, dateEnd)
  const cc = entry.country_code?.toUpperCase() ?? null
  const oneliner = getOneliner(entry)
  const coverPhoto = entry.cover_image_url ?? photos[0]?.url ?? null
  const coverCrop = getCoverCrop(entry)
  const countryInfo = getCountryVisaInfo(cc)
  const cityInfo = getCityInfo(entry.city, entry.id)
  const visaNo = visaNumber(entry.id, cc)
  const seasonFilter = SEASON_FILTER[getSeason(entry.date)]
  const isReturn = (cityVisit?.visitNumber ?? 1) > 1

  const meta = entry.metadata as Record<string, unknown> | undefined
  const missionDebrief = meta?.mission_debrief as string | undefined
  const landmarks = Array.isArray(meta?.landmarks) ? meta.landmarks as string[] : []
  const debriefHighlights = Array.isArray(meta?.debrief_highlights) ? meta.debrief_highlights as string[] : []
  const riskAssessment = meta?.risk_assessment as string | undefined

  const paragraphs = loreParagraphs(entry.lore)
  const isMultiDay = dayEpisodes.length > 1

  // Build photo lookup by ID for day episodes
  const photoById = useMemo(() => {
    const map = new Map<string, EntryPhoto>()
    for (const p of photos) map.set(p.id, p)
    return map
  }, [photos])

  // Per-day lore: only show if story day_episodes have explicit per-day lore.
  // Don't split overall lore across days — it's a continuous narrative and round-robin
  // distribution misaligns content with day labels. Overall lore is shown in loreSlot below.
  const loreByDay = useMemo(() => {
    if (!isMultiDay) return []
    const hasPerDayLore = dayEpisodes.some(d => d.lore)
    if (hasPerDayLore) {
      return dayEpisodes.map(d => d.lore ? [d.lore] : [])
    }
    return dayEpisodes.map(() => [] as string[])
  }, [isMultiDay, dayEpisodes])

  // Total pages: visa+intel card + day pages (no trailing intel — it's on slide 1)
  const totalPages = isMultiDay ? 1 + dayEpisodes.length : 0

  function scrollToPage(page: number) {
    if (!scrollRef.current) return
    stopGlobalAudio() // Stop any playing narration when swiping between pages
    isScrollingRef.current = true
    const el = scrollRef.current
    const width = el.offsetWidth
    el.scrollTo({ left: page * width, behavior: 'smooth' })
    setActivePage(page)
    const activeSlide = slideRefs.current[page]
    if (activeSlide) setCarouselHeight(activeSlide.scrollHeight)
    // Clear scrolling flag after animation completes
    setTimeout(() => { isScrollingRef.current = false }, 400)
  }

  function handleScroll() {
    // Only update page from scroll position when not programmatically scrolling
    if (isScrollingRef.current || !scrollRef.current) return
    const el = scrollRef.current
    const page = Math.round(el.scrollLeft / el.offsetWidth)
    if (page !== activePage) {
      setActivePage(page)
      const activeSlide = slideRefs.current[page]
      if (activeSlide) setCarouselHeight(activeSlide.scrollHeight)
    }
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.x
    const dy = e.changedTouches[0].clientY - touchRef.current.y
    const dt = Date.now() - touchRef.current.t
    touchRef.current = null
    // Must be more horizontal than vertical, and meaningful distance or fast
    if (Math.abs(dx) < Math.abs(dy) * 1.2) return
    const fast = Math.abs(dx) / dt > 0.3
    if (Math.abs(dx) < 40 && !fast) return
    if (dx < 0 && activePage < totalPages - 1) scrollToPage(activePage + 1)
    else if (dx > 0 && activePage > 0) scrollToPage(activePage - 1)
  }

  // Set initial height from first slide
  useEffect(() => {
    const firstSlide = slideRefs.current[0]
    if (firstSlide) setCarouselHeight(firstSlide.scrollHeight)
  }, [dayEpisodes])

  /* ══════════════════════════════════════════════════════════════════════════
     VISA CARD — shared between single-day and multi-day
     ══════════════════════════════════════════════════════════════════════════ */

  const visaCard = (
    <div
      className="relative overflow-hidden rounded-xl"
      style={{
        background: '#F5F0E1',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none z-10" style={{ border: '8px solid transparent', borderImage: `repeating-linear-gradient(45deg, ${countryInfo.accent}10 0px, ${countryInfo.accent}08 2px, transparent 2px, transparent 6px) 8` }} />
      <div className="absolute top-12 right-4 pointer-events-none opacity-[0.04] z-[1]">
        <svg viewBox="0 0 40 32" className="w-28" fill="none" stroke={countryInfo.accent} strokeWidth="0.6"><path d={countryInfo.emblemPath} /></svg>
      </div>

      {/* Header */}
      <div className="relative z-[2] pt-3 pb-1.5 text-center" style={{ background: `linear-gradient(180deg, ${countryInfo.accent}0A 0%, transparent 100%)` }}>
        <div className="flex items-center justify-center gap-2 mb-1">
          {cc && <span className="text-[20px] leading-none">{flagEmoji(cc)}</span>}
          {countryInfo.motto && <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', color: countryInfo.accent, textTransform: 'uppercase' }}>{countryInfo.motto}</span>}
        </div>
        <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '9px', fontWeight: 600, letterSpacing: '0.25em', color: '#5A6B7A', textTransform: 'uppercase' }}>{countryInfo.header}</span>
        <div className="mt-0.5 flex flex-col items-center gap-0.5">
          {cityInfo && <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '9px', color: countryInfo.accent, opacity: 0.5, letterSpacing: '0.04em' }}>{cityInfo.greeting}</span>}
          <span style={{ fontFamily: 'monospace', fontSize: '8px', letterSpacing: '0.15em', color: '#8B7355' }}>No. {visaNo}</span>
        </div>
      </div>

      {/* Photo band — adjustable */}
      {coverPhoto && (() => {
        const dispPos = coverEditing ? coverPos : { x: coverCrop.x, y: coverCrop.y }
        const dispScale = coverEditing ? coverScale : coverCrop.scale
        return (
          <div
            ref={coverContainerRef}
            className="relative z-[2] h-56 overflow-hidden"
            onPointerDown={handleCoverPointerDown}
            onPointerMove={handleCoverPointerMove}
            onPointerUp={handleCoverPointerUp}
            style={{ touchAction: coverEditing ? 'none' : 'auto', cursor: coverEditing ? 'grab' : 'auto' }}
          >
            <img src={coverPhoto} alt="" className="w-full h-full object-cover" style={{
              objectPosition: `${dispPos.x}% ${dispPos.y}%`,
              transform: `scale(${dispScale})`,
              transformOrigin: `${dispPos.x}% ${dispPos.y}%`,
              filter: seasonFilter,
            }} draggable={false} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(245,240,225,0.2) 0%, transparent 25%, transparent 55%, rgba(245,240,225,0.95) 100%)' }} />

            {/* Edit mode overlay */}
            {coverEditing && (
              <>
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gold/20" />
                  <div className="absolute top-1/2 left-0 right-0 h-px bg-gold/20" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                  <div className="flex items-center gap-2 bg-obsidian/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-gold/20">
                    <Move size={14} className="text-gold" />
                    <span className="text-xs text-ivory-muted font-body">Drag to pan</span>
                  </div>
                </div>
                <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-obsidian/70 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10 z-10">
                  <button type="button" className="p-1 text-ivory-muted hover:text-ivory transition-colors" onClick={() => setCoverScale(s => Math.max(1, +(s - 0.1).toFixed(1)))}>
                    <ZoomOut size={14} />
                  </button>
                  <input type="range" min="1" max="2" step="0.05" value={coverScale} onChange={e => setCoverScale(parseFloat(e.target.value))} className="w-24 h-1 accent-gold" />
                  <button type="button" className="p-1 text-ivory-muted hover:text-ivory transition-colors" onClick={() => setCoverScale(s => Math.min(2, +(s + 0.1).toFixed(1)))}>
                    <ZoomIn size={14} />
                  </button>
                </div>
                <div className="absolute top-3 right-3 flex gap-2 z-10">
                  <button type="button" onClick={() => setCoverEditing(false)} className="flex items-center gap-1.5 bg-obsidian/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 text-ivory-muted hover:text-ivory transition-colors">
                    <X size={14} /><span className="text-xs font-body">Cancel</span>
                  </button>
                  <button type="button" onClick={saveCoverEdit} className="flex items-center gap-1.5 bg-gold/90 rounded-full px-3 py-1.5 text-obsidian hover:bg-gold transition-colors">
                    <Check size={14} /><span className="text-xs font-body font-semibold">Save</span>
                  </button>
                </div>
              </>
            )}

            {/* Normal overlays */}
            {!coverEditing && (
              <>
                <div className="absolute bottom-2 left-5 flex items-center gap-2.5 z-[3]">
                  {cc && <span className="text-[28px] leading-none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>{flagEmoji(cc)}</span>}
                  <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '38px', fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.06em', lineHeight: 1, textShadow: '0 1px 3px rgba(245,240,225,0.8)' }}>
                    {isReturn ? 'RETURN' : visaWord(cc)}
                  </span>
                  {isReturn && cityVisit && (
                    <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '10px', fontWeight: 600, color: '#1B3A5C', letterSpacing: '0.15em', textTransform: 'uppercase', background: 'rgba(245,240,225,0.7)', padding: '2px 8px', borderRadius: '3px', textShadow: 'none' }}>
                      Mission {toRoman(cityVisit.visitNumber)}
                    </span>
                  )}
                </div>
                {isCreator && (
                  <button type="button" onClick={startCoverEdit} className="absolute top-3 right-3 flex items-center gap-1.5 bg-obsidian/50 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10 text-ivory-muted hover:text-ivory hover:border-white/20 transition-colors z-[4]">
                    <Move size={12} />
                    <span className="text-[10px] font-body tracking-wide uppercase">Adjust</span>
                  </button>
                )}
              </>
            )}
          </div>
        )
      })()}

      {/* Card body */}
      <div className="relative z-[2] px-5 pb-5 pt-3">
        <div className="mb-3">
          <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: '20px', fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.03em', lineHeight: 1.15 }}>
            {(entry.city && entry.country) ? `${entry.city.toUpperCase()}, ${entry.country.toUpperCase()}` : entry.city?.toUpperCase() ?? entry.location?.toUpperCase() ?? '\u2014'}
          </p>
          {cityInfo && <p style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '11px', color: countryInfo.accent, letterSpacing: '0.06em', opacity: 0.7, marginTop: '2px' }}>{cityInfo.epithet}</p>}
          <div className="flex items-center gap-2.5 mt-1">
            <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '11px', color: '#5A6B7A', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{monthYear(entry.date)}</span>
            {duration && <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '9px', fontWeight: 600, color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase', background: 'rgba(139,115,85,0.1)', padding: '2px 8px', borderRadius: '3px' }}>{duration}</span>}
          </div>
        </div>

        {/* Entry/Exit row */}
        <div className="grid grid-cols-3 gap-0 mb-3 py-2" style={{ borderTop: `1px solid ${countryInfo.accent}12`, borderBottom: `1px solid ${countryInfo.accent}12` }}>
          <div>
            <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '7px', fontWeight: 600, letterSpacing: '0.15em', color: '#8B7355', textTransform: 'uppercase', display: 'block' }}>Entry</span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2C2C2C', fontWeight: 600 }}>{new Date(entry.date + 'T12:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}</span>
          </div>
          <div>
            <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '7px', fontWeight: 600, letterSpacing: '0.15em', color: '#8B7355', textTransform: 'uppercase', display: 'block' }}>{dateEnd ? 'Exit' : countryInfo.portLabel}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2C2C2C', fontWeight: 600 }}>{dateEnd ? new Date(dateEnd + 'T12:00:00Z').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' }) : cityInfo?.portName ?? entry.city ?? '\u2014'}</span>
          </div>
          <div className="text-right">
            <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '7px', fontWeight: 600, letterSpacing: '0.15em', color: '#8B7355', textTransform: 'uppercase', display: 'block' }}>Duration</span>
            <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#2C2C2C', fontWeight: 600 }}>{duration ?? 'TRANSIT'}</span>
          </div>
        </div>

        {/* Bearers */}
        {entry.participants.length > 0 && (
          <div className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid rgba(27,58,92,0.08)' }}>
            <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '8px', fontWeight: 600, letterSpacing: '0.2em', color: '#8B7355', textTransform: 'uppercase', writingMode: 'vertical-lr', transform: 'rotate(180deg)' }}>Bearers</span>
            <div className="flex gap-3.5 flex-1">
              {entry.participants.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar src={p.avatar_url} name={p.display_name} size="xs" />
                  <div className="flex flex-col">
                    <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '11px', fontWeight: 600, color: '#2C2C2C', lineHeight: '1.2' }}>{p.display_name.split(' ')[0]}</span>
                    <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '8px', color: '#8B7355', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{aliasDisplay(p.alias, p.full_alias)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* One-liner + stamp */}
        <div className="flex items-end gap-3 mt-3">
          <div className="flex-1 min-w-0">
            {oneliner && <p className="px-1" style={{ fontFamily: "'Playfair Display', Georgia, serif", fontStyle: 'italic', fontSize: '12px', color: '#5A6B7A', lineHeight: 1.55 }}>&ldquo;{oneliner}&rdquo;</p>}
          </div>
          {stamp?.image_url ? (
            <img src={stamp.image_url} alt="Mission stamp" style={{ width: '72px', height: '72px', borderRadius: '50%', transform: 'rotate(-12deg)', opacity: 0.5, filter: 'sepia(0.15)', flexShrink: 0 }} draggable={false} />
          ) : (
            <div style={{ width: '64px', height: '64px', border: `2.5px solid ${countryInfo.accent}`, borderRadius: '50%', transform: 'rotate(-12deg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', opacity: 0.45, padding: '4px', flexShrink: 0 }}>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '7px', fontWeight: 700, color: countryInfo.accent, textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.15 }}>{entry.city ?? entry.title}</span>
              <span style={{ fontFamily: 'Georgia, serif', fontSize: '6px', color: countryInfo.accent, marginTop: '2px' }}>{monthYear(entry.date)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     DEBRIEF SECTION — shared
     ══════════════════════════════════════════════════════════════════════════ */

  const debriefSection = (
    <>
      {missionDebrief ? (
        <div className="rounded-xl border border-gold/[0.12] bg-gold/[0.04] p-5">
          <div className="flex items-center justify-between mb-4">
            <span className="inline-block text-[9px] font-body font-semibold tracking-[0.2em] text-gold uppercase border border-gold/30 px-2.5 py-1 rounded">Classified</span>
            <ListenButton cacheKey={`${entry.id}-debrief`} text={missionDebrief} size="sm" />
          </div>
          <p className="text-[13px] text-ivory/70 font-body leading-relaxed whitespace-pre-wrap mb-4">{missionDebrief}</p>
          {landmarks.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {landmarks.map((l, i) => <span key={i} className="text-[10px] text-gold font-body bg-gold/[0.08] border border-gold/15 px-2.5 py-0.5 rounded-full">{l}</span>)}
            </div>
          )}
          {debriefHighlights.length > 0 && (
            <div className="flex flex-col gap-2 mb-4">
              {debriefHighlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="font-display text-sm font-bold text-gold/50 min-w-[18px]">{i + 1}.</span>
                  <span className="text-xs text-ivory/65 font-body leading-relaxed">{h}</span>
                </div>
              ))}
            </div>
          )}
          {riskAssessment && (
            <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2.5 mb-3">
              <p className="text-[9px] font-mono tracking-[0.2em] text-amber-400/60 uppercase mb-1">Risk Assessment</p>
              <p className="text-[11px] text-amber-400/80 font-body italic leading-relaxed">{riskAssessment}</p>
            </div>
          )}
          {isCreator && (
            <button type="button" onClick={handleGenerateDebrief} disabled={generatingDebrief} className="flex items-center gap-1.5 text-[10px] text-ivory-dim/50 hover:text-gold font-body transition-colors disabled:opacity-40 mx-auto pt-1">
              <RefreshCw size={10} className={generatingDebrief ? 'animate-spin' : ''} /> Regenerate
            </button>
          )}
        </div>
      ) : isCreator ? (
        <button type="button" onClick={handleGenerateDebrief} disabled={generatingDebrief} className="w-full py-3.5 rounded-xl border border-gold/[0.12] bg-gold/[0.04] flex items-center justify-center gap-2 text-xs text-ivory-dim font-body hover:bg-gold/[0.08] transition-colors disabled:opacity-40">
          {generatingDebrief ? <><RefreshCw size={14} className="animate-spin" /> Generating debrief...</> : <><Sparkles size={14} className="text-gold/60" /> Generate Mission Debrief</>}
        </button>
      ) : null}
    </>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     CONTROLS — expandable
     ══════════════════════════════════════════════════════════════════════════ */

  const controlsSection = controlsSlot && (
    <>
      <div className="mt-6">
        <button type="button" onClick={() => setControlsExpanded(v => !v)} className="w-full flex items-center justify-center gap-2 py-3 text-xs text-ivory-dim/60 font-body tracking-wide hover:text-ivory-dim transition-colors">
          <span>{controlsExpanded ? 'Less' : 'More'}</span>
          <motion.div animate={{ rotate: controlsExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}><ChevronDown size={14} /></motion.div>
        </button>
      </div>
      {controlsExpanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="space-y-6 overflow-hidden">
          {controlsSlot}
        </motion.div>
      )}
    </>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     DOT INDICATORS
     ══════════════════════════════════════════════════════════════════════════ */

  const dotNav = isMultiDay && (
    <div className="sticky bottom-0 z-10 flex items-center justify-center gap-1.5 py-3 bg-gradient-to-t from-obsidian via-obsidian/95 to-transparent">
      <button type="button" onClick={() => scrollToPage(Math.max(0, activePage - 1))} className="text-ivory-dim/40 hover:text-gold transition-colors p-1" aria-label="Previous page">
        <ChevronLeft size={14} />
      </button>
      {Array.from({ length: totalPages }).map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => scrollToPage(i)}
          className={cn(
            'rounded-full transition-all duration-200',
            i === activePage ? 'w-6 h-1.5 bg-gold' : 'w-1.5 h-1.5 bg-ivory-dim/30 hover:bg-ivory-dim/50',
          )}
          aria-label={`Page ${i + 1}`}
        />
      ))}
      <button type="button" onClick={() => scrollToPage(Math.min(totalPages - 1, activePage + 1))} className="text-ivory-dim/40 hover:text-gold transition-colors p-1" aria-label="Next page">
        <ChevronRight size={14} />
      </button>
    </div>
  )

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER — Multi-day dossier (swipeable) vs single-day (scrollable)
     ══════════════════════════════════════════════════════════════════════════ */

  if (isMultiDay) {
    return (
      <div className="py-5 relative">
        {/* Carousel nav chevrons — fixed to viewport center, z-10 to stay below modals */}
        {activePage > 0 && (
          <button
            type="button"
            className="fixed left-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-gold/20 flex items-center justify-center"
            onClick={() => scrollToPage(activePage - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft size={16} className="text-gold/70" />
          </button>
        )}
        {activePage < totalPages - 1 && (
          <button
            type="button"
            className="fixed right-1 top-1/2 -translate-y-1/2 z-10 w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-gold/20 flex items-center justify-center"
            onClick={() => scrollToPage(activePage + 1)}
            aria-label="Next page"
          >
            <ChevronRight size={16} className="text-gold/70" />
          </button>
        )}

        {/* Horizontal scroll-snap carousel — height matches active slide */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex overflow-x-auto overflow-y-hidden scrollbar-hide items-start"
          style={{ scrollbarWidth: 'none', height: carouselHeight ? `${carouselHeight}px` : undefined, transition: 'height 0.3s ease', touchAction: 'pan-y' }}
        >
          {/* PAGE 1: Visa Card + Intelligence Report */}
          <div ref={el => { slideRefs.current[0] = el }} className="shrink-0 w-full px-4">
            {visaCard}

            {/* City timeline */}
            {cityVisit && cityVisit.totalVisits > 1 && (
              <div className="mt-5 px-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[8px] font-body font-semibold tracking-[0.25em] text-gold/50 uppercase">{entry.city} Timeline</span>
                  <span className="text-[8px] font-mono text-ivory-dim/40">{cityVisit.totalVisits} missions</span>
                </div>
                <div className="flex items-center gap-1">
                  {[...cityVisit.companions, { id: entry.id, date: entry.date, title: entry.title }]
                    .sort((a, b) => a.date.localeCompare(b.date))
                    .map(v => {
                      const isCurrent = v.id === entry.id
                      return (
                        <div key={v.id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                          <div className={cn('w-full h-1 rounded-full', isCurrent ? 'bg-gold' : 'bg-gold/20')} />
                          <span className={cn('text-[7px] font-mono truncate max-w-full', isCurrent ? 'text-gold font-semibold' : 'text-ivory-dim/40')}>
                            {new Date(v.date + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })}
                          </span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}

            {/* Intelligence Report — below visa on first slide */}
            <div className="mt-5">
              <SectionDivider label="Intelligence Report" />
              {debriefSection}
            </div>
          </div>

          {/* DAY PAGES */}
          {dayEpisodes.map((day, dayIdx) => {
            const dayPhotos = day.photoIds.map(id => photoById.get(id)).filter(Boolean) as EntryPhoto[]
            const dayLore = loreByDay[dayIdx] ?? []
            const heroPhoto = dayPhotos[0] ?? null
            const supportingPhotos = dayPhotos.slice(1)
            const dayNarrative = dayLore[0] ?? null
            return (
              <div key={day.day} ref={el => { slideRefs.current[dayIdx + 1] = el }} className="shrink-0 w-full px-4 flex flex-col">
                {/* Day header */}
                <div className="mb-3 shrink-0">
                  <p className="text-[10px] font-body font-semibold tracking-[0.2em] text-gold/50 uppercase mb-1">
                    {day.label}
                  </p>
                  <div className="h-px bg-gradient-to-r from-gold/30 to-transparent" />
                </div>

                {/* Per-day lore — above photos */}
                {dayNarrative && (
                  <div className="pb-3 shrink-0">
                    <div className="flex items-start justify-between gap-2 px-1">
                      <p className="font-display italic text-ivory/80 text-[14px] leading-relaxed flex-1">
                        {dayNarrative}
                      </p>
                      <ListenButton cacheKey={`${entry.id}-day-${dayIdx}`} text={dayNarrative} size="sm" />
                    </div>
                  </div>
                )}

                {/* Hero photo */}
                {heroPhoto && (
                  <button
                    type="button"
                    className="relative rounded-lg overflow-hidden mb-2 shrink-0 w-full text-left"
                    style={{ aspectRatio: '16/9' }}
                    onClick={() => onSetAsCover?.(heroPhoto.url)}
                    disabled={!onSetAsCover}
                  >
                    <img src={heroPhoto.url} alt="" className="w-full h-full object-cover" draggable={false} />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  </button>
                )}

                {/* Supporting photos — 3-col grid */}
                {supportingPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 mb-3 shrink-0">
                    {supportingPhotos.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        className="aspect-square rounded-md overflow-hidden border border-gold/10"
                        onClick={() => onSetAsCover?.(p.url)}
                        disabled={!onSetAsCover}
                      >
                        <img src={p.url} alt="" className="w-full h-full object-cover" draggable={false} />
                      </button>
                    ))}
                  </div>
                )}

                {dayPhotos.length === 0 && !dayNarrative && (
                  <p className="text-xs text-ivory-dim/40 font-body italic text-center py-8">No records for this day</p>
                )}
              </div>
            )
          })}

        </div>

        {/* Dot navigation */}
        {dotNav}

        {/* Director's notes + controls below carousel */}
        <div className="px-4">
          {/* Lore section — always show (contains Director's Notes input) */}
          {loreSlot && <div className="mt-2">{loreSlot}</div>}
          <div className="mt-4">
            <SoundtrackSection entry={entry} isCreator={isCreator} onEntryUpdate={onEntryUpdate} />
          </div>
          {controlsSection}
        </div>

        <div className="h-8" />
      </div>
    )
  }

  /* ── Single-day fallback (original magazine layout) ── */

  const photosForPairs = photos.slice(1)
  const photoPairs: EntryPhoto[][] = []
  for (let i = 0; i < photosForPairs.length; i += 2) {
    photoPairs.push(photosForPairs.slice(i, i + 2))
  }

  return (
    <div className="px-4 py-5 space-y-0">
      {visaCard}

      {/* City timeline */}
      {cityVisit && cityVisit.totalVisits > 1 && (
        <div className="mt-5 px-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[8px] font-body font-semibold tracking-[0.25em] text-gold/50 uppercase">{entry.city} Timeline</span>
            <span className="text-[8px] font-mono text-ivory-dim/40">{cityVisit.totalVisits} missions</span>
          </div>
          <div className="flex items-center gap-1">
            {[...cityVisit.companions, { id: entry.id, date: entry.date, title: entry.title }]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(v => {
                const isCurrent = v.id === entry.id
                return (
                  <div key={v.id} className="flex flex-col items-center gap-1 flex-1 min-w-0">
                    <div className={cn('w-full h-1 rounded-full', isCurrent ? 'bg-gold' : 'bg-gold/20')} />
                    <span className={cn('text-[7px] font-mono truncate max-w-full', isCurrent ? 'text-gold font-semibold' : 'text-ivory-dim/40')}>
                      {new Date(v.date + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })}
                    </span>
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Magazine story */}
      {(entry.lore || photos.length > 0) && (
        <>
          <SectionDivider label="The Mission" />
          {(photos[0]?.url || coverPhoto) && (
            <div className="relative rounded-lg overflow-hidden mb-5" style={{ aspectRatio: '16/9' }}>
              <img src={photos[0]?.url ?? coverPhoto!} alt="" className="w-full h-full object-cover" draggable={false} />
            </div>
          )}
          {paragraphs.map((p, i) => (
            <div key={i}>
              <p className={cn('font-display text-[15px] text-ivory/85 leading-[1.7] mb-5', i === 0 && 'first-letter:text-[48px] first-letter:float-left first-letter:leading-[1] first-letter:mr-2 first-letter:text-gold first-letter:font-bold')}>{p}</p>
              {photoPairs[i] && (
                <div className="grid grid-cols-2 gap-2 mb-5">
                  {photoPairs[i].map(photo => <img key={photo.id} src={photo.url} alt={photo.caption ?? ''} className="w-full aspect-square object-cover rounded-md border border-gold/10" draggable={false} />)}
                </div>
              )}
            </div>
          ))}
          {paragraphs.length === 0 && photoPairs.map((pair, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 mb-4">
              {pair.map(photo => <img key={photo.id} src={photo.url} alt={photo.caption ?? ''} className="w-full aspect-square object-cover rounded-md border border-gold/10" draggable={false} />)}
            </div>
          ))}
        </>
      )}

      {loreSlot && <div className="mt-2">{loreSlot}</div>}

      <div className="mt-4">
        <SoundtrackSection entry={entry} isCreator={isCreator} onEntryUpdate={onEntryUpdate} />
      </div>

      <SectionDivider label="Intelligence Report" />
      {debriefSection}
      {controlsSection}

      <div className="h-8" />
    </div>
  )
}
