import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles } from 'lucide-react'
import { fadeIn, fadeUp } from '@/lib/animations'
import { Button, Spinner } from '@/components/ui'
import { generateWrapped } from '@/ai/wrapped'
import type { GentStats } from '@/types/app'

interface WrappedSectionProps {
  stats: GentStats[]
  selectedYear: number | null
}

type WrappedState = 'idle' | 'generating' | 'done'

export function WrappedSection({ stats, selectedYear }: WrappedSectionProps) {
  const [state, setState] = useState<WrappedState>('idle')
  const [narrative, setNarrative] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const targetYear = selectedYear ?? currentYear

  const handleGenerate = async () => {
    setState('generating')
    try {
      const result = await generateWrapped(targetYear, stats)
      setNarrative(result)
      setState('done')
    } catch {
      setState('done')
    }
  }

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        The Chronicles Wrapped — {targetYear}
      </p>

      <div className="bg-slate-mid rounded-xl p-5 shadow-card min-h-[120px] flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {state === 'idle' && (
            <motion.div
              key="idle"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center gap-3"
            >
              <p className="text-sm text-ivory-dim font-body text-center max-w-xs">
                Generate an AI-written narrative of what the Gents accomplished this year.
              </p>
              <Button
                variant="outline"
                size="md"
                onClick={handleGenerate}
                disabled={stats.length === 0}
              >
                <Sparkles size={15} className="text-gold" />
                Generate Wrapped
              </Button>
            </motion.div>
          )}

          {state === 'generating' && (
            <motion.div
              key="generating"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center gap-3 py-4"
            >
              <Spinner size="md" />
              <p className="text-sm text-ivory-dim font-body tracking-wide">
                Conjuring the narrative...
              </p>
            </motion.div>
          )}

          {state === 'done' && narrative && (
            <motion.div
              key="done"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full"
            >
              <div className="border-l-2 border-gold pl-4">
                <p className="font-display italic text-ivory text-base leading-relaxed whitespace-pre-wrap">
                  {narrative}
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => { setState('idle'); setNarrative(null) }}
                  className="text-xs text-ivory-dim hover:text-ivory-muted font-body underline underline-offset-2 transition-colors"
                >
                  Regenerate
                </button>
              </div>
            </motion.div>
          )}

          {state === 'done' && !narrative && (
            <motion.div
              key="empty"
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="flex flex-col items-center gap-3"
            >
              <p className="text-sm text-ivory-dim font-body text-center">
                The narrative could not be conjured. Try again.
              </p>
              <Button variant="ghost" size="sm" onClick={() => setState('idle')}>
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
