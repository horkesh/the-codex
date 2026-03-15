import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingTip } from '@/hooks/useOnboardingTip'

interface OnboardingTipProps {
  tipKey: string
  title: string
  body: string
}

export function OnboardingTip({ tipKey, title, body }: OnboardingTipProps) {
  const { show, dismiss } = useOnboardingTip(tipKey)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.2 }}
          className="mx-4 mb-4 flex items-start gap-3 bg-gold/6 border border-gold/20 rounded-xl px-4 py-3"
        >
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gold font-body font-semibold uppercase tracking-widest mb-0.5">
              {title}
            </p>
            <p className="text-xs text-ivory-muted font-body leading-relaxed">{body}</p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            className="shrink-0 mt-0.5 text-ivory-dim hover:text-ivory transition-colors"
            aria-label="Dismiss tip"
          >
            <X size={14} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
