import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { MoreVertical, MapPin, Calendar, Users, Wine, BookOpen, ChevronRight, Share2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner, Modal } from '@/components/ui'
import { CountdownBadge } from '@/components/gathering/CountdownBadge'
import { fetchGathering, fetchRsvps, fetchGuestBookMessages, markGatheringComplete } from '@/data/gatherings'
import { useUIStore } from '@/store/ui'
import { supabase } from '@/lib/supabase'
import { formatDate, cn } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/lib/animations'
import type { Entry, GatheringRsvp, GuestBookMessage, GatheringMetadata } from '@/types/app'

// ── Options menu ─────────────────────────────────────────────────────────────

interface OptionsMenuProps {
  isOpen: boolean
  onClose: () => void
  onMarkComplete: () => void
  completing: boolean
}

function OptionsMenu({ isOpen, onClose, onMarkComplete, completing }: OptionsMenuProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gathering Options">
      <div className="flex flex-col gap-1 pb-2">
        <button
          type="button"
          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors disabled:opacity-50"
          onClick={() => { onMarkComplete(); onClose() }}
          disabled={completing}
        >
          <BookOpen size={18} className="text-gold shrink-0" />
          <span className="font-body text-sm">Mark as Complete</span>
        </button>
      </div>
    </Modal>
  )
}

// ── RSVP badge ────────────────────────────────────────────────────────────────

