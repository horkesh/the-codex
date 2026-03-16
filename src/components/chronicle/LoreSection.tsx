import { useState, useRef, useEffect } from 'react'
import { Sparkles, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui'
import { generateLore } from '@/ai/lore'
import { updateEntryLore, updateEntry } from '@/data/entries'
import { fadeUp } from '@/lib/animations'
import type { EntryWithParticipants } from '@/types/app'

interface LoreSectionProps {
  entry: EntryWithParticipants
  photoUrls?: string[]
  onLoreGenerated?: (lore: string) => void
}

export function LoreSection({ entry, photoUrls, onLoreGenerated }: LoreSectionProps) {
  const [generating, setGenerating] = useState(false)
  const [localLore, setLocalLore] = useState<string | null>(entry.lore)
  const [localLoreDate, setLocalLoreDate] = useState<string | null>(entry.lore_generated_at)
  const [error, setError] = useState<string | null>(null)

  // Director's notes (lore hints)
  const savedHints = (entry.metadata as Record<string, unknown>)?.lore_hints as string | undefined
  const [hints, setHints] = useState(savedHints ?? '')
  const [hintsOpen, setHintsOpen] = useState(!!savedHints)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-save hints to entry metadata after 1s of inactivity
  useEffect(() => {
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current) }
  }, [])

  function handleHintsChange(value: string) {
    setHints(value)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      const meta = { ...(entry.metadata as Record<string, unknown> ?? {}), lore_hints: value || null }
      updateEntry(entry.id, { metadata: meta } as Partial<EntryWithParticipants>).catch(() => {})
    }, 1000)
  }

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      // Pass hints via entry metadata so the edge function can read them
      const entryWithHints = hints.trim()
        ? { ...entry, metadata: { ...(entry.metadata as Record<string, unknown> ?? {}), lore_hints: hints.trim() } }
        : entry
      const lore = await generateLore(entryWithHints, photoUrls)
      if (lore) {
        await updateEntryLore(entry.id, lore)
        const now = new Date().toISOString()
        setLocalLore(lore)
        setLocalLoreDate(now)
        onLoreGenerated?.(lore)
      } else {
        setError('The lore could not be summoned. Try again.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setGenerating(false)
    }
  }

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

      {/* Director's Notes toggle */}
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
              These hints guide lore generation. Auto-saved.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

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
            <p className="text-gold/90 font-display italic text-base leading-relaxed">
              {localLore}
            </p>
            {localLoreDate && (
              <p className="text-xs text-ivory-dim font-body">
                Generated {formatDate(localLoreDate)}
              </p>
            )}
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generating}
            >
              <Sparkles size={14} />
              Generate Lore
            </Button>
            {error && (
              <p className="text-xs text-[--color-error] text-center">{error}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
