import { useState, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { MoreVertical, Sparkles, RefreshCw, Share2, Trash2, ImagePlay, Edit2, Pin, X as XIcon, Type } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner, Modal, Avatar } from '@/components/ui'
import { EntryHero } from '@/components/chronicle/EntryHero'
import { LoreSection } from '@/components/chronicle/LoreSection'
import { EntryReactions } from '@/components/chronicle/EntryReactions'
import { generateScene } from '@/ai/scene'
import { generateLoreFull } from '@/ai/lore'
import { generateTitleSuggestions } from '@/ai/title'
import { PhotoGrid } from '@/components/chronicle/PhotoGrid'
import { PhotoStoryboard } from '@/components/chronicle/PhotoStoryboard'
import { FilterPicker } from '@/components/chronicle/FilterPicker'
import { MetadataCard } from '@/components/chronicle/MetadataCard'
import { PS5Scoreboard } from '@/components/chronicle/PS5Scoreboard'
import { PeoplePresent } from '@/components/chronicle/PeoplePresent'
import { CommentsSection } from '@/components/chronicle/CommentsSection'
import { useEntry } from '@/hooks/useEntry'
import { useEntryFilter } from '@/hooks/useEntryFilter'
import { fetchEntry, deleteEntry, updateEntry, updateEntryCover, updateEntryLore, togglePin } from '@/data/entries'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { staggerContainer, staggerItem } from '@/lib/animations'
import type { EntryWithParticipants } from '@/types/app'

// ── Options menu ────────────────────────────────────────────────────────────

interface OptionsMenuProps {
  isOpen: boolean
  onClose: () => void
  isCreator: boolean
  hasLore: boolean
  canGenerateScene: boolean
  generatingScene: boolean
  regeneratingLore: boolean
  isPinned: boolean
  onTogglePin: () => void
  onGenerateLore: () => void
  onRegenerateLore: () => void
  onGenerateScene: () => void
  onEdit: () => void
  onExport: () => void
  onDelete: () => void
}

