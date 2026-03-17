import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Avatar, Spinner, Button } from '@/components/ui'
import { fetchStamp } from '@/data/stamps'
import { fetchEntry, fetchEntryPhotos, updateEntry } from '@/data/entries'
import { flagEmoji, cn, getCoverCrop } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'
import { generateMissionDebrief } from '@/ai/debrief'
import { Sparkles, RefreshCw } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import { getOneliner, visaWord, aliasDisplay } from '@/export/templates/shared/utils'
import type { PassportStamp, EntryWithParticipants } from '@/types/app'

interface EntryPhoto {
  id: string
  url: string
  caption: string | null
  sort_order: number
  taken_by: string | null
}

/* ── Helpers ── */

function monthYear(date: string): string {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(new Date(date)).toUpperCase()
}

function calcDuration(start: string, end?: string): string | null {
  if (!end) return null
  const s = new Date(start + 'T12:00:00Z')
  const e = new Date(end + 'T12:00:00Z')
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  return days <= 0 ? null : days === 1 ? '1 DAY' : `${days} DAYS`
}

function loreParagraphs(lore: string | null): string[] {
  if (!lore) return []
  return lore.split(/\n\n+/).filter(Boolean)
}

/* ── Sub-components ── */

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

export default function VisaPage() {
  const { stampId } = useParams<{ stampId: string }>()
  const navigate = useNavigate()

  const [stamp, setStamp] = useState<PassportStamp | null>(null)
  const [entry, setEntry] = useState<EntryWithParticipants | null>(null)
  const [photos, setPhotos] = useState<EntryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [generatingDebrief, setGeneratingDebrief] = useState(false)
  const addToast = useUIStore(s => s.addToast)

  useEffect(() => {
    if (!stampId) { setNotFound(true); setLoading(false); return }

    async function load() {
      try {
        const s = await fetchStamp(stampId!)
        if (!s || !s.entry_id) { setNotFound(true); setLoading(false); return }
        setStamp(s)

        const [e, p] = await Promise.all([
          fetchEntry(s.entry_id),
          fetchEntryPhotos(s.entry_id),
        ])

        if (!e) { setNotFound(true); setLoading(false); return }
        setEntry(e)
        setPhotos(p)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [stampId])

  const handleViewEntry = useCallback(() => {
    if (entry) navigate(`/chronicle/${entry.id}`)
  }, [entry, navigate])

  async function handleGenerateDebrief() {
    if (!entry || generatingDebrief) return
    setGeneratingDebrief(true)
    try {
      const urls = photos.map(p => p.url)
      const result = await generateMissionDebrief(entry, urls)
      if (result && result.debrief) {
        const meta = {
          ...(entry.metadata as Record<string, unknown> ?? {}),
          mission_debrief: result.debrief,
          landmarks: result.landmarks,
          debrief_highlights: result.highlights,
          risk_assessment: result.risk_assessment,
        }
        await updateEntry(entry.id, { metadata: meta } as Partial<EntryWithParticipants>)
        setEntry({ ...entry, metadata: meta })
        addToast('Mission debrief generated.', 'success')
      } else {
        addToast('Could not generate debrief. Try again.', 'error')
      }
    } catch (err) {
      console.error('Debrief generation failed:', err)
      addToast('Debrief generation failed.', 'error')
    } finally {
      setGeneratingDebrief(false)
    }
  }

  /* ── Loading / not found states ── */

  if (loading) {
    return (
      <>
        <TopBar title="Mission Dossier" back />
        <div className="flex items-center justify-center" style={{ height: 'calc(100dvh - 56px)' }}>
          <Spinner size="lg" />
        </div>
      </>
    )
  }

  if (notFound || !stamp || !entry) {
    return (
      <>
        <TopBar title="Mission Dossier" back />
        <PageWrapper>
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <p className="text-ivory-dim text-sm font-body">Mission not found</p>
            <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </div>
        </PageWrapper>
      </>
    )
  }

  /* ── Derived data ── */

  const dateEnd = entry.metadata?.date_end as string | undefined
  const duration = calcDuration(entry.date, dateEnd)
  const cc = entry.country_code?.toUpperCase() ?? null
  const oneliner = getOneliner(entry)
  const coverPhoto = entry.cover_image_url ?? photos[0]?.url ?? null
  const coverCrop = getCoverCrop(entry)

  const meta = entry.metadata as Record<string, unknown> | undefined
  const missionDebrief = meta?.mission_debrief as string | undefined
  const landmarks = Array.isArray(meta?.landmarks) ? meta.landmarks as string[] : []
  const debriefHighlights = Array.isArray(meta?.debrief_highlights) ? meta.debrief_highlights as string[] : []
  const riskAssessment = meta?.risk_assessment as string | undefined

  // Lore paragraphs + photo pairs for magazine layout
  const paragraphs = loreParagraphs(entry.lore)
  const photosForPairs = photos.slice(1) // skip first (hero)
  const photoPairs: EntryPhoto[][] = []
  for (let i = 0; i < photosForPairs.length; i += 2) {
    photoPairs.push(photosForPairs.slice(i, i + 2))
  }

  return (
    <>
      <TopBar title="Mission Dossier" back />
      <PageWrapper scrollable>
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="px-4 py-5"
        >

          {/* ═══════════════════════════════════════════
              VISA CARD — The Artifact
              ═══════════════════════════════════════════ */}
          <div
            className="relative overflow-hidden rounded-xl"
            style={{
              background: '#F5F0E1',
              boxShadow: '0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.15), inset 0 1px 0 rgba(255,255,255,0.3)',
            }}
          >
            {/* Guilloche border */}
            <div
              className="absolute inset-0 pointer-events-none z-10"
              style={{
                border: '8px solid transparent',
                borderImage: 'repeating-linear-gradient(45deg, rgba(27,58,92,0.06) 0px, rgba(27,58,92,0.03) 2px, transparent 2px, transparent 6px) 8',
              }}
            />

            {/* Europe map watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04] z-[1]">
              <svg viewBox="0 0 400 300" className="w-56" fill="none" stroke="#1B3A5C" strokeWidth="0.8">
                <path d="M180 40 C200 35 220 38 235 45 L250 42 C260 48 265 55 260 65 L270 75 C280 70 290 78 285 88 L290 100 C285 110 275 115 265 110 L255 120 C260 130 255 140 245 145 L235 155 C230 165 220 170 210 168 L200 175 C195 185 185 190 175 185 L165 180 C155 185 145 180 140 170 L130 165 C120 168 110 160 115 150 L108 140 C100 135 98 125 105 118 L110 108 C105 98 110 88 120 85 L125 75 C120 65 128 55 138 52 L145 45 C150 38 160 35 170 40 Z" />
              </svg>
            </div>

            {/* Header */}
            <div className="relative z-[2] pt-2.5 pb-1 text-center" style={{ background: 'linear-gradient(180deg, rgba(27,58,92,0.06) 0%, transparent 100%)' }}>
              <span
                style={{
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '0.25em',
                  color: '#1B3A5C',
                  textTransform: 'uppercase',
                }}
              >
                Vize &middot; {'\u0412\u0438\u0437\u0435'} &middot; Visas
              </span>
            </div>

            {/* ── Photo band ── */}
            {coverPhoto && (
              <div className="relative z-[2] h-40 overflow-hidden">
                <img
                  src={coverPhoto}
                  alt=""
                  className="w-full h-full object-cover"
                  style={{
                    objectPosition: `${coverCrop.x}% ${coverCrop.y}%`,
                    transform: coverCrop.scale !== 1 ? `scale(${coverCrop.scale})` : undefined,
                    filter: 'sepia(0.08) contrast(1.05)',
                  }}
                  draggable={false}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: 'linear-gradient(180deg, rgba(245,240,225,0.2) 0%, transparent 25%, transparent 55%, rgba(245,240,225,0.95) 100%)',
                  }}
                />
                {/* Flag + VIZA overlaid */}
                <div className="absolute bottom-2 left-5 flex items-center gap-2.5 z-[3]">
                  {cc && <span className="text-[28px] leading-none" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.15))' }}>{flagEmoji(cc)}</span>}
                  <span
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '38px',
                      fontWeight: 700,
                      color: '#1B3A5C',
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                      textShadow: '0 1px 3px rgba(245,240,225,0.8)',
                    }}
                  >
                    {visaWord(cc)}
                  </span>
                </div>
              </div>
            )}

            {/* ── Card body ── */}
            <div className="relative z-[2] px-5 pb-5 pt-3">

              {/* Destination — no labels */}
              <div className="mb-3">
                <p
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: '20px',
                    fontWeight: 700,
                    color: '#1B3A5C',
                    letterSpacing: '0.03em',
                    lineHeight: 1.15,
                  }}
                >
                  {(entry.city && entry.country) ? `${entry.city.toUpperCase()}, ${entry.country.toUpperCase()}` : entry.city?.toUpperCase() ?? entry.location?.toUpperCase() ?? '\u2014'}
                </p>
                <div className="flex items-center gap-2.5 mt-1">
                  <span
                    style={{
                      fontFamily: "'Instrument Sans', sans-serif",
                      fontSize: '11px',
                      color: '#5A6B7A',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {monthYear(entry.date)}
                  </span>
                  {duration && (
                    <span
                      style={{
                        fontFamily: "'Instrument Sans', sans-serif",
                        fontSize: '9px',
                        fontWeight: 600,
                        color: '#8B7355',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        background: 'rgba(139,115,85,0.1)',
                        padding: '2px 8px',
                        borderRadius: '3px',
                      }}
                    >
                      {duration}
                    </span>
                  )}
                </div>
              </div>

              {/* Bearer row */}
              {entry.participants.length > 0 && (
                <div className="flex items-center gap-3 py-3" style={{ borderTop: '1px solid rgba(27,58,92,0.08)', borderBottom: '1px solid rgba(27,58,92,0.08)' }}>
                  <span
                    style={{
                      fontFamily: "'Instrument Sans', sans-serif",
                      fontSize: '8px',
                      fontWeight: 600,
                      letterSpacing: '0.2em',
                      color: '#8B7355',
                      textTransform: 'uppercase',
                      writingMode: 'vertical-lr',
                      transform: 'rotate(180deg)',
                    }}
                  >
                    Bearers
                  </span>
                  <div className="flex gap-3.5 flex-1">
                    {entry.participants.map(p => (
                      <div key={p.id} className="flex items-center gap-2">
                        <Avatar src={p.avatar_url} name={p.display_name} size="xs" />
                        <div className="flex flex-col">
                          <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '11px', fontWeight: 600, color: '#2C2C2C', lineHeight: '1.2' }}>
                            {p.display_name.split(' ')[0]}
                          </span>
                          <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: '8px', color: '#8B7355', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                            {aliasDisplay(p.alias, p.full_alias)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* One-liner + stamp row */}
              <div className="flex items-end gap-3 mt-3">
                <div className="flex-1 min-w-0">
                  {oneliner && (
                    <p
                      className="px-1"
                      style={{
                        fontFamily: "'Playfair Display', Georgia, serif",
                        fontStyle: 'italic',
                        fontSize: '12px',
                        color: '#5A6B7A',
                        lineHeight: 1.55,
                      }}
                    >
                      &ldquo;{oneliner}&rdquo;
                    </p>
                  )}
                </div>
                {/* Stamp */}
                {stamp.image_url ? (
                  <img
                    src={stamp.image_url}
                    alt="Mission stamp"
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '50%',
                      transform: 'rotate(-12deg)',
                      opacity: 0.5,
                      filter: 'sepia(0.15)',
                      flexShrink: 0,
                    }}
                    draggable={false}
                  />
                ) : (
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      border: '2.5px solid #8B4513',
                      borderRadius: '50%',
                      transform: 'rotate(-12deg)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      opacity: 0.45,
                      padding: '4px',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: '7px', fontWeight: 700, color: '#8B4513', textTransform: 'uppercase', letterSpacing: '0.06em', lineHeight: 1.15 }}>
                      {entry.city ?? entry.title}
                    </span>
                    <span style={{ fontFamily: 'Georgia, serif', fontSize: '6px', color: '#8B4513', marginTop: '2px' }}>
                      {monthYear(entry.date)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════
              MAGAZINE STORY — Below the Card
              ═══════════════════════════════════════════ */}

          {/* The Mission — hero photo + lore + interspersed photos */}
          {(entry.lore || photos.length > 0) && (
            <>
              <SectionDivider label="The Mission" />

              {/* Hero photo */}
              {(photos[0]?.url || coverPhoto) && (
                <div className="relative rounded-lg overflow-hidden mb-5" style={{ aspectRatio: '16/9' }}>
                  <img
                    src={photos[0]?.url ?? coverPhoto!}
                    alt=""
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {photos[0]?.caption && (
                    <div className="absolute bottom-0 inset-x-0 px-3 pb-2 pt-5" style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.5))' }}>
                      <span className="text-[11px] text-white/70 font-body italic">{photos[0].caption}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Lore narrative with interspersed photos */}
              {paragraphs.length > 0 && paragraphs.map((p, i) => (
                <div key={i}>
                  <p
                    className={cn('font-display text-[15px] text-ivory/85 leading-[1.7] mb-5', i === 0 && 'first-letter:text-[48px] first-letter:float-left first-letter:leading-[1] first-letter:mr-2 first-letter:text-gold first-letter:font-bold')}
                  >
                    {p}
                  </p>

                  {/* Photo pair after this paragraph */}
                  {photoPairs[i] && (
                    <div className="grid grid-cols-2 gap-2 mb-5">
                      {photoPairs[i].map(photo => (
                        <img
                          key={photo.id}
                          src={photo.url}
                          alt={photo.caption ?? ''}
                          className="w-full aspect-square object-cover rounded-md border border-gold/10"
                          draggable={false}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* If no lore but photos exist, show remaining photo pairs */}
              {paragraphs.length === 0 && photoPairs.map((pair, i) => (
                <div key={i} className="grid grid-cols-2 gap-2 mb-4">
                  {pair.map(photo => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.caption ?? ''}
                      className="w-full aspect-square object-cover rounded-md border border-gold/10"
                      draggable={false}
                    />
                  ))}
                </div>
              ))}
            </>
          )}

          {/* Intelligence Report — debrief */}
          <SectionDivider label="Intelligence Report" />

          {missionDebrief ? (
            <div className="rounded-xl border border-gold/[0.12] bg-gold/[0.04] p-5">
              {/* Classified badge */}
              <span className="inline-block text-[9px] font-body font-semibold tracking-[0.2em] text-gold uppercase border border-gold/30 px-2.5 py-1 rounded mb-4">
                Classified
              </span>

              {/* Debrief text */}
              <p className="text-[13px] text-ivory/70 font-body leading-relaxed whitespace-pre-wrap mb-4">{missionDebrief}</p>

              {/* Landmarks */}
              {landmarks.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {landmarks.map((l, i) => (
                    <span key={i} className="text-[10px] text-gold font-body bg-gold/[0.08] border border-gold/15 px-2.5 py-0.5 rounded-full">
                      {l}
                    </span>
                  ))}
                </div>
              )}

              {/* Key Moments */}
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

              {/* Risk Assessment */}
              {riskAssessment && (
                <div className="rounded-lg border border-amber-500/15 bg-amber-500/[0.06] px-3 py-2.5 mb-3">
                  <p className="text-[9px] font-mono tracking-[0.2em] text-amber-400/60 uppercase mb-1">Risk Assessment</p>
                  <p className="text-[11px] text-amber-400/80 font-body italic leading-relaxed">{riskAssessment}</p>
                </div>
              )}

              {/* Regenerate */}
              <button
                type="button"
                onClick={handleGenerateDebrief}
                disabled={generatingDebrief}
                className="flex items-center gap-1.5 text-[10px] text-ivory-dim/50 hover:text-gold font-body transition-colors disabled:opacity-40 mx-auto pt-1"
              >
                <RefreshCw size={10} className={generatingDebrief ? 'animate-spin' : ''} />
                Regenerate
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGenerateDebrief}
              disabled={generatingDebrief}
              className="w-full py-3.5 rounded-xl border border-gold/[0.12] bg-gold/[0.04] flex items-center justify-center gap-2 text-xs text-ivory-dim font-body hover:bg-gold/[0.08] transition-colors disabled:opacity-40"
            >
              {generatingDebrief ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  Generating debrief...
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-gold/60" />
                  Generate Mission Debrief
                </>
              )}
            </button>
          )}

          {/* View Full Entry */}
          <div className="mt-6">
            <Button variant="outline" fullWidth onClick={handleViewEntry}>
              View Full Entry
            </Button>
          </div>

          <div className="h-8" />
        </motion.div>
      </PageWrapper>
    </>
  )
}
