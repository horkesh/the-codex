import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { formatDate } from '@/lib/utils'
import { Button } from '@/components/ui'
import { generateLore } from '@/ai/lore'
import { updateEntryLore } from '@/data/entries'
import { fadeUp } from '@/lib/animations'
import type { EntryWithParticipants } from '@/types/app'

interface LoreSectionProps {
  entry: EntryWithParticipants
  onLoreGenerated?: (lore: string) => void
}

export function LoreSection({ entry, onLoreGenerated }: LoreSectionProps) {
  const [generating, setGenerating] = useState(false)
  const [localLore, setLocalLore] = useState<string | null>(entry.lore)
  const [localLoreDate, setLocalLoreDate] = useState<string | null>(entry.lore_generated_at)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setError(null)
    try {
      const lore = await generateLore(entry)
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
