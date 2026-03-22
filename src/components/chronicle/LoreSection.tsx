import { useState, useRef, useEffect } from 'react'
import { Sparkles, ChevronDown, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui'
import { generateLoreFull } from '@/ai/lore'
import { updateEntryLore, updateEntry } from '@/data/entries'
import { fadeUp } from '@/lib/animations'
import { useNarration } from '@/hooks/useNarration'
import type { EntryWithParticipants } from '@/types/app'

interface LoreSectionProps {
  entry: EntryWithParticipants
  photoUrls?: string[]
  readOnly?: boolean
  /** Current gent ID — used for per-gent Director's Notes */
  gentId?: string
  onLoreGenerated?: (lore: string, oneliner?: string | null, suggestedTitle?: string | null) => void
}

/** Collect all lore hints (legacy single + per-gent) into one combined string for the prompt. */
function collectAllHints(meta: Record<string, unknown>): string {
  const parts: string[] = []
  // Legacy single-field hints
  if (typeof meta.lore_hints === 'string' && meta.lore_hints.trim()) {
    parts.push(meta.lore_hints.trim())
  }
  // Per-gent hints
  for (const [key, val] of Object.entries(meta)) {
    if (key.startsWith('lore_hints_') && typeof val === 'string' && val.trim()) {
      parts.push(val.trim())
    }
  }
  return parts.join('\n')
}

export function LoreSection({ entry, photoUrls, readOnly, gentId, onLoreGenerated }: LoreSectionProps) {
  const [generating, setGenerating] = useState(false)
  const [localLore, setLocalLore] = useState<string | null>(entry.lore)
  const [localLoreDate, setLocalLoreDate] = useState<string | null>(entry.lore_generated_at)
  const [error, setError] = useState<string | null>(null)

  const meta = (entry.metadata as Record<string, unknown>) ?? {}

  // Per-gent Director's Notes — each gent edits their own field
  const hintsKey = gentId ? `lore_hints_${gentId}` : 'lore_hints'
  const savedHints = (meta[hintsKey] as string | undefined) ?? ''
  const [hints, setHints] = useState(savedHints)
  const [hintsOpen, setHintsOpen] = useState(!!savedHints)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Count other gents' notes (so we can show "2 others have notes")
  const otherHintsCount = Object.keys(meta).filter(
    k => k.startsWith('lore_hints_') && k !== hintsKey && typeof meta[k] === 'string' && (meta[k] as string).trim()
  ).length

  // Keep a ref to entry so the debounced save always reads fresh metadata
  const entryRef = useRef(entry)
  entryRef.current = entry

  // Narration (listen to lore)
  const { audioUrl, generating: narrationGenerating, playing, generate: generateNarration, play: playNarration } = useNarration(entry.id)

  // Auto-save hints to entry metadata after 1s of inactivity
  const unmounted = useRef(false)
  useEffect(() => {
    return () => {
      unmounted.current = true
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  function handleHintsChange(value: string) {
    setHints(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      if (unmounted.current) return
      // Read fresh metadata from ref to avoid stale closure overwrites
      const freshMeta = (entryRef.current.metadata as Record<string, unknown>) ?? {}
      const updated = { ...freshMeta, [hintsKey]: value || null }
      updateEntry(entry.id, { metadata: updated } as Partial<EntryWithParticipants>).catch(() => {})
    }, 1000)
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      // Combine all gents' hints + current textarea value into a single lore_hints for the prompt
      const currentMeta = { ...meta, [hintsKey]: hints.trim() || null }
      const combined = collectAllHints(currentMeta)
      const entryForPrompt = combined
        ? { ...entry, metadata: { ...currentMeta, lore_hints: combined } }
        : { ...entry, metadata: currentMeta }
      const result = await generateLoreFull(entryForPrompt, photoUrls)
      if (result) {
        const saveMeta = { ...currentMeta, lore_oneliner: result.oneliner }
        await Promise.all([
          updateEntryLore(entry.id, result.lore),
          updateEntry(entry.id, { metadata: saveMeta } as Partial<EntryWithParticipants>).catch(() => {}),
        ])
        const now = new Date().toISOString()
        setLocalLore(result.lore)
        setLocalLoreDate(now)
        onLoreGenerated?.(result.lore, result.oneliner, result.suggested_title)
      } else {
        setError('The lore could not be summoned. Try again.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setGenerating(false)
    }
  }

  // Any participant can add notes; only creator can generate
  const isParticipant = gentId ? entry.participants?.some(p => p.id === gentId) ?? false : false
  const canAddNotes = isParticipant
  const canGenerate = !readOnly

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gold/20" />
        <span className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
          The Lore
        </span>
        <div className="h-px flex-1 bg-gold/20" />
      </div>

      {/* Director's Notes — any gent can add their own */}
      {canAddNotes && (
        <>
          <button
            type="button"
            onClick={() => setHintsOpen(!hintsOpen)}
            className="flex items-center gap-2 text-xs text-ivory-dim hover:text-ivory-muted transition-colors font-body"
          >
            <ChevronDown
              size={14}
              className={`transition-transform duration-200 ${hintsOpen ? 'rotate-0' : '-rotate-90'}`}
            />
            Director's Notes
            {hints.trim() && !hintsOpen && (
              <span className="text-gold/60 ml-1">*</span>
            )}
            {otherHintsCount > 0 && (
              <span className="text-ivory-dim/40 ml-1">
                +{otherHintsCount} other{otherHintsCount > 1 ? 's' : ''}
              </span>
            )}
          </button>

          <AnimatePresence>
            {hintsOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <textarea
                  value={hints}
                  onChange={(e) => handleHintsChange(e.target.value)}
                  placeholder="Add context for the AI... e.g. 'We ran into Omar's colleague at the bar' or 'Haris dominated every match'"
                  rows={2}
                  className="w-full bg-slate-mid border border-white/8 rounded-lg px-3 py-2 text-sm text-ivory font-body placeholder:text-ivory-dim/50 focus:outline-none focus:border-gold/30 resize-none"
                />
                <p className="text-[10px] text-ivory-dim/50 font-body mt-1">
                  Your notes guide lore generation. All Gents' notes are combined. Auto-saved.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      <AnimatePresence mode="wait">
        {/* Generating shimmer skeleton */}
        {generating && (
          <motion.div
            key="shimmer"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-2 py-1"
          >
            <div className="h-4 rounded bg-slate-light/50 animate-pulse w-full" />
            <div className="h-4 rounded bg-slate-light/50 animate-pulse w-[90%]" />
            <div className="h-4 rounded bg-slate-light/50 animate-pulse w-[75%]" />
          </motion.div>
        )}

        {/* Has lore */}
        {!generating && localLore && (
          <motion.div
            key="lore"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-2"
          >
            <p className="text-gold/90 font-display italic text-base leading-relaxed whitespace-pre-wrap">
              {localLore}
            </p>
            <div className="flex items-center gap-3">
              {localLoreDate && (
                <p className="text-xs text-ivory-dim font-body">
                  Generated {formatDate(localLoreDate)}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  if (audioUrl) { playNarration() }
                  else if (localLore) { generateNarration(localLore) }
                }}
                disabled={narrationGenerating}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-xs font-body text-gold hover:bg-gold/15 transition-colors disabled:opacity-40"
              >
                {narrationGenerating ? (
                  <><Loader2 size={12} className="animate-spin" /> Generating...</>
                ) : playing ? (
                  <><VolumeX size={12} /> Stop</>
                ) : (
                  <><Volume2 size={12} /> Listen</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* No lore, not generating */}
        {!generating && !localLore && (
          <motion.div
            key="empty"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center gap-3 py-4"
          >
            <p className="text-sm text-ivory-dim text-center font-body">
              No lore has been written for this entry yet.
            </p>
            {canGenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={generating}
              >
                <Sparkles size={14} />
                Generate Lore
              </Button>
            )}
            {error && (
              <p className="text-xs text-[--color-error] text-center">{error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
