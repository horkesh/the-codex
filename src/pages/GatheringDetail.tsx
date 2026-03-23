import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router'
import { MoreVertical, MapPin, Calendar, Users, Wine, BookOpen, ChevronRight, Share2, UtensilsCrossed, QrCode, Download, Image, Camera, Pencil, ShoppingBag, ChevronDown, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner, Modal } from '@/components/ui'
import { CountdownBadge } from '@/components/gathering/CountdownBadge'
import { fetchGathering, fetchRsvps, fetchGuestBookMessages, markGatheringComplete, updateGatheringMetadata } from '@/data/gatherings'
import { fetchEntryPhotos, uploadEntryPhoto, updateEntry, deleteEntry } from '@/data/entries'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { supabase } from '@/lib/supabase'
import { formatDate, cn } from '@/lib/utils'
import { PizzaSvg, TOPPING_REGISTRY } from '@/lib/pizzaSvg'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'
import { staggerContainer, staggerItem } from '@/lib/animations'
import type { Entry, GatheringRsvp, GuestBookMessage, GatheringMetadata } from '@/types/app'

// ── Options menu ─────────────────────────────────────────────────────────────

interface OptionsMenuProps {
  isOpen: boolean
  onClose: () => void
  onMarkComplete: () => void
  onEdit: () => void
  onDelete: () => void
  completing: boolean
  isCreator: boolean
}

