import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Avatar, Spinner, Button } from '@/components/ui'
import { fetchStamp } from '@/data/stamps'
import { fetchEntry, fetchEntryPhotos } from '@/data/entries'
import { formatDate, flagEmoji } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'
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

  const landmarks = Array.isArray(entry.metadata?.landmarks) ? entry.metadata.landmarks as string[] : []
  const missionDebrief = entry.metadata?.mission_debrief as string | undefined

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

            {/* Mission Debrief placeholder */}
            {missionDebrief && (
              <p className="text-sm text-ivory/60 font-body leading-relaxed mb-5">
                {missionDebrief}
              </p>
            )}

            {/* Photo strip */}
            {photos.length > 0 && (
              <div className="overflow-x-auto no-scrollbar flex gap-2 mb-5">
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

            {/* Landmarks */}
            {landmarks.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-5">
                {landmarks.map((landmark, i) => (
                  <span
                    key={i}
                    className="rounded-full border border-gold/20 bg-gold/5 px-2.5 py-0.5 text-[10px] text-gold font-body"
                  >
                    {landmark}
                  </span>
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
