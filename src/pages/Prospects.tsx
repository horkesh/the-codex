import { useState, useEffect, useRef } from 'react'
import { Plus, Radar, MoreVertical, Link, ImagePlus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner, Modal, Input } from '@/components/ui'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations'
import { fetchProspects, createProspect, updateProspect, deleteProspect, shareProspect } from '@/data/prospects'
import { analyzeInstagramUrl, analyzeInstagramScreenshot } from '@/ai/instagram'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { cn, formatDate } from '@/lib/utils'
import type { Prospect } from '@/types/app'

// ─── Prospect Card ────────────────────────────────────────────────────────────

interface ProspectCardProps {
  prospect: Prospect
  onMarkPassed: () => void
  onDelete: () => void
  onShare: () => void
  currentGentId: string
}

function ProspectCard({ prospect, onMarkPassed, onDelete, onShare, currentGentId }: ProspectCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const statusConfig = {
    prospect: { label: 'Prospect', className: 'text-gold bg-gold/10 border border-gold/30' },
    passed: { label: 'Passed', className: 'text-ivory-dim bg-white/5 border border-white/10' },
    converted: { label: 'Converted', className: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30' },
  }

  const { label: statusLabel, className: statusClass } = statusConfig[prospect.status]

  const isOwn = prospect.created_by === currentGentId
  const isSuggestedByOther = prospect.visibility === 'shared' && !isOwn
  const canShare =
    prospect.status !== 'passed' &&
    isOwn &&
    prospect.visibility !== 'shared'

  return (
    <div className="bg-slate-dark border border-white/6 rounded-xl overflow-hidden">
      {/* Thumbnail */}
      {prospect.source_thumbnail_url && (
        <div className="h-36 overflow-hidden relative">
          <img
            src={prospect.source_thumbnail_url}
            alt={prospect.venue_name ?? 'Event thumbnail'}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-dark/70 to-transparent" />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* Main info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-base text-ivory leading-tight truncate">
              {prospect.event_name ?? prospect.venue_name ?? 'Unnamed Event'}
            </h3>
            <p className="text-xs text-ivory-dim mt-0.5 font-body truncate">
              {[prospect.venue_name, prospect.city, prospect.country].filter(Boolean).join(' · ')}
            </p>
          </div>

          {/* Three-dot menu */}
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="p-1.5 rounded-lg text-ivory-dim hover:text-ivory hover:bg-slate-light transition-colors"
              aria-label="Options"
            >
              <MoreVertical size={15} />
            </button>

            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 z-20 bg-slate-mid border border-white/10 rounded-lg shadow-xl overflow-hidden min-w-[140px]"
                >
                  {prospect.status === 'prospect' && (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onMarkPassed() }}
                      className="w-full text-left px-3 py-2.5 text-xs text-ivory-muted hover:text-ivory hover:bg-slate-light transition-colors font-body"
                    >
                      Mark as Passed
                    </button>
                  )}
                  {canShare && (
                    <button
                      type="button"
                      onClick={() => { setMenuOpen(false); onShare() }}
                      className="w-full text-left px-3 py-2.5 text-xs text-ivory-muted hover:text-ivory hover:bg-slate-light transition-colors font-body"
                    >
                      Share with Gents
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); onDelete() }}
                    className="w-full text-left px-3 py-2.5 text-xs text-[--color-error] hover:bg-[--color-error]/10 transition-colors font-body"
                  >
                    Delete
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
          <span className="text-xs text-ivory-dim font-body">
            {prospect.event_date ? formatDate(prospect.event_date) : 'Date TBC'}
          </span>
          {prospect.estimated_price && (
            <span className="text-xs text-ivory-dim font-body">{prospect.estimated_price}</span>
          )}
        </div>

        {/* Vibe */}
        {prospect.vibe && (
          <p className="text-xs text-ivory-dim italic mt-2 font-body line-clamp-1">{prospect.vibe}</p>
        )}

        {/* Footer: dress code + badges + status pill */}
        <div className="flex items-center justify-between mt-3">
          {prospect.dress_code ? (
            <span className="text-[10px] uppercase tracking-widest text-ivory-dim font-body">
              {prospect.dress_code}
            </span>
          ) : <span />}

          <div className="flex items-center gap-2">
            {isSuggestedByOther && (
              <span className="text-[10px] uppercase tracking-widest text-gold-muted font-body">
                Suggested
              </span>
            )}
            <span className={cn('text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full font-body', statusClass)}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Add Prospect Modal ───────────────────────────────────────────────────────

type ModalStep = 'input' | 'analyzing' | 'review'
type InputMode = 'url' | 'screenshot'

interface AddProspectModalProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

function AddProspectModal({ open, onClose, onSaved }: AddProspectModalProps) {
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  const [step, setStep] = useState<ModalStep>('input')
  const [mode, setMode] = useState<InputMode>('url')
  const [url, setUrl] = useState('')
  const [analyzeError, setAnalyzeError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Editable fields after analysis
  const [fields, setFields] = useState({
    event_name: '',
    venue_name: '',
    city: '',
    country: '',
    location: '',
    event_date: '',
    estimated_price: '',
    dress_code: '',
    vibe: '',
    notes: '',
    source_url: '',
    source_thumbnail_url: '',
  })

  const resetModal = () => {
    setStep('input')
    setMode('url')
    setUrl('')
    setAnalyzeError('')
    setSaving(false)
    setFields({
      event_name: '', venue_name: '', city: '', country: '', location: '',
      event_date: '', estimated_price: '', dress_code: '',
      vibe: '', notes: '', source_url: '', source_thumbnail_url: '',
    })
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  const handleAnalyzeUrl = async () => {
    if (!url.trim()) {
      setAnalyzeError('Please paste an Instagram URL')
      return
    }
    setAnalyzeError('')
    setStep('analyzing')
    try {
      const result = await analyzeInstagramUrl(url.trim(), 'event')
      setFields((prev) => ({
        ...prev,
        event_name: result.event_name ?? '',
        venue_name: result.venue_name ?? '',
        city: result.city ?? '',
        country: result.country ?? '',
        location: result.location ?? '',
        event_date: result.event_date ?? '',
        estimated_price: result.estimated_price ?? '',
        dress_code: result.dress_code ?? '',
        vibe: result.vibe ?? '',
        source_url: url.trim(),
        source_thumbnail_url: result.image_url ?? '',
      }))
      setStep('review')
    } catch {
      setAnalyzeError('Could not analyze that URL. You can fill in details manually.')
      setStep('review')
    }
  }

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStep('analyzing')
    setAnalyzeError('')
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await analyzeInstagramScreenshot(base64, file.type || 'image/png')
      setFields((prev) => ({
        ...prev,
        event_name: result.event_name ?? '',
        venue_name: result.venue_name ?? '',
        city: result.city ?? '',
        country: result.country ?? '',
        location: result.location ?? '',
        event_date: result.event_date ?? '',
        estimated_price: result.estimated_price ?? '',
        dress_code: result.dress_code ?? '',
        vibe: result.vibe ?? '',
      }))
      setStep('review')
    } catch {
      setAnalyzeError('Could not analyze screenshot. Fill in details manually.')
      setStep('review')
    }
  }

  const handleManualEntry = () => {
    setStep('review')
  }

  const handleSave = async () => {
    if (!gent) return
    setSaving(true)
    try {
      await createProspect({
        created_by: gent.id,
        source_url: fields.source_url || null,
        source_thumbnail_url: fields.source_thumbnail_url || null,
        event_name: fields.event_name || null,
        venue_name: fields.venue_name || null,
        location: fields.location || null,
        city: fields.city || null,
        country: fields.country || null,
        event_date: fields.event_date || null,
        estimated_price: fields.estimated_price || null,
        vibe: fields.vibe || null,
        dress_code: fields.dress_code || null,
        notes: fields.notes || null,
        status: 'prospect',
        converted_entry_id: null,
        visibility: 'private' as const,
      })
      addToast('Prospect added to radar', 'success')
      onSaved()
      handleClose()
    } catch {
      addToast('Failed to save prospect', 'error')
    } finally {
      setSaving(false)
    }
  }

  const setField = (key: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((prev) => ({ ...prev, [key]: e.target.value }))
  }

  return (
    <Modal isOpen={open} onClose={handleClose} title="Scout New Prospect">
      <AnimatePresence mode="wait">
        {/* ── Step: Input ── */}
        {step === 'input' && (
          <motion.div
            key="input"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-4"
          >
            {/* Mode tabs */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => setMode('url')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-body transition-colors',
                  mode === 'url' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory'
                )}
              >
                <Link size={13} />
                Instagram URL
              </button>
              <button
                type="button"
                onClick={() => setMode('screenshot')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-body transition-colors',
                  mode === 'screenshot' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory'
                )}
              >
                <ImagePlus size={13} />
                Screenshot
              </button>
            </div>

            {mode === 'url' ? (
              <>
                <Input
                  label="Instagram Post URL"
                  placeholder="https://instagram.com/p/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  error={analyzeError}
                />
                <Button fullWidth onClick={handleAnalyzeUrl} disabled={!url.trim()}>
                  Analyze
                </Button>
              </>
            ) : (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-gold/30 transition-colors"
                >
                  <ImagePlus size={24} className="text-ivory-dim" />
                  <p className="text-sm text-ivory-muted font-body text-center">
                    Tap to upload a screenshot
                  </p>
                  <p className="text-xs text-ivory-dim font-body text-center">
                    Works with private profiles
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleScreenshotUpload}
                />
                {analyzeError && (
                  <p className="text-xs text-[--color-error] font-body">{analyzeError}</p>
                )}
              </>
            )}

            <button
              type="button"
              onClick={handleManualEntry}
              className="text-xs text-ivory-dim hover:text-ivory font-body text-center transition-colors py-1"
            >
              Skip — enter details manually
            </button>
          </motion.div>
        )}

        {/* ── Step: Analyzing ── */}
        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center justify-center gap-4 py-10"
          >
            <Spinner size="md" />
            <p className="text-sm text-ivory-muted font-body">Analyzing...</p>
          </motion.div>
        )}

        {/* ── Step: Review ── */}
        {step === 'review' && (
          <motion.div
            key="review"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-3"
          >
            {analyzeError && (
              <div className="rounded-lg bg-[--color-error]/10 border border-[--color-error]/30 px-3 py-2">
                <p className="text-xs text-[--color-error] font-body">{analyzeError}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input
                  label="Event Name"
                  placeholder="Drumcode Night, Closing Party..."
                  value={fields.event_name}
                  onChange={setField('event_name')}
                />
              </div>
              <div className="col-span-2">
                <Input
                  label="Venue"
                  placeholder="Club, restaurant, rooftop..."
                  value={fields.venue_name}
                  onChange={setField('venue_name')}
                />
              </div>
              <Input
                label="City"
                placeholder="London"
                value={fields.city}
                onChange={setField('city')}
              />
              <Input
                label="Country"
                placeholder="UK"
                value={fields.country}
                onChange={setField('country')}
              />
              <div className="col-span-2">
                <Input
                  label="Event Date"
                  placeholder="e.g. 15 March 2026"
                  value={fields.event_date}
                  onChange={setField('event_date')}
                />
              </div>
              <Input
                label="Estimated Price"
                placeholder="£100pp"
                value={fields.estimated_price}
                onChange={setField('estimated_price')}
              />
              <Input
                label="Dress Code"
                placeholder="Black tie..."
                value={fields.dress_code}
                onChange={setField('dress_code')}
              />
              <div className="col-span-2">
                <Input
                  label="Vibe"
                  placeholder="One-line atmosphere read"
                  value={fields.vibe}
                  onChange={setField('vibe')}
                />
              </div>
              <div className="col-span-2">
                <Input
                  as="textarea"
                  label="Notes"
                  placeholder="Any additional intel..."
                  value={fields.notes}
                  onChange={setField('notes')}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <Button variant="ghost" fullWidth onClick={() => setStep('input')} disabled={saving}>
                Back
              </Button>
              <Button
                fullWidth
                loading={saving}
                onClick={handleSave}
                disabled={!fields.event_name.trim() && !fields.venue_name.trim()}
              >
                Save Prospect
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Prospects() {
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  const [prospects, setProspects] = useState<Prospect[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Prospect | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = async () => {
    try {
      const data = await fetchProspects(gent?.id)
      setProspects(data)
    } catch {
      addToast('Failed to load prospects', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleMarkPassed = async (prospect: Prospect) => {
    try {
      await updateProspect(prospect.id, { status: 'passed' })
      setProspects((prev) =>
        prev.map((p) => p.id === prospect.id ? { ...p, status: 'passed' } : p)
      )
    } catch {
      addToast('Failed to update prospect', 'error')
    }
  }

  const handleShare = async (prospect: Prospect) => {
    try {
      await shareProspect(prospect.id)
      setProspects((prev) =>
        prev.map((p) => p.id === prospect.id ? { ...p, visibility: 'shared' as const } : p)
      )
      addToast('Shared with The Circle', 'success')
    } catch {
      addToast('Failed to share prospect', 'error')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteProspect(deleteTarget.id)
      setProspects((prev) => prev.filter((p) => p.id !== deleteTarget.id))
      addToast('Prospect removed', 'info')
      setDeleteTarget(null)
    } catch {
      addToast('Failed to delete prospect', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="On the Radar"
        back
        subtitle={loading ? undefined : `${prospects.length} prospect${prospects.length !== 1 ? 's' : ''}`}
      />

      <PageWrapper>
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner size="md" />
          </div>
        ) : prospects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <Radar size={40} className="text-ivory-dim opacity-40" />
            <div>
              <p className="text-ivory-muted text-sm font-body">Nothing on the radar yet</p>
              <p className="text-ivory-dim text-xs font-body mt-1">
                Scout events from Instagram to start tracking
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
              Scout First Prospect
            </Button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-3"
          >
            {prospects.map((prospect) => (
              <motion.div key={prospect.id} variants={staggerItem}>
                <ProspectCard
                  prospect={prospect}
                  onMarkPassed={() => handleMarkPassed(prospect)}
                  onDelete={() => setDeleteTarget(prospect)}
                  onShare={() => handleShare(prospect)}
                  currentGentId={gent?.id ?? ''}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </PageWrapper>

      {/* FAB */}
      {!loading && (
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          aria-label="Scout new prospect"
          className="fixed bottom-24 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full bg-gold text-obsidian shadow-gold hover:bg-gold-light transition-colors duration-150"
        >
          <Plus size={22} strokeWidth={2.5} />
        </button>
      )}

      {/* Add modal */}
      <AddProspectModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSaved={load}
      />

      {/* Delete confirm modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Remove Prospect"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ivory-muted font-body">
            Remove{' '}
            <span className="text-ivory font-medium">
              {deleteTarget?.venue_name ?? 'this prospect'}
            </span>{' '}
            from the radar? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button variant="danger" fullWidth loading={deleting} onClick={handleDelete}>
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