function OptionsMenu({ isOpen, onClose, onMarkComplete, onEdit, onDelete, completing, isCreator }: OptionsMenuProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Gathering Options">
      <div className="flex flex-col gap-1 pb-2">
        {isCreator && (
          <button
            type="button"
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors"
            onClick={() => { onEdit(); onClose() }}
          >
            <Pencil size={18} className="text-gold shrink-0" />
            <span className="font-body text-sm">Edit Gathering</span>
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors disabled:opacity-50"
          onClick={() => { onMarkComplete(); onClose() }}
          disabled={completing}
        >
          <BookOpen size={18} className="text-gold shrink-0" />
          <span className="font-body text-sm">Mark as Complete</span>
        </button>
        {isCreator && (
          <button
            type="button"
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-colors"
            onClick={() => { onDelete(); onClose() }}
          >
            <Trash2 size={18} className="shrink-0" />
            <span className="font-body text-sm">Delete Gathering</span>
          </button>
        )}
      </div>
    </Modal>
  )
}

// ── Delete confirmation ──────────────────────────────────────────────────────

function DeleteConfirm({ isOpen, onClose, onConfirm, deleting, title }: {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
  title: string
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Gathering?">
      <div className="space-y-4 pb-2">
        <p className="text-sm text-ivory-muted font-body">
          Are you sure you want to permanently delete{' '}
          <span className="text-ivory font-semibold">"{title}"</span>? This
          cannot be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="ghost" size="md" fullWidth onClick={onClose} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="md"
            fullWidth
            loading={deleting}
            onClick={onConfirm}
          >
            Delete
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── RSVP badge ────────────────────────────────────────────────────────────────

function RsvpBadge({ response }: { response: GatheringRsvp['response'] }) {
  if (response === 'attending') {
    return (
      <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full bg-gold/15 border border-gold/30 text-gold font-body text-[10px] font-medium">
        Attending
      </span>
    )
  }
  if (response === 'not_attending') {
    return (
      <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-ivory-dim/50 font-body text-[10px] font-medium">
        Can't make it
      </span>
    )
  }
  return (
    <span className="inline-flex items-center self-start px-2 py-0.5 rounded-full bg-white/8 border border-white/15 text-ivory-dim font-body text-[10px] font-medium">
      Maybe
    </span>
  )
}

// ── Shopping list (pizza party) ───────────────────────────────────────────

function ShoppingList({ pizzaMenu }: { pizzaMenu: NonNullable<GatheringMetadata['pizza_menu']> }) {
  const [collapsed, setCollapsed] = useState(true)
  const [crossedOff, setCrossedOff] = useState<Set<string>>(new Set())

  const items = useMemo(() => {
    const counts = new Map<string, number>()
    for (const pizza of pizzaMenu) {
      for (const t of pizza.toppings) {
        counts.set(t, (counts.get(t) ?? 0) + 1)
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({ key, label: TOPPING_REGISTRY[key]?.label ?? key, count }))
  }, [pizzaMenu])

  function toggleItem(key: string) {
    setCrossedOff(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (items.length === 0) return null

  return (
    <motion.div variants={staggerItem} className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setCollapsed(c => !c)}
        className="flex items-center justify-between w-full group"
      >
        <div className="flex items-center gap-2">
          <ShoppingBag size={15} className="text-gold shrink-0" />
          <h2 className="font-display text-base text-ivory">Shopping List</h2>
          <span className="font-body text-[10px] text-ivory-dim/60 ml-1">{items.length} items</span>
        </div>
        <ChevronDown
          size={14}
          className={cn(
            'text-ivory-dim/40 transition-transform duration-200',
            !collapsed && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-0.5 overflow-hidden"
          >
            {items.map(item => {
              const crossed = crossedOff.has(item.key)
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    onClick={() => toggleItem(item.key)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/5 transition-colors"
                  >
                    {/* Check circle */}
                    <span
                      className={cn(
                        'w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors',
                        crossed
                          ? 'bg-gold/20 border-gold/50'
                          : 'border-white/20',
                      )}
                    >
                      {crossed && (
                        <span className="block w-2 h-2 rounded-full bg-gold" />
                      )}
                    </span>

                    <span
                      className={cn(
                        'flex-1 text-left font-body text-sm transition-all',
                        crossed
                          ? 'text-ivory-dim/40 line-through'
                          : 'text-ivory',
                      )}
                    >
                      {item.label}
                    </span>

                    {item.count > 1 && (
                      <span className="font-body text-[10px] text-ivory-dim/50 shrink-0">
                        (x{item.count})
                      </span>
                    )}
                  </button>
                </li>
              )
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function GatheringDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  const [entry, setEntry] = useState<Entry | null>(null)
  const [rsvps, setRsvps] = useState<GatheringRsvp[]>([])
  const [messages, setMessages] = useState<GuestBookMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [optionsOpen, setOptionsOpen] = useState(false)
  const [completing, setCompleting] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  // Photos + description + host message editing
  const [photos, setPhotos] = useState<Array<{ id: string; url: string }>>([])
  const [uploading, setUploading] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [descDraft, setDescDraft] = useState('')
  const [editingHostMsg, setEditingHostMsg] = useState(false)
  const [hostMsgDraft, setHostMsgDraft] = useState('')

  // Push notification prompt for creator
  const { supported: pushSupported, subscribed: pushSubscribed, subscribe: pushSubscribe } = usePushNotifications()
  const [pushPromptShown, setPushPromptShown] = useState(false)
  const [pushSubscribing, setPushSubscribing] = useState(false)

  // Load data
  useEffect(() => {
    if (!id) return

    setLoading(true)
    Promise.all([
      fetchGathering(id),
      fetchRsvps(id),
      fetchGuestBookMessages(id),
      fetchEntryPhotos(id),
    ])
      .then(([fetchedEntry, fetchedRsvps, fetchedMessages, fetchedPhotos]) => {
        if (!fetchedEntry) {
          setNotFound(true)
        } else {
          setEntry(fetchedEntry)
          setRsvps(fetchedRsvps)
          setMessages(fetchedMessages)
          setPhotos(fetchedPhotos.map(p => ({ id: p.id, url: p.url })))
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

  // Show push prompt for creator if not subscribed
  useEffect(() => {
    if (!entry || !gent || entry.created_by !== gent.id) return
    if (!pushSupported || pushSubscribed) return
    setPushPromptShown(true)
  }, [entry, gent, pushSupported, pushSubscribed])

  // Reset unseen RSVP count for creator (once per gathering)
  const unseenResetRef = useRef<string | null>(null)
  useEffect(() => {
    if (!id || !entry || !gent) return
    if (unseenResetRef.current === id) return
    if (entry.created_by !== gent.id) return
    const m = entry.metadata as Record<string, unknown>
    if (m?.rsvp_unseen_count && (m.rsvp_unseen_count as number) > 0) {
      unseenResetRef.current = id
      updateGatheringMetadata(id, { rsvp_unseen_count: 0 }).catch(() => {})
    }
  }, [id, entry, gent])

  const rsvpCounts = useMemo(() => ({
    attendingCount: rsvps.filter(r => r.response === 'attending').length,
    maybeCount: rsvps.filter(r => r.response === 'maybe').length,
  }), [rsvps])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length || !id) return
    setUploading(true)
    try {
      for (let i = 0; i < files.length; i++) {
        const url = await uploadEntryPhoto(id, files[i], photos.length + i)
        setPhotos(prev => [...prev, { id: `new-${Date.now()}-${i}`, url }])
      }
      addToast('Photos uploaded', 'success')
    } catch {
      addToast('Failed to upload photos', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  async function handleSaveDescription() {
    if (!id) return
    try {
      await updateEntry(id, { description: descDraft.trim() || null })
      setEntry(prev => prev ? { ...prev, description: descDraft.trim() || null } : prev)
      setEditingDesc(false)
      addToast('Description updated', 'success')
    } catch {
      addToast('Failed to save description', 'error')
    }
  }

  async function handleSaveHostMessage() {
    if (!id) return
    try {
      const trimmed = hostMsgDraft.trim() || undefined
      await updateGatheringMetadata(id, { host_message: trimmed } as Partial<GatheringMetadata>)
      setEntry(prev => {
        if (!prev) return prev
        const newMeta = { ...prev.metadata, host_message: trimmed }
        if (!trimmed) delete (newMeta as Record<string, unknown>).host_message
        return { ...prev, metadata: newMeta }
      })
      setEditingHostMsg(false)
      addToast('Host message updated', 'success')
    } catch {
      addToast('Failed to save message', 'error')
    }
  }

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

  async function handleDeleteConfirm() {
    if (!id) return
    setDeleting(true)
    try {
      await deleteEntry(id)
      addToast('Gathering deleted.', 'success')
      navigate('/home', { replace: true })
    } catch {
      addToast('Could not delete gathering. Try again.', 'error')
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  async function handleEnablePush() {
    setPushSubscribing(true)
    const ok = await pushSubscribe()
    setPushSubscribing(false)
    if (ok) {
      setPushPromptShown(false)
      addToast('Push notifications enabled', 'success')
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
  const isCreator = gent?.id === entry.created_by

  // ── Pre-event view ────────────────────────────────────────────────────────────
  if (isPreEvent) {
    const { attendingCount, maybeCount } = rsvpCounts

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

            {/* Push notification prompt for creator */}
            {pushPromptShown && (
              <div className="flex items-center justify-between bg-gold/10 border border-gold/20 rounded-xl px-4 py-3">
                <span className="text-xs text-ivory font-body">Get notified when guests RSVP?</span>
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushSubscribing}
                  className="text-xs text-gold font-body font-semibold"
                >
                  {pushSubscribing ? 'Enabling...' : 'Enable'}
                </button>
              </div>
            )}

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
              {meta.lat && meta.lng && (
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${meta.lat},${meta.lng}`}
                   target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden mt-2">
                  <img src={buildStaticMapUrl(meta.lat, meta.lng, { width: 400, height: 160 })}
                       alt="Map" className="w-full h-28 object-cover" />
                </a>
              )}
              {meta.address && <p className="text-[11px] text-ivory-dim/60 font-body mt-1">{meta.address}</p>}
            </motion.div>

            {/* Description — editable by creator */}
            <motion.div variants={staggerItem}>
              {editingDesc ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    placeholder="Add a description..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-ivory font-body placeholder:text-ivory-dim/40 focus:outline-none focus:border-gold/30 resize-none"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setEditingDesc(false)} className="text-xs text-ivory-dim font-body px-3 py-1.5">Cancel</button>
                    <button type="button" onClick={handleSaveDescription} className="text-xs text-gold font-body font-semibold px-3 py-1.5 bg-gold/10 rounded-lg">Save</button>
                  </div>
                </div>
              ) : entry.description ? (
                <div className="flex items-start gap-2">
                  <p className="font-body text-sm text-ivory leading-relaxed flex-1">{entry.description}</p>
                  {isCreator && (
                    <button type="button" onClick={() => { setDescDraft(entry.description ?? ''); setEditingDesc(true) }} className="text-ivory-dim/40 hover:text-gold transition-colors shrink-0 mt-0.5">
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
              ) : isCreator ? (
                <button type="button" onClick={() => { setDescDraft(''); setEditingDesc(true) }} className="w-full text-left text-xs text-ivory-dim/40 font-body py-2 hover:text-ivory-dim transition-colors">
                  + Add description
                </button>
              ) : null}
            </motion.div>

            {/* Host message */}
            <motion.div variants={staggerItem}>
              {editingHostMsg ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={hostMsgDraft}
                    onChange={e => setHostMsgDraft(e.target.value)}
                    placeholder="Add a personal message for guests..."
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-ivory font-body placeholder:text-ivory-dim/40 focus:outline-none focus:border-gold/30 resize-none italic"
                    rows={3}
                    autoFocus
                  />
                  <div className="flex gap-2 justify-end">
                    <button type="button" onClick={() => setEditingHostMsg(false)} className="text-xs text-ivory-dim font-body px-3 py-1.5">Cancel</button>
                    <button type="button" onClick={handleSaveHostMessage} className="text-xs text-gold font-body font-semibold px-3 py-1.5 bg-gold/10 rounded-lg">Save</button>
                  </div>
                </div>
              ) : meta.host_message ? (
                <div className="flex items-start gap-2">
                  <div
                    className="flex-1 rounded-r-lg px-4 py-3"
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      borderLeft: '2px solid rgba(212,132,58,0.5)',
                    }}
                  >
                    <p className="font-display text-sm text-[#C8C0B0] italic leading-relaxed">
                      &ldquo;{meta.host_message}&rdquo;
                    </p>
                    <p className="font-body text-[10px] text-[#D4843A] mt-2">— The Host</p>
                  </div>
                  {isCreator && (
                    <button type="button" onClick={() => { setHostMsgDraft(meta.host_message ?? ''); setEditingHostMsg(true) }} className="text-ivory-dim/40 hover:text-gold transition-colors shrink-0 mt-2">
                      <Pencil size={12} />
                    </button>
                  )}
                </div>
              ) : isCreator ? (
                <button type="button" onClick={() => { setHostMsgDraft(''); setEditingHostMsg(true) }} className="w-full text-left text-xs text-ivory-dim/40 font-body py-2 hover:text-ivory-dim transition-colors">
                  + Add personal message
                </button>
              ) : null}
            </motion.div>

            {/* Photos */}
            {(photos.length > 0 || isCreator) && (
              <motion.div variants={staggerItem} className="flex flex-col gap-3">
                {photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5 rounded-xl overflow-hidden">
                    {photos.map(p => (
                      <img key={p.id} src={p.url} alt="" className="w-full aspect-square object-cover" />
                    ))}
                  </div>
                )}
                {isCreator && (
                  <label className="flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-white/15 text-xs text-ivory-dim/60 font-body hover:border-gold/30 hover:text-gold/60 transition-all cursor-pointer">
                    <Camera size={14} />
                    {uploading ? 'Uploading...' : 'Add photos'}
                    <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
                  </label>
                )}
              </motion.div>
            )}

            {/* Pizza menu */}
            {meta.flavour === 'pizza_party' && meta.pizza_menu && meta.pizza_menu.length > 0 && (
              <motion.div variants={staggerItem} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <UtensilsCrossed size={15} className="text-gold shrink-0" />
                  <h2 className="font-display text-base text-ivory">The Menu</h2>
                </div>
                {meta.pizza_menu.map((pizza, i) => (
                  <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                    <PizzaSvg toppings={pizza.toppings} size={64} seed={pizza.name || `p-${i}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gold font-display">{pizza.name}</p>
                      <p className="text-[10px] text-ivory-dim/60 font-body mt-0.5">
                        {pizza.toppings.map(t => TOPPING_REGISTRY[t]?.label ?? t).join(' · ')}
                      </p>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}

            {/* Shopping list — pizza party, creator only */}
            {isCreator && meta.flavour === 'pizza_party' && meta.pizza_menu && meta.pizza_menu.length > 0 && (
              <ShoppingList pizzaMenu={meta.pizza_menu} />
            )}

            {/* Cocktail menu */}
            {meta.flavour !== 'pizza_party' && meta.cocktail_menu && meta.cocktail_menu.length > 0 && (
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
              {/* QR code thumbnail — tap to open modal */}
              <button
                type="button"
                onClick={() => setShowQrModal(true)}
                className="flex items-center gap-3 bg-slate-mid border border-white/8 rounded-lg px-4 py-3 hover:border-white/15 transition-colors"
              >
                <QrCode size={20} className="text-gold shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-xs text-ivory font-body">Guestbook QR Code</p>
                  <p className="text-[10px] text-ivory-dim/60 font-body mt-0.5">Tap to view & download</p>
                </div>
              </button>
            </motion.div>

            {/* Export to Studio */}
            <motion.div variants={staggerItem}>
              <button
                type="button"
                onClick={() => navigate(`/studio?entry=${entry.id}`)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-slate-mid border border-gold/20 hover:border-gold/40 transition-colors"
              >
                <Image size={18} className="text-gold shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-xs text-ivory font-body font-medium">Export to Studio</p>
                  <p className="text-[10px] text-ivory-dim/60 font-body mt-0.5">Create a shareable invite card</p>
                </div>
                <ChevronRight size={14} className="text-gold/50 shrink-0" />
              </button>
            </motion.div>

            {/* Guest Wall */}
            <motion.div variants={staggerItem} className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users size={15} className="text-gold shrink-0" />
                  <h2 className="font-display text-base text-ivory">Guest Wall</h2>
                </div>
                {rsvps.length > 0 && (
                  <span className="font-body text-xs text-ivory-dim">
                    {attendingCount} attending{maybeCount > 0 ? ` · ${maybeCount} maybe` : ''}
                  </span>
                )}
              </div>

              {rsvps.length === 0 ? (
                <p className="font-body text-sm text-ivory-dim">No RSVPs yet.</p>
              ) : (
                <motion.div layout className="grid grid-cols-2 gap-2">
                  <AnimatePresence>
                    {rsvps.map(rsvp => (
                      <motion.div
                        key={rsvp.id}
                        layout
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className={cn(
                          'flex flex-col gap-1.5 px-3 py-3 rounded-xl bg-slate-light border',
                          rsvp.response === 'attending'
                            ? 'border-[#D4843A]/40'
                            : rsvp.response === 'maybe'
                              ? 'border-white/12'
                              : 'border-white/6 opacity-50',
                        )}
                      >
                        <span className="font-display text-sm text-ivory truncate">{rsvp.name}</span>
                        {rsvp.email && (
                          <span className="font-body text-[10px] text-ivory-dim/60 truncate">{rsvp.email}</span>
                        )}
                        <RsvpBadge response={rsvp.response} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
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
          onEdit={() => navigate(`/gathering/${id}/edit`)}
          onDelete={() => setDeleteOpen(true)}
          completing={completing}
          isCreator={isCreator}
        />

        <DeleteConfirm
          isOpen={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onConfirm={handleDeleteConfirm}
          deleting={deleting}
          title={entry.title}
        />

        {/* QR Code modal */}
        <Modal isOpen={showQrModal} onClose={() => setShowQrModal(false)} title="Guestbook QR Code">
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="bg-white rounded-xl p-5">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(`${window.location.origin}/g/${entry.id}/guestbook`)}&bgcolor=FFFFFF&color=0a0a0f`}
                alt="Guestbook QR Code"
                className="w-64 h-64"
              />
            </div>
            <p className="text-xs text-ivory-dim font-body text-center">
              Guests scan this to sign the guestbook
            </p>
            <a
              href={`https://api.qrserver.com/v1/create-qr-code/?size=800x800&data=${encodeURIComponent(`${window.location.origin}/g/${entry.id}/guestbook`)}&bgcolor=FFFFFF&color=0a0a0f&format=png`}
              download={`${entry.title.replace(/[^a-zA-Z0-9]/g, '-')}-qr.png`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gold text-obsidian text-sm font-body font-semibold hover:bg-gold/90 transition-colors"
            >
              <Download size={16} />
              Download QR
            </a>
          </div>
        </Modal>
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
            {meta.lat && meta.lng && (
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${meta.lat},${meta.lng}`}
                 target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden mt-2">
                <img src={buildStaticMapUrl(meta.lat, meta.lng, { width: 400, height: 160 })}
                     alt="Map" className="w-full h-28 object-cover" />
              </a>
            )}
            {meta.address && <p className="text-[11px] text-ivory-dim/60 font-body mt-1">{meta.address}</p>}
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
