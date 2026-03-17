import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Avatar, Spinner, Button } from '@/components/ui'
import { fetchStamp } from '@/data/stamps'
import { fetchEntry, fetchEntryPhotos, updateEntry } from '@/data/entries'
import { flagEmoji } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'
import { generateMissionDebrief } from '@/ai/debrief'
import { Sparkles, RefreshCw, ChevronDown } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import type { PassportStamp, EntryWithParticipants } from '@/types/app'

interface EntryPhoto {
  id: string
  url: string
  caption: string | null
  sort_order: number
  taken_by: string | null
}

/** Country code → visa header word */
function visaWord(cc: string | null): string {
  if (!cc) return 'ENTRY VISA'
  const map: Record<string, string> = { HR: 'VIZA', RS: '\u0412\u0418\u0417\u0410', BA: 'VIZA', HU: 'VIZA', ME: 'VIZA', SI: 'VIZUM' }
  return map[cc.toUpperCase()] ?? 'ENTRY VISA'
}

/** Format date as "MONTH YEAR" */
function monthYear(date: string): string {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(date)).toUpperCase()
}

/** Extract lore one-liner from metadata or first sentence of lore */
function getOneliner(entry: EntryWithParticipants): string | null {
  const meta = entry.metadata as Record<string, unknown> | undefined
  const oneliner = meta?.lore_oneliner as string | undefined
  if (oneliner) return oneliner
  if (entry.lore) {
    const match = entry.lore.match(/^[^.!?]+[.!?]/)
    return match ? match[0] : entry.lore.slice(0, 120)
  }
  return null
}

