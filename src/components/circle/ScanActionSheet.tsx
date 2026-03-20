import { motion, AnimatePresence } from 'framer-motion'
import { Search, Camera, X } from 'lucide-react'

interface ScanActionSheetProps {
  open: boolean
  onClose: () => void
  onSelect: (mode: 'research' | 'scan') => void
}

export function ScanActionSheet({ open, onClose, onSelect }: ScanActionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Full panel — fills below TopBar + SectionNav + tab bar (≈136px) */}
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed inset-x-0 bottom-0 z-50 flex flex-col bg-[#141418] border-t border-white/8"
            style={{ top: '136px' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
              <h3 className="text-base font-display text-ivory">Scout Someone</h3>
              <button
                type="button"
                onClick={onClose}
                className="text-ivory-dim hover:text-ivory transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Options — centered in remaining space */}
            <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
              <button
                type="button"
                onClick={() => onSelect('research')}
                className="w-full flex items-center gap-4 px-5 py-5 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/5 active:bg-white/8 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <Search size={20} className="text-gold" />
                </div>
                <div>
                  <p className="text-base text-ivory font-body font-medium">Research</p>
                  <p className="text-sm text-ivory-dim font-body mt-0.5">Analyze an Instagram screenshot</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onSelect('scan')}
                className="w-full flex items-center gap-4 px-5 py-5 rounded-xl bg-white/[0.03] border border-white/8 hover:bg-white/5 active:bg-white/8 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <Camera size={20} className="text-gold" />
                </div>
                <div>
                  <p className="text-base text-ivory font-body font-medium">Scan</p>
                  <p className="text-sm text-ivory-dim font-body mt-0.5">Camera or photo from gallery</p>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
