import { useState, useEffect, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, MoreVertical, Plus } from 'lucide-react'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { Badge } from '@/components/ui/Badge'
import {
  fetchBucketList,
  createBucketItem,
  updateBucketItem,
  deleteBucketItem,
} from '@/data/bucketList'
import { fetchEntries } from '@/data/entries'
import { useAuthStore } from '@/store/auth'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/animations'
import type { BucketListItem, EntryType, EntryWithParticipants } from '@/types/app'

// ─── Category options ─────────────────────────────────────────────────────────

const CATEGORY_OPTIONS: { value: EntryType | 'other'; label: string }[] = [
  { value: 'mission',     label: 'Mission'    },
  { value: 'night_out',   label: 'Night Out'  },
  { value: 'steak',       label: 'The Table'  },
  { value: 'playstation', label: 'The Pitch'  },
  { value: 'toast',       label: 'The Toast'  },
  { value: 'gathering',   label: 'Gathering'  },
  { value: 'other',       label: 'Other'      },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusLabel(status: BucketListItem['status']): string {
  return status === 'done' ? 'Done' : status === 'passed' ? 'Passed' : 'Open'
}

// ─── Add / Edit wish modal ────────────────────────────────────────────────────

interface WishFormState {
  title: string
  category: EntryType | 'other' | ''
  city: string
  country: string
  notes: string
}

const EMPTY_FORM: WishFormState = {
  title: '',
  category: '',
  city: '',
  country: '',
  notes: '',
}

interface AddWishModalProps {
  isOpen: boolean
  onClose: () => void
  onSaved: (item: BucketListItem) => void
}

function AddWishModal({ isOpen, onClose, onSaved }: AddWishModalProps) {
  const gent = useAuthStore((s) => s.gent)
  const [form, setForm] = useState<WishFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM)
      setError(null)
    }
  }, [isOpen])

  const set = (field: keyof WishFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) {
      setError('Title is required.')
      return
    }
    if (!gent) return
    setSaving(true)
    setError(null)
    try {
      const item = await createBucketItem({
        title: form.title.trim(),
        category: (form.category as EntryType | 'other') || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        notes: form.notes.trim() || null,
        added_by: gent.id,
        status: 'open',
        converted_entry_id: null,
      })
      onSaved(item)
      onClose()
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add a Wish">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Title"
          placeholder="What do you want to do?"
          value={form.title}
          onChange={set('title')}
          autoFocus
        />

        {/* Category select */}
        <div className="flex flex-col w-full">
          <label className="text-ivory-muted text-xs uppercase tracking-widest mb-1 font-body">
            Category
          </label>
          <select
            value={form.category}
            onChange={set('category')}
            className="w-full bg-slate-mid border border-white/10 text-ivory font-body text-sm focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 transition-colors duration-200 rounded-[--radius-md] px-3 h-10"
          >
            <option value="">— choose —</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="City"
            placeholder="London"
            value={form.city}
            onChange={set('city')}
          />
          <Input
            label="Country"
            placeholder="UK"
            value={form.country}
            onChange={set('country')}
          />
        </div>

        <Input
          as="textarea"
          label="Notes"
          placeholder="Any context, links, intel..."
          value={form.notes}
          onChange={set('notes') as (e: React.ChangeEvent<HTMLTextAreaElement>) => void}
        />

        {error && (
          <p className="text-[--color-error] text-xs font-body">{error}</p>
        )}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" fullWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" fullWidth loading={saving}>
            Add to List
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Mark Done modal ─────────────────────────────────────────────────────────

interface MarkDoneModalProps {
  item: BucketListItem | null
  entries: EntryWithParticipants[]
  onClose: () => void
  onDone: (itemId: string, convertedEntryId: string | null) => Promise<void>
}

function MarkDoneModal({ item, entries, onClose, onDone }: MarkDoneModalProps) {
  const [linkedEntry, setLinkedEntry] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!item) setLinkedEntry('')
  }, [item])

  const handleDone = async () => {
    if (!item) return
    setSaving(true)
    await onDone(item.id, linkedEntry || null)
    setSaving(false)
  }

  const recentEntries = entries.slice(0, 30)

  return (
    <Modal isOpen={!!item} onClose={onClose} title="Mark as Done">
      <div className="flex flex-col gap-4">
        <p className="text-ivory-muted font-body text-sm leading-relaxed">
          Did completing this wish line up with a chronicle entry? Link it optionally.
        </p>

        <div className="flex flex-col w-full">
          <label className="text-ivory-muted text-xs uppercase tracking-widest mb-1 font-body">
            Linked Entry (optional)
          </label>
          <select
            value={linkedEntry}
            onChange={(e) => setLinkedEntry(e.target.value)}
            className="w-full bg-slate-mid border border-white/10 text-ivory font-body text-sm focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20 transition-colors duration-200 rounded-[--radius-md] px-3 h-10"
          >
            <option value="">No entry</option>
            {recentEntries.map((e) => (
              <option key={e.id} value={e.id}>
                {e.date.slice(0, 10)} · {e.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="ghost" fullWidth onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button fullWidth loading={saving} onClick={handleDone}>
            Mark Done
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Item menu ────────────────────────────────────────────────────────────────

interface ItemMenuProps {
  itemId: string
  onMarkDone: () => void
  onPass: () => void
  onDelete: () => void
  onClose: () => void
}

function ItemMenu({ itemId: _itemId, onMarkDone, onPass, onDelete, onClose }: ItemMenuProps) {
  return (
    <AnimatePresence>
      <motion.div
        key="item-menu"
        variants={fadeIn}
        initial="initial"
        animate="animate"
        exit="exit"
        className="absolute right-0 top-8 z-30 bg-slate-dark border border-white/10 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden min-w-[160px]"
        onClick={(e) => e.stopPropagation()}
      >
        {[
          { label: 'Mark Done',  action: onMarkDone },
          { label: 'Pass',       action: onPass     },
          { label: 'Delete',     action: onDelete,  danger: true },
        ].map(({ label, action, danger }) => (
          <button
            key={label}
            type="button"
            onClick={() => { action(); onClose() }}
            className={[
              'w-full text-left px-4 py-3 text-sm font-body transition-colors duration-150',
              danger
                ? 'text-[--color-error] hover:bg-[--color-error]/10'
                : 'text-ivory-muted hover:text-ivory hover:bg-white/5',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Bucket item card ─────────────────────────────────────────────────────────

interface BucketItemCardProps {
  item: BucketListItem
  onMarkDone: (item: BucketListItem) => void
  onPass: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  dimmed?: boolean
}

function BucketItemCard({ item, onMarkDone, onPass, onDelete, dimmed = false }: BucketItemCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  const locationStr = [item.city, item.country].filter(Boolean).join(', ')

  return (
    <motion.div
      variants={staggerItem}
      className={[
        'relative bg-slate-mid rounded-xl p-4 border border-white/5 shadow-card',
        dimmed ? 'opacity-50' : '',
      ].join(' ')}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {/* Category badge */}
          {item.category && item.category !== 'other' && (
            <div className="mb-1">
              <Badge type={item.category as EntryType} size="sm" />
            </div>
          )}
          {item.category === 'other' && (
            <div className="mb-1">
              <Badge label="Other" size="sm" />
            </div>
          )}

          {/* Title */}
          <h3 className="font-display text-lg text-ivory leading-tight tracking-wide">
            {item.title}
          </h3>

          {/* Location */}
          {locationStr && (
            <p className="text-xs text-ivory-dim font-body mt-0.5">{locationStr}</p>
          )}
        </div>

        {/* Three-dot menu — only on open items */}
        {item.status === 'open' && (
          <div className="relative shrink-0">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v) }}
              className="p-1.5 rounded-lg text-ivory-dim hover:text-ivory hover:bg-white/5 transition-colors duration-150"
              aria-label="Item options"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <ItemMenu
                itemId={item.id}
                onMarkDone={() => onMarkDone(item)}
                onPass={async () => { await onPass(item.id) }}
                onDelete={async () => { await onDelete(item.id) }}
                onClose={() => setMenuOpen(false)}
              />
            )}

            {/* Backdrop to close menu */}
            {menuOpen && (
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      {item.notes && (
        <p className="text-xs text-ivory-muted font-display italic leading-relaxed line-clamp-2 mt-1">
          {item.notes}
        </p>
      )}

      {/* Status badge for non-open */}
      {item.status !== 'open' && (
        <div className="mt-2">
          <span className={[
            'text-[10px] font-body font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full',
            item.status === 'done'
              ? 'text-gold bg-gold/10 border border-gold/20'
              : 'text-ivory-dim bg-white/5 border border-white/5',
          ].join(' ')}>
            {statusLabel(item.status)}
          </span>
        </div>
      )}
    </motion.div>
  )
}

// ─── Collapsible section ──────────────────────────────────────────────────────

interface CollapsibleSectionProps {
  title: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}

function CollapsibleSection({ title, count, defaultOpen = false, children }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between mb-3 group"
      >
        <div className="flex items-center gap-2">
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
            {title}
          </p>
          <span className="text-[10px] text-ivory-dim font-mono bg-white/5 rounded-full px-2 py-0.5">
            {count}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={[
            'text-ivory-dim transition-transform duration-200',
            open ? 'rotate-180' : '',
          ].join(' ')}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="section-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyOpenState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-6">
      <p className="font-display text-2xl text-ivory mb-2">The list is clear.</p>
      <p className="text-ivory-muted font-body text-sm leading-relaxed max-w-xs">
        No open wishes yet. Tap Add Wish to start building the gentlemen's agenda.
      </p>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BucketList() {
  const [items, setItems] = useState<BucketListItem[]>([])
  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [addOpen, setAddOpen] = useState(false)
  const [doneTarget, setDoneTarget] = useState<BucketListItem | null>(null)

  // Load on mount
  useEffect(() => {
    Promise.all([fetchBucketList(), fetchEntries()])
      .then(([bucketData, entryData]) => {
        setItems(bucketData)
        setEntries(entryData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Derived buckets — single pass
  const { openItems, doneItems, passedItems } = useMemo(() => {
    const open: typeof items = [], done: typeof items = [], passed: typeof items = []
    for (const i of items) {
      if (i.status === 'open') open.push(i)
      else if (i.status === 'done') done.push(i)
      else passed.push(i)
    }
    return { openItems: open, doneItems: done, passedItems: passed }
  }, [items])

  // ── Mutation handlers ─────────────────────────────────────────────────────

  const handleAdded = useCallback((item: BucketListItem) => {
    setItems((prev) => [item, ...prev])
  }, [])

  const handleMarkDone = useCallback((item: BucketListItem) => {
    setDoneTarget(item)
  }, [])

  const confirmDone = useCallback(async (itemId: string, convertedEntryId: string | null) => {
    await updateBucketItem(itemId, { status: 'done', converted_entry_id: convertedEntryId })
    setItems((prev) =>
      prev.map((i) => i.id === itemId ? { ...i, status: 'done', converted_entry_id: convertedEntryId } : i),
    )
    setDoneTarget(null)
  }, [])

  const handlePass = useCallback(async (id: string) => {
    await updateBucketItem(id, { status: 'passed' })
    setItems((prev) => prev.map((i) => i.id === id ? { ...i, status: 'passed' } : i))
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    await deleteBucketItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <TopBar title="Bucket List" back />

      <PageWrapper scrollable>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col"
          >
            {/* Open items */}
            <section className="mb-8">
              <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
                Open Wishes
                <span className="ml-2 font-mono normal-case text-ivory-dim text-[10px]">
                  {openItems.length}
                </span>
              </p>

              {openItems.length === 0 ? (
                <EmptyOpenState />
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="flex flex-col gap-3"
                >
                  {openItems.map((item) => (
                    <BucketItemCard
                      key={item.id}
                      item={item}
                      onMarkDone={handleMarkDone}
                      onPass={handlePass}
                      onDelete={handleDelete}
                    />
                  ))}
                </motion.div>
              )}
            </section>

            {/* Done items */}
            {doneItems.length > 0 && (
              <CollapsibleSection title="Completed" count={doneItems.length} defaultOpen={false}>
                <div className="flex flex-col gap-3">
                  {doneItems.map((item) => (
                    <BucketItemCard
                      key={item.id}
                      item={item}
                      onMarkDone={handleMarkDone}
                      onPass={handlePass}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Passed items */}
            {passedItems.length > 0 && (
              <CollapsibleSection title="Passed" count={passedItems.length} defaultOpen={false}>
                <div className="flex flex-col gap-3">
                  {passedItems.map((item) => (
                    <BucketItemCard
                      key={item.id}
                      item={item}
                      onMarkDone={handleMarkDone}
                      onPass={handlePass}
                      onDelete={handleDelete}
                      dimmed
                    />
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </motion.div>
        )}
      </PageWrapper>

      {/* FAB */}
      <motion.button
        type="button"
        onClick={() => setAddOpen(true)}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3, type: 'spring', stiffness: 300, damping: 22 }}
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-24 right-5 z-40 flex items-center gap-2 h-12 px-5 rounded-full bg-gold text-obsidian font-body font-semibold text-sm shadow-[0_4px_24px_rgba(201,168,76,0.35)] active:scale-95 transition-all duration-200"
        aria-label="Add wish"
      >
        <Plus size={16} strokeWidth={2.5} />
        Add Wish
      </motion.button>

      {/* Add wish modal */}
      <AddWishModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={handleAdded}
      />

      {/* Mark done modal */}
      <MarkDoneModal
        item={doneTarget}
        entries={entries}
        onClose={() => setDoneTarget(null)}
        onDone={confirmDone}
      />
    </>
  )
}
