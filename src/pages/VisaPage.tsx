import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Avatar, Spinner, Button } from '@/components/ui'
import { fetchStamp } from '@/data/stamps'
import { fetchEntry, fetchEntryPhotos, updateEntry } from '@/data/entries'
import { formatDate, flagEmoji } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'
import { generateMissionDebrief } from '@/ai/debrief'
import { Sparkles, RefreshCw } from 'lucide-react'
import { useUIStore } from '@/store/ui'
import type { PassportStamp, EntryWithParticipants } from '@/types/app'

interface EntryPhoto {
  id: string
  url: string
  caption: string | null
  sort_order: number
  taken_by: string | null
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
    ? `${formatDate(entry.date)} — ${formatDate(dateEnd)}`
    : formatDate(entry.date)

  const locationDisplay = entry.country_code
    ? `${flagEmoji(entry.country_code)}  ${entry.city ? `${entry.city}, ` : ''}${entry.country ?? ''}`
    : entry.city ?? entry.location ?? ''

  const meta = entry.metadata as Record<string, unknown> | undefined
  const missionDebrief = meta?.mission_debrief as string | undefined
  const landmarks = Array.isArray(meta?.landmarks) ? meta.landmarks as string[] : []
  const debriefHighlights = Array.isArray(meta?.debrief_highlights) ? meta.debrief_highlights as string[] : []
  const riskAssessment = meta?.risk_assessment as string | undefined

  return (
    <>
      <TopBar title="Mission Dossier" back />
      <PageWrapper scrollable>
        <motion.div
          variants={fadeUp}
          initial="initial"
          animate="animate"
          className="bg-gradient-to-br from-[#1a1610] via-[#0f0d0a] to-[#1a1610] min-h-[calc(100dvh-56px)] px-5 py-6"
        >
          <div className="relative">
            {/* Stamp image — absolute top-right */}
            {stamp.image_url && (
              <img
                src={stamp.image_url}
                alt="Mission stamp"
                className="absolute right-0 top-0 -rotate-[8deg] rounded-full ring-2 ring-gold/30 shadow-lg shadow-gold/10"
                style={{ width: 120, height: 120 }}
                draggable={false}
              />
            )}

            {/* Header */}
            <p className="font-mono text-[10px] tracking-[0.3em] text-gold/60 uppercase mb-2">
              Mission Dossier
            </p>

            {/* Title */}
            <h1 className={`font-display text-2xl text-ivory leading-snug ${stamp.image_url ? 'pr-32' : ''}`}>
              {entry.title}
            </h1>

            {/* Date */}
            <p className="font-mono text-[11px] text-ivory/40 mt-2">
              {dateDisplay}
            </p>

            {/* Location */}
            {locationDisplay && (
              <p className="font-mono text-xs text-ivory/40 mt-1">
                {locationDisplay}
              </p>
            )}

            {/* Participants */}
            {entry.participants.length > 0 && (
              <div className="flex items-start gap-3 mt-5">
                {entry.participants.map(p => (
                  <div key={p.id} className="flex flex-col items-center gap-1">
                    <Avatar src={p.avatar_url} name={p.display_name} size="sm" />
                    <span className="text-[10px] text-ivory/50 font-body">
                      {p.display_name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Divider */}
            <div className="h-px bg-gold/15 my-5" />

            {/* Lore */}
            {entry.lore && (
              <p className="font-display italic text-base text-gold/80 leading-relaxed mb-5">
                {entry.lore}
              </p>
            )}

            {/* Mission Debrief */}
            {(() => {
              if (missionDebrief) {
                return (
                  <>
                    {/* Divider */}
                    <div className="h-px bg-gold/15 my-5" />

                    {/* Classified header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-red-500/20" />
                      <span className="text-[10px] font-mono tracking-[0.3em] text-red-400/70 uppercase">Classified</span>
                      <div className="h-px flex-1 bg-red-500/20" />
                    </div>

                    {/* Debrief text */}
                    <p className="text-sm text-ivory/60 font-body leading-relaxed whitespace-pre-wrap">{missionDebrief}</p>

                    {/* Landmarks */}
                    {landmarks.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {landmarks.map((l, i) => (
                          <span key={i} className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-0.5 text-[10px] text-gold font-body">
                            {l}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Highlights */}
                    {debriefHighlights.length > 0 && (
                      <div className="mt-4">
                        <p className="text-[10px] font-mono tracking-[0.2em] text-gold/50 uppercase mb-2">Key Moments</p>
                        <ol className="space-y-1.5 list-decimal list-inside">
                          {debriefHighlights.map((h, i) => (
                            <li key={i} className="text-xs text-ivory/50 font-body leading-relaxed">{h}</li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {/* Risk Assessment */}
                    {riskAssessment && (
                      <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3">
                        <p className="text-[10px] font-mono tracking-[0.2em] text-amber-400/70 uppercase mb-1">Risk Assessment</p>
                        <p className="text-xs text-ivory/60 font-body italic">{riskAssessment}</p>
                      </div>
                    )}

                    {/* Regenerate button */}
                    <button
                      type="button"
                      onClick={handleGenerateDebrief}
                      disabled={generatingDebrief}
                      className="mt-3 flex items-center gap-1.5 text-[10px] text-ivory/40 hover:text-gold font-body transition-colors disabled:opacity-40 mx-auto"
                    >
                      <RefreshCw size={10} className={generatingDebrief ? 'animate-spin' : ''} />
                      Regenerate Debrief
                    </button>
                  </>
                )
              }

              // No debrief yet — always show generate button
              return (
                <>
                  <div className="h-px bg-gold/15 my-5" />
                  <button
                    type="button"
                    onClick={handleGenerateDebrief}
                    disabled={generatingDebrief}
                    className="w-full py-3 rounded-xl border border-gold/20 bg-gold/5 flex items-center justify-center gap-2 text-xs text-gold font-body hover:bg-gold/10 transition-colors disabled:opacity-40"
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
                </>
              )

              return null
            })()}

            {/* Photo strip */}
            {photos.length > 0 && (
              <div className="overflow-x-auto no-scrollbar flex gap-2 my-5">
                {photos.slice(0, 6).map(photo => (
                  <img
                    key={photo.id}
                    src={photo.url}
                    alt={photo.caption ?? 'Mission photo'}
                    className="h-24 w-auto rounded-lg border border-white/5 object-cover shrink-0"
                    draggable={false}
                  />
                ))}
              </div>
            )}

            {/* View Full Entry */}
            <Button variant="outline" fullWidth onClick={handleViewEntry}>
              View Full Entry
            </Button>

            {/* Bottom padding */}
            <div className="h-8" />
          </div>
        </motion.div>
      </PageWrapper>
    </>
  )
}