export default function VisaPage() {
  const { stampId } = useParams<{ stampId: string }>()
  const navigate = useNavigate()

  const [stamp, setStamp] = useState<PassportStamp | null>(null)
  const [entry, setEntry] = useState<EntryWithParticipants | null>(null)
  const [photos, setPhotos] = useState<EntryPhoto[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [generatingDebrief, setGeneratingDebrief] = useState(false)
  const [debriefOpen, setDebriefOpen] = useState(false)
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
        setDebriefOpen(true)
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

  // Loading
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

  // Not found
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

  const dateEnd = entry.metadata?.date_end as string | undefined
  const dateDisplay = dateEnd
    ? `${monthYear(entry.date)} \u2013 ${monthYear(dateEnd)}`
    : monthYear(entry.date)

  const cc = entry.country_code?.toUpperCase() ?? null
  const oneliner = getOneliner(entry)

  const meta = entry.metadata as Record<string, unknown> | undefined
  const missionDebrief = meta?.mission_debrief as string | undefined
  const landmarks = Array.isArray(meta?.landmarks) ? meta.landmarks as string[] : []
  const debriefHighlights = Array.isArray(meta?.debrief_highlights) ? meta.debrief_highlights as string[] : []
  const riskAssessment = meta?.risk_assessment as string | undefined

  const participantCount = entry.participants?.length ?? 0
  const gentsDisplay = participantCount > 3 ? `3+${participantCount - 3}` : String(participantCount)

  const coverPhoto = entry.cover_image_url ?? photos[0]?.url ?? null

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
          {/* ═══ VISA CARD ═══ */}
          <div
            className="relative overflow-hidden rounded-lg"
            style={{
              background: '#F5F0E1',
              boxShadow: '0 4px 24px rgba(0,0,0,0.3), inset 0 0 0 1px rgba(100,160,120,0.15)',
            }}
          >
            {/* Guilloche-inspired border */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                border: '10px solid transparent',
                borderImage: 'repeating-linear-gradient(45deg, rgba(100,160,120,0.18), rgba(100,160,120,0.08) 3px, transparent 3px, transparent 6px) 10',
              }}
            />

            {/* Europe map watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.04]">
              <svg viewBox="0 0 400 300" className="w-56 h-42" fill="none" stroke="#3a7a5a" strokeWidth="0.8">
                <path d="M180 40 C200 35 220 38 235 45 L250 42 C260 48 265 55 260 65 L270 75 C280 70 290 78 285 88 L290 100 C285 110 275 115 265 110 L255 120 C260 130 255 140 245 145 L235 155 C230 165 220 170 210 168 L200 175 C195 185 185 190 175 185 L165 180 C155 185 145 180 140 170 L130 165 C120 168 110 160 115 150 L108 140 C100 135 98 125 105 118 L110 108 C105 98 110 88 120 85 L125 75 C120 65 128 55 138 52 L145 45 C150 38 160 35 170 40 Z" />
              </svg>
            </div>

            <div className="relative z-10 px-5 py-5">
              {/* Header */}
              <p
                className="text-center mb-4"
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                  color: '#1B3A5C',
                  fontVariant: 'small-caps',
                }}
              >
                Vize-{'\u0412\u0438\u0437\u0435'}-Visas
              </p>

              {/* Row 1: Flag + VIZA + Polaroid photo */}
              <div className="relative mb-4">
                <div className="flex items-start gap-2.5">
                  {cc && (
                    <span className="text-[32px] leading-none mt-1">{flagEmoji(cc)}</span>
                  )}
                  <span
                    style={{
                      fontFamily: "'Playfair Display', Georgia, serif",
                      fontSize: '42px',
                      fontWeight: 700,
                      color: '#1B3A5C',
                      letterSpacing: '0.06em',
                      lineHeight: 1,
                    }}
                  >
                    {visaWord(cc)}
                  </span>
                </div>

                {/* Polaroid cover photo */}
                {coverPhoto && (
                  <div
                    className="absolute right-0 top-0"
                    style={{ transform: 'rotate(5deg)' }}
                  >
                    {/* Tape */}
                    <div
                      className="absolute -top-1 right-3 z-10"
                      style={{
                        width: '28px',
                        height: '8px',
                        background: 'rgba(200,190,170,0.55)',
                        transform: 'rotate(-12deg)',
                        borderRadius: '1px',
                      }}
                    />
                    <div
                      style={{
                        width: '110px',
                        height: '88px',
                        padding: '4px',
                        background: '#fff',
                        boxShadow: '1px 2px 8px rgba(0,0,0,0.12)',
                      }}
                    >
                      <img
                        src={coverPhoto}
                        alt="Cover"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        draggable={false}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Data fields */}
              <div className="space-y-3 mt-6">
                <div className="flex items-baseline" style={{ borderBottom: '1px solid rgba(27,58,92,0.08)', paddingBottom: '8px' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '10px', fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.05em', textTransform: 'uppercase', width: '140px', flexShrink: 0 }}>
                    Destination:
                  </span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                    {entry.city?.toUpperCase() ?? entry.location?.toUpperCase() ?? '\u2014'}
                  </span>
                </div>

                <div className="flex items-baseline" style={{ borderBottom: '1px solid rgba(27,58,92,0.08)', paddingBottom: '8px' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '10px', fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.05em', textTransform: 'uppercase', width: '140px', flexShrink: 0 }}>
                    Date of Trip:
                  </span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                    {dateDisplay}
                  </span>
                </div>

                <div className="flex items-baseline" style={{ borderBottom: '1px solid rgba(27,58,92,0.08)', paddingBottom: '8px' }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '10px', fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.05em', textTransform: 'uppercase', width: '140px', flexShrink: 0 }}>
                    Number of Gents:
                  </span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: '14px', color: '#2C2C2C', fontWeight: 500 }}>
                    {gentsDisplay}
                  </span>
                </div>
              </div>

              {/* Lore one-liner */}
              {oneliner && (
                <p
                  className="text-center mt-5 px-2"
                  style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: '13px',
                    color: '#8B7355',
                    lineHeight: 1.5,
                  }}
                >
                  &ldquo;{oneliner}&rdquo;
                </p>
              )}

              {/* Mission stamp */}
              {stamp.image_url ? (
                <div className="flex justify-center mt-5">
                  <img
                    src={stamp.image_url}
                    alt="Mission stamp"
                    className="rounded-full"
                    style={{
                      width: '110px',
                      height: '110px',
                      transform: 'rotate(-6deg)',
                      opacity: 0.7,
                      filter: 'sepia(0.2)',
                    }}
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="flex justify-center mt-5">
                  <div
                    style={{
                      width: '110px',
                      height: '110px',
                      border: '3px solid #8B4513',
                      borderRadius: '8px',
                      transform: 'rotate(-6deg)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      color: '#8B4513',
                      opacity: 0.6,
                      padding: '8px',
                    }}
                  >
                    <span style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.2 }}>
                      {entry.title}
                    </span>
                    <span style={{ fontSize: '8px', marginTop: '4px' }}>
                      {monthYear(entry.date)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══ BELOW THE VISA CARD ═══ */}
          <div className="mt-5 space-y-4">

            {/* Participants */}
            {entry.participants.length > 0 && (
              <div className="flex items-center gap-3 px-1">
                {entry.participants.map(p => (
                  <div key={p.id} className="flex flex-col items-center gap-1">
                    <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                    <span className="text-[10px] text-ivory-dim font-body">{p.display_name}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Photo strip */}
            {photos.length > 0 && (
              <div className="overflow-x-auto no-scrollbar flex gap-2">
                {photos.slice(0, 6).map(photo => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt={photo.caption ?? 'Mission photo'}
                    className="h-20 w-auto rounded-lg border border-white/10 object-cover shrink-0"
                    draggable={false}
                  />
                ))}
              </div>
            )}

            {/* Mission Debrief — expandable */}
            {missionDebrief ? (
              <div className="rounded-xl border border-white/5 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDebriefOpen(!debriefOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-xs text-ivory-dim font-body tracking-wide uppercase">Mission Debrief</span>
                  <ChevronDown
                    size={14}
                    className={`text-ivory-dim transition-transform duration-200 ${debriefOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                <AnimatePresence>
                  {debriefOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 space-y-3">
                        {/* Classified header */}
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-red-700/20" />
                          <span className="text-[10px] font-mono tracking-[0.3em] text-red-700/50 uppercase">Classified</span>
                          <div className="h-px flex-1 bg-red-700/20" />
                        </div>

                        {/* Debrief text */}
                        <p className="text-xs text-ivory-dim/90 font-body leading-relaxed whitespace-pre-wrap">{missionDebrief}</p>

                        {/* Landmarks */}
                        {landmarks.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {landmarks.map((l, i) => (
                              <span key={i} className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-0.5 text-[10px] text-gold-muted font-body">
                                {l}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Highlights */}
                        {debriefHighlights.length > 0 && (
                          <div>
                            <p className="text-[10px] font-mono tracking-[0.2em] text-gold/40 uppercase mb-1.5">Key Moments</p>
                            <ol className="space-y-1 list-decimal list-inside">
                              {debriefHighlights.map((h, i) => (
                                <li key={i} className="text-[11px] text-ivory-dim/80 font-body leading-relaxed">{h}</li>
                              ))}
                            </ol>
                          </div>
                        )}

                        {/* Risk Assessment */}
                        {riskAssessment && (
                          <div className="rounded-lg border border-amber-700/20 bg-amber-700/5 px-3 py-2.5">
                            <p className="text-[9px] font-mono tracking-[0.2em] text-amber-400/60 uppercase mb-1">Risk Assessment</p>
                            <p className="text-[11px] text-ivory-dim font-body italic">{riskAssessment}</p>
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
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleGenerateDebrief}
                disabled={generatingDebrief}
                className="w-full py-3 rounded-xl border border-white/8 flex items-center justify-center gap-2 text-xs text-ivory-dim font-body hover:bg-white/3 transition-colors disabled:opacity-40"
              >
                {generatingDebrief ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Generating debrief...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    Generate Mission Debrief
                  </>
                )}
              </button>
            )}

            {/* View Full Entry */}
            <Button variant="outline" fullWidth onClick={handleViewEntry}>
              View Full Entry
            </Button>

            {/* Bottom padding */}
            <div className="h-6" />
          </div>
        </motion.div>
      </PageWrapper>
    </>
  )
}