function OptionsMenu({
  isOpen, onClose, isCreator, hasLore, canGenerateScene, generatingScene, regeneratingLore,
  isPinned, onTogglePin,
  onGenerateLore, onRegenerateLore, onGenerateScene, onEdit, onExport, onDelete,
}: OptionsMenuProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Entry Options">
      <div className="flex flex-col gap-1 pb-2">
        {isCreator && !hasLore && (
          <button
            type="button"
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors"
            onClick={() => { onGenerateLore(); onClose() }}
          >
            <Sparkles size={18} className="text-gold shrink-0" />
            <span className="font-body text-sm">Generate Lore</span>
          </button>
        )}
        {isCreator && hasLore && (
          <button
            type="button"
            disabled={regeneratingLore}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors disabled:opacity-40"
            onClick={() => { onRegenerateLore(); onClose() }}
          >
            <RefreshCw size={18} className="text-gold shrink-0" />
            <span className="font-body text-sm">
              {regeneratingLore ? 'Regenerating lore...' : 'Regenerate Lore'}
            </span>
          </button>
        )}
        {isCreator && canGenerateScene && (
          <button
            type="button"
            disabled={generatingScene}
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors disabled:opacity-40"
            onClick={() => { onGenerateScene(); onClose() }}
          >
            <ImagePlay size={18} className="text-gold shrink-0" />
            <span className="font-body text-sm">
              {generatingScene ? 'Generating scene…' : 'Generate Scene'}
            </span>
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors"
          onClick={() => { onTogglePin(); onClose() }}
        >
          <Pin size={18} className={`shrink-0 ${isPinned ? 'text-gold fill-gold' : 'text-ivory-muted'}`} />
          <span className="font-body text-sm">{isPinned ? 'Unpin Entry' : 'Pin Entry'}</span>
        </button>
        {isCreator && (
          <button
            type="button"
            className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors"
            onClick={() => { onEdit(); onClose() }}
          >
            <Edit2 size={18} className="text-ivory-muted shrink-0" />
            <span className="font-body text-sm">Edit Entry</span>
          </button>
        )}
        <button
          type="button"
          className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-ivory hover:bg-slate-light transition-colors"
          onClick={() => { onExport(); onClose() }}
        >
          <Share2 size={18} className="text-ivory-muted shrink-0" />
          <span className="font-body text-sm">Export to Studio</span>
        </button>
        {isCreator && (
          <>
            <div className="h-px bg-white/10 my-1" />
            <button
              type="button"
              className="flex items-center gap-3 w-full px-3 py-3 rounded-lg text-left text-[--color-error] hover:bg-[--color-error]/10 transition-colors"
              onClick={() => { onDelete(); onClose() }}
            >
              <Trash2 size={18} className="shrink-0" />
              <span className="font-body text-sm">Delete Entry</span>
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}

// ── Delete confirmation ──────────────────────────────────────────────────────

interface DeleteConfirmProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  deleting: boolean
  title: string
}

function DeleteConfirm({ isOpen, onClose, onConfirm, deleting, title }: DeleteConfirmProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Delete Entry?">
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

// ── Participants section ─────────────────────────────────────────────────────

function ParticipantsSection({ entry }: { entry: EntryWithParticipants }) {
  if (entry.participants.length === 0) return null

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-3"
    >
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
        Who Was There
      </p>
      <div className="flex flex-wrap gap-3">
        {entry.participants.map((gent) => (
          <motion.div key={gent.id} variants={staggerItem}>
            <Link
              to={`/gents/${gent.alias}`}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Avatar
                src={gent.avatar_url}
                name={gent.display_name}
                size="sm"
              />
              <div className="flex flex-col">
                <span className="text-sm text-ivory font-body font-medium">
                  {gent.display_name}
                </span>
                <span className="text-xs text-ivory-dim font-body capitalize">
                  {gent.full_alias}
                </span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function EntryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  const { entry, photos, loading, notFound, setEntry } = useEntry(id)
  const { filterId, setFilter } = useEntryFilter(id ?? '')
  const photoUrls = useMemo(() => photos.map((p) => p.url), [photos])
  const isCreator = !!entry && gent?.id === entry.created_by

  const [menuOpen, setMenuOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [generatingScene, setGeneratingScene] = useState(false)
  const [regeneratingLore, setRegeneratingLore] = useState(false)
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null)
  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
  const [titleModalOpen, setTitleModalOpen] = useState(false)
  const [generatingTitle, setGeneratingTitle] = useState(false)

  function handleExportToStudio() {
    navigate(`/studio?entry=${id}`)
  }

  function handleGenerateLoreFromMenu() {
    // Scroll smoothly to lore section; LoreSection manages its own generate flow
    const el = document.getElementById('lore-section')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  async function handleRegenerateLore() {
    if (!entry || regeneratingLore) return
    setRegeneratingLore(true)
    try {
      // Re-fetch entry to get latest metadata (including Director's Notes)
      const fresh = await fetchEntry(entry.id)
      const entryForLore = fresh ?? entry
      const result = await generateLoreFull(entryForLore, photoUrls)
      if (result) {
        const meta = { ...(entryForLore.metadata as Record<string, unknown> ?? {}), lore_oneliner: result.oneliner }
        await Promise.all([
          updateEntryLore(entry.id, result.lore),
          updateEntry(entry.id, { metadata: meta } as Partial<EntryWithParticipants>).catch(() => {}),
        ])
        const now = new Date().toISOString()
        setEntry({ ...entryForLore, lore: result.lore, lore_generated_at: now, metadata: meta })
        if (result.suggested_title) {
          setSuggestedTitle(result.suggested_title)
          addToast('Lore regenerated. New title suggested.', 'success')
        } else {
          addToast('Lore regenerated.', 'success')
        }
      } else {
        addToast('Could not regenerate lore. Try again.', 'error')
      }
    } catch {
      addToast('Lore regeneration failed.', 'error')
    } finally {
      setRegeneratingLore(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!entry) return
    setDeleting(true)
    try {
      await deleteEntry(entry.id)
      addToast('Entry deleted.', 'success')
      navigate('/chronicle', { replace: true })
    } catch {
      addToast('Could not delete entry. Try again.', 'error')
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  async function handleSetAsCover(url: string) {
    if (!entry) return
    try {
      await updateEntryCover(entry.id, url)
      setEntry(prev => prev ? { ...prev, cover_image_url: url } : prev)
      addToast('Cover updated.', 'success')
    } catch {
      addToast('Could not update cover.', 'error')
    }
  }

  async function handleGenerateScene() {
    if (!entry || generatingScene) return
    setGeneratingScene(true)
    try {
      const url = await generateScene(entry, entry.participants ?? [])
      if (url) {
        await updateEntry(entry.id, { scene_url: url } as Partial<EntryWithParticipants>)
        setEntry(prev => prev ? { ...prev, scene_url: url } : prev)
        addToast('Scene generated.', 'success')
      }
    } catch {
      addToast('Scene generation failed.', 'error')
    } finally {
      setGeneratingScene(false)
    }
  }

  async function handleTogglePin() {
    if (!entry) return
    const newPinned = !entry.pinned
    setEntry({ ...entry, pinned: newPinned })
    try {
      await togglePin(entry.id, newPinned)
      addToast(newPinned ? 'Entry pinned.' : 'Entry unpinned.', 'success')
    } catch {
      setEntry({ ...entry, pinned: !newPinned })
      addToast('Failed to update pin.', 'error')
    }
  }

  function handleLoreGenerated(lore: string, oneliner?: string | null, suggestedTitle?: string | null) {
    if (!entry) return
    const meta = { ...(entry.metadata as Record<string, unknown> ?? {}), lore_oneliner: oneliner ?? null }
    setEntry({
      ...entry,
      lore,
      lore_generated_at: new Date().toISOString(),
      metadata: meta,
    })
    if (suggestedTitle) {
      addToast(`Lore generated. Suggested title: "${suggestedTitle}"`, 'success')
      // Offer to apply the title
      setSuggestedTitle(suggestedTitle)
    } else {
      addToast('Lore generated.', 'success')
    }
  }

  async function handleOpenTitleModal() {
    if (!entry?.lore || generatingTitle) return
    setTitleModalOpen(true)
    setGeneratingTitle(true)
    setTitleSuggestions([])
    try {
      const titles = await generateTitleSuggestions(entry.lore, entry.type, {
        location: entry.location ?? undefined,
        city: entry.city ?? undefined,
        country: entry.country ?? undefined,
        date: entry.date,
      })
      if (titles.length > 0) {
        setTitleSuggestions(titles)
      } else {
        addToast('Could not generate titles. Try again.', 'error')
        setTitleModalOpen(false)
      }
    } catch {
      addToast('Title generation failed.', 'error')
      setTitleModalOpen(false)
    } finally {
      setGeneratingTitle(false)
    }
  }

  async function handlePickTitle(title: string) {
    if (!entry) return
    try {
      await updateEntry(entry.id, { title } as Partial<EntryWithParticipants>)
      setEntry({ ...entry, title })
      setTitleModalOpen(false)
      setTitleSuggestions([])
      addToast('Title updated.', 'success')
    } catch {
      addToast('Failed to update title.', 'error')
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="" back />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      </div>
    )
  }

  // ── Not found ──
  if (notFound || !entry) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Not Found" back />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-ivory-dim font-body text-sm text-center">
            This entry could not be found.
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/chronicle')}>
            Back to Chronicle
          </Button>
        </div>
      </div>
    )
  }

  const hasMetadata =
    entry.type === 'mission' ||
    entry.type === 'steak' ||
    entry.type === 'playstation' ||
    entry.location ||
    entry.city ||
    entry.description

  return (
    <>
      {/* TopBar — sits above hero, not inside it */}
      <TopBar
        title={entry.title}
        back
        right={
          <div className="flex items-center gap-1">
            {isCreator && entry.lore && (
              <button
                type="button"
                className="flex items-center justify-center w-8 h-8 rounded-full text-ivory-muted hover:text-gold hover:bg-slate-light transition-colors"
                onClick={handleOpenTitleModal}
                disabled={generatingTitle}
                aria-label="Suggest title from lore"
              >
                <Type size={16} className={generatingTitle ? 'animate-pulse text-gold' : ''} />
              </button>
            )}
            <button
              type="button"
              className="flex items-center justify-center w-8 h-8 rounded-full text-ivory-muted hover:text-ivory hover:bg-slate-light transition-colors"
              onClick={() => setMenuOpen(true)}
              aria-label="Entry options"
            >
              <MoreVertical size={18} />
            </button>
          </div>
        }
      />

      {/* Hero — full-bleed, no horizontal padding */}
      <EntryHero entry={entry} filterId={filterId} onEntryUpdate={setEntry} />

      {/* Scrollable content */}
      <PageWrapper padded scrollable className="space-y-6 pt-4">
        <AnimatePresence>
          <motion.div
            key="content"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="space-y-6"
          >
            {/* Metadata card */}
            {hasMetadata && (
              <motion.div variants={staggerItem}>
                <MetadataCard entry={entry} />
              </motion.div>
            )}

            {/* Lore section */}
            <motion.div variants={staggerItem} id="lore-section">
              <LoreSection
                entry={entry}
                photoUrls={photoUrls}
                readOnly={!isCreator}
                onLoreGenerated={handleLoreGenerated}
              />
            </motion.div>

            {/* AI title suggestion banner (from lore generation) */}
            {suggestedTitle && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <div className="flex items-center gap-3 bg-gold/8 border border-gold/20 rounded-lg px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gold font-body font-semibold">AI Title Suggestion</p>
                    <p className="text-sm text-ivory font-body truncate">{suggestedTitle}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePickTitle(suggestedTitle)}
                    className="text-xs text-gold border border-gold/30 rounded-full px-3 py-1 hover:border-gold/60 transition-colors shrink-0 font-body"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => setSuggestedTitle(null)}
                    className="text-ivory-dim hover:text-ivory transition-colors shrink-0"
                    aria-label="Dismiss"
                  >
                    <XIcon size={14} />
                  </button>
                </div>
              </motion.div>
            )}

            {/* Scene image */}
            {entry.scene_url && (
              <motion.div variants={staggerItem}>
                <div className="px-4 pb-4">
                  <img
                    src={entry.scene_url}
                    alt="AI Scene"
                    className="w-full rounded-xl border border-white/5 object-cover"
                    style={{ maxHeight: '320px' }}
                  />
                  <p className="text-[10px] tracking-[0.2em] uppercase text-ivory-dim/50 text-center mt-2 font-body">AI Scene</p>
                </div>
              </motion.div>
            )}

            {/* Entry reactions */}
            {entry.status === 'published' && (
              <motion.div variants={staggerItem}>
                <div className="px-4 pt-2 pb-4">
                  <EntryReactions entryId={entry.id} />
                </div>
              </motion.div>
            )}

            {/* Photos */}
            {photos.length > 0 && (
              <motion.div variants={staggerItem}>
                <div className="space-y-3">
                  <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
                    Photos
                  </p>
                  <FilterPicker filterId={filterId} onChange={setFilter} previewUrl={entry.cover_image_url ?? undefined} />
                  {entry.type === 'mission' || entry.type === 'night_out' ? (
                    <PhotoStoryboard
                      photos={photos}
                      onSetAsCover={handleSetAsCover}
                      currentCoverUrl={entry.cover_image_url ?? undefined}
                      filterId={filterId}
                    />
                  ) : (
                    <PhotoGrid
                      photos={photos}
                      onSetAsCover={handleSetAsCover}
                      currentCoverUrl={entry.cover_image_url ?? undefined}
                      filterId={filterId}
                    />
                  )}
                </div>
              </motion.div>
            )}

            {/* PlayStation scoreboard */}
            {entry.type === 'playstation' && (
              <motion.div variants={staggerItem}>
                <PS5Scoreboard entry={entry} />
              </motion.div>
            )}

            {/* Participants */}
            <motion.div variants={staggerItem}>
              <ParticipantsSection entry={entry} />
            </motion.div>

            {/* People Present (non-gent people tagged to this entry) */}
            <motion.div variants={staggerItem}>
              <PeoplePresent entryId={entry.id} />
            </motion.div>

            {/* Comments */}
            {entry.status === 'published' && (
              <motion.div variants={staggerItem}>
                <CommentsSection entryId={entry.id} entryTitle={entry.title} />
              </motion.div>
            )}

            {/* Actions */}
            <motion.div variants={staggerItem} className="space-y-3 pt-2">
              {isCreator && (
                <Button
                  variant="outline"
                  size="md"
                  fullWidth
                  onClick={() => navigate(`/chronicle/${entry.id}/edit`)}
                >
                  <Edit2 size={16} />
                  Edit Entry
                </Button>
              )}
              <Button
                variant="outline"
                size="md"
                fullWidth
                onClick={handleExportToStudio}
              >
                <Share2 size={16} />
                Export to Studio
              </Button>
              {isCreator && (
                <Button
                  variant="ghost"
                  size="md"
                  fullWidth
                  className="text-[--color-error] hover:bg-[--color-error]/10"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 size={16} />
                  Delete Entry
                </Button>
              )}
            </motion.div>

            {/* Bottom breathing room */}
            <div className="h-8" />
          </motion.div>
        </AnimatePresence>
      </PageWrapper>

      {/* Options menu modal */}
      <OptionsMenu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        isCreator={isCreator}
        hasLore={!!entry.lore}
        canGenerateScene={['mission', 'night_out', 'toast', 'gathering', 'interlude'].includes(entry.type)}
        generatingScene={generatingScene}
        regeneratingLore={regeneratingLore}
        isPinned={!!entry.pinned}
        onTogglePin={handleTogglePin}
        onGenerateLore={handleGenerateLoreFromMenu}
        onRegenerateLore={handleRegenerateLore}
        onGenerateScene={handleGenerateScene}
        onEdit={() => navigate(`/chronicle/${entry.id}/edit`)}
        onExport={handleExportToStudio}
        onDelete={() => setDeleteOpen(true)}
      />

      {/* Delete confirmation modal */}
      <DeleteConfirm
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDeleteConfirm}
        deleting={deleting}
        title={entry.title}
      />

      {/* Title suggestions modal */}
      <Modal isOpen={titleModalOpen} onClose={() => { setTitleModalOpen(false); setTitleSuggestions([]) }} title="Title Suggestions">
        <div className="flex flex-col gap-1 pb-2">
          {generatingTitle && titleSuggestions.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-6">
              <Spinner size="sm" />
              <p className="text-xs text-ivory-dim font-body">Generating titles from lore...</p>
            </div>
          )}
          {titleSuggestions.map((t, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-4 py-3 rounded-xl border border-white/10 text-sm font-body text-ivory hover:border-gold/30 hover:bg-gold/5 transition-colors"
              onClick={() => handlePickTitle(t)}
            >
              {t}
            </button>
          ))}
          {!generatingTitle && titleSuggestions.length > 0 && (
            <button
              type="button"
              className="mt-2 text-xs text-ivory-dim hover:text-gold font-body transition-colors text-center py-2"
              onClick={handleOpenTitleModal}
            >
              <RefreshCw size={12} className="inline mr-1.5" />
              Generate more
            </button>
          )}
        </div>
      </Modal>
    </>
  )
}