function RsvpBadge({ response }: { response: GatheringRsvp['response'] }) {
  if (response === 'attending') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-body text-[10px] font-medium">
        Attending
      </span>
    )
  }
  if (response === 'not_attending') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 font-body text-[10px] font-medium">
        Not Attending
      </span>
    )
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 font-body text-[10px] font-medium">
      Maybe
    </span>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GatheringDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useUIStore()

  const [entry, setEntry] = useState<Entry | null>(null)
  const [rsvps, setRsvps] = useState<GatheringRsvp[]>([])
  const [messages, setMessages] = useState<GuestBookMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [optionsOpen, setOptionsOpen] = useState(false)
  const [completing, setCompleting] = useState(false)

  // Load data
  useEffect(() => {
    if (!id) return

    setLoading(true)
    Promise.all([
      fetchGathering(id),
      fetchRsvps(id),
      fetchGuestBookMessages(id),
    ])
      .then(([fetchedEntry, fetchedRsvps, fetchedMessages]) => {
        if (!fetchedEntry) {
          setNotFound(true)
        } else {
          setEntry(fetchedEntry)
          setRsvps(fetchedRsvps)
          setMessages(fetchedMessages)
        }
      })
      .catch(err => {
        console.error('Failed to load gathering:', err)
        addToast('Failed to load gathering', 'error')
      })
      .finally(() => setLoading(false))
  }, [id, addToast])

  // Real-time RSVP subscription
  useEffect(() => {
    if (!id) return

    const channel = supabase
      .channel(`rsvps:${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'gathering_rsvps',
          filter: `entry_id=eq.${id}`,
        },
        (payload) => {
          setRsvps(prev => [...prev, payload.new as GatheringRsvp])
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [id])

  async function handleMarkComplete() {
    if (!id) return
    setCompleting(true)
    try {
      await markGatheringComplete(id)
      addToast('Gathering marked as complete', 'success')
      // Reload entry data
      const updated = await fetchGathering(id)
      if (updated) setEntry(updated)
    } catch (err) {
      console.error('Failed to mark gathering complete:', err)
      addToast('Something went wrong. Please try again.', 'error')
    } finally {
      setCompleting(false)
    }
  }

  // ── Loading state ────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <>
        <TopBar title="Gathering" back />
        <PageWrapper>
          <div className="flex items-center justify-center h-48">
            <Spinner size="md" />
          </div>
        </PageWrapper>
      </>
    )
  }

  // ── Not found ─────────────────────────────────────────────────────────────────
  if (notFound || !entry) {
    return (
      <>
        <TopBar title="Gathering" back />
        <PageWrapper>
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-center">
            <p className="text-ivory-dim font-body text-sm">This gathering could not be found.</p>
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Go back</Button>
          </div>
        </PageWrapper>
      </>
    )
  }

  const meta = entry.metadata as unknown as GatheringMetadata
  const isPreEvent = entry.status === 'gathering_pre' || meta.phase === 'pre'

  // ── Pre-event view ────────────────────────────────────────────────────────────
  if (isPreEvent) {
    const attendingCount = rsvps.filter(r => r.response === 'attending').length
    const maybeCount = rsvps.filter(r => r.response === 'maybe').length

    return (
      <>
        <TopBar
          title={entry.title}
          back
          right={
            <button
              type="button"
              onClick={() => setOptionsOpen(true)}
              className="flex items-center justify-center text-ivory-muted hover:text-ivory transition-colors p-1"
              aria-label="Options"
            >
              <MoreVertical size={20} strokeWidth={2} />
            </button>
          }
        />

        <PageWrapper>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-6 pb-4"
          >

            {/* Countdown badge */}
            <motion.div variants={staggerItem} className="pt-1">
              <CountdownBadge eventDate={meta.event_date} />
            </motion.div>

            {/* Event details */}
            <motion.div variants={staggerItem} className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-ivory-muted font-body text-sm">
                <Calendar size={15} className="text-gold shrink-0" />
                <span>{formatDate(meta.event_date)}</span>
              </div>
              <div className="flex items-center gap-2 text-ivory-muted font-body text-sm">
                <MapPin size={15} className="text-gold shrink-0" />
                <span>
                  {meta.location}
                  {entry.city ? `, ${entry.city}` : ''}
                </span>
              </div>
            </motion.div>

            {/* Description */}
            {entry.description && (
              <motion.div variants={staggerItem}>
                <p className="font-body text-sm text-ivory leading-relaxed">{entry.description}</p>
              </motion.div>
            )}

            {/* Cocktail menu */}
            {meta.cocktail_menu && meta.cocktail_menu.length > 0 && (
              <motion.div variants={staggerItem} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Wine size={15} className="text-gold shrink-0" />
                  <h2 className="font-display text-base text-ivory">Cocktail Menu</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {meta.cocktail_menu.map(name => (
                    <span
                      key={name}
                      className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-light border border-white/10 text-ivory font-body text-xs"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Share links + QR code */}
            <motion.div variants={staggerItem} className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Share2 size={15} className="text-gold shrink-0" />
                <h2 className="font-display text-base text-ivory">Share</h2>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/g/${entry.id}`
                    navigator.clipboard.writeText(url).then(() => addToast('Invite link copied.', 'success')).catch(() => {})
                  }}
                  className="flex-1 bg-slate-mid border border-white/8 rounded-lg px-4 py-3 text-center hover:border-white/15 transition-colors"
                >
                  <p className="text-xs text-gold font-body font-semibold">Invite Link</p>
                  <p className="text-[10px] text-ivory-dim font-body mt-0.5">Copy to clipboard</p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}/g/${entry.id}/guestbook`
                    navigator.clipboard.writeText(url).then(() => addToast('Guestbook link copied.', 'success')).catch(() => {})
                  }}
                  className="flex-1 bg-slate-mid border border-white/8 rounded-lg px-4 py-3 text-center hover:border-white/15 transition-colors"
                >
                  <p className="text-xs text-gold font-body font-semibold">Guestbook Link</p>
                  <p className="text-[10px] text-ivory-dim font-body mt-0.5">Copy to clipboard</p>
                </button>
              </div>
              {/* QR code for guestbook */}
              <div className="flex flex-col items-center gap-2 bg-white rounded-lg p-4">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/g/${entry.id}/guestbook`)}&bgcolor=FFFFFF&color=0a0a0f`}
                  alt="Guestbook QR Code"
                  className="w-48 h-48"
                />
                <p className="text-xs text-slate-600 font-body">Scan to open guestbook</p>
              </div>
            </motion.div>

            {/* RSVP section */}
            <motion.div variants={staggerItem} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-gold shrink-0" />
                  <h2 className="font-display text-base text-ivory">RSVPs</h2>
                </div>
                {rsvps.length > 0 && (
                  <span className="font-body text-xs text-ivory-dim">
                    {attendingCount} attending{maybeCount > 0 ? `, ${maybeCount} maybe` : ''}
                  </span>
                )}
              </div>

              {rsvps.length === 0 ? (
                <p className="font-body text-sm text-ivory-dim">No RSVPs yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {rsvps.map(rsvp => (
                    <li
                      key={rsvp.id}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-light border border-white/8"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-body text-sm text-ivory font-medium">{rsvp.name}</span>
                        {rsvp.email && (
                          <span className="font-body text-xs text-ivory-dim">{rsvp.email}</span>
                        )}
                      </div>
                      <RsvpBadge response={rsvp.response} />
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            {/* Guest list */}
            {meta.guest_list && meta.guest_list.length > 0 && (
              <motion.div variants={staggerItem} className="flex flex-col gap-3">
                <h2 className="font-display text-base text-ivory">Guest List</h2>
                <ul className="flex flex-col gap-2">
                  {meta.guest_list.map((guest, i) => (
                    <li
                      key={`${guest.name}-${i}`}
                      className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-slate-light border border-white/8"
                    >
                      <span className="font-body text-sm text-ivory">{guest.name}</span>
                      <span className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded-full font-body text-[10px] font-medium border',
                        guest.rsvp_status === 'confirmed'
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                          : guest.rsvp_status === 'not_attending'
                            ? 'bg-red-500/20 border-red-500/40 text-red-400'
                            : 'bg-slate-mid border-white/10 text-ivory-dim',
                      )}>
                        {guest.rsvp_status === 'confirmed'
                          ? 'Confirmed'
                          : guest.rsvp_status === 'not_attending'
                            ? 'Not Attending'
                            : 'Pending'}
                      </span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Mark complete */}
            <motion.div variants={staggerItem} className="pt-2 border-t border-white/8">
              <Button
                variant="outline"
                fullWidth
                loading={completing}
                onClick={handleMarkComplete}
              >
                Mark Complete
              </Button>
            </motion.div>

          </motion.div>
        </PageWrapper>

        <OptionsMenu
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          onMarkComplete={handleMarkComplete}
          completing={completing}
        />
      </>
    )
  }

  // ── Post-event view ───────────────────────────────────────────────────────────
  return (
    <>
      <TopBar title={entry.title} back />

      <PageWrapper>
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-6 pb-4"
        >

          {/* Summary */}
          <motion.div variants={staggerItem} className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-ivory-muted font-body text-sm">
              <Calendar size={15} className="text-gold shrink-0" />
              <span>{formatDate(meta.event_date)}</span>
            </div>
            <div className="flex items-center gap-2 text-ivory-muted font-body text-sm">
              <MapPin size={15} className="text-gold shrink-0" />
              <span>
                {meta.location}
                {entry.city ? `, ${entry.city}` : ''}
              </span>
            </div>
          </motion.div>

          {/* Guest book messages */}
          <motion.div variants={staggerItem} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <BookOpen size={15} className="text-gold shrink-0" />
              <h2 className="font-display text-base text-ivory">Guest Book</h2>
            </div>

            {messages.length === 0 ? (
              <p className="font-body text-sm text-ivory-dim">No messages yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {messages.map(msg => (
                  <li
                    key={msg.id}
                    className="flex flex-col gap-2 px-4 py-3 rounded-xl bg-slate-light border border-white/8"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-body text-sm text-ivory font-semibold">
                        {msg.guest_name}
                      </span>
                      {msg.cocktail_chosen && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gold/10 border border-gold/30 text-gold font-body text-[10px]">
                          <Wine size={10} />
                          {msg.cocktail_chosen}
                        </span>
                      )}
                    </div>
                    {msg.message && (
                      <p className="font-body text-sm text-ivory-muted leading-relaxed">
                        {msg.message}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>

          {/* Export to Chronicle */}
          <motion.div variants={staggerItem}>
            <button
              type="button"
              onClick={() => navigate(`/studio?entry=${entry.id}`)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-slate-light border border-gold/20 hover:border-gold/40 transition-colors"
            >
              <div className="flex flex-col gap-0.5 text-left">
                <span className="font-body text-sm text-ivory font-medium">Export to Chronicle</span>
                <span className="font-body text-xs text-ivory-dim">
                  Turn this gathering into a permanent chronicle entry
                </span>
              </div>
              <ChevronRight size={16} className="text-gold shrink-0" />
            </button>
          </motion.div>

        </motion.div>
      </PageWrapper>
    </>
  )
}
