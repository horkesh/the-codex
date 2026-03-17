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

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-0 inset-x-0 z-50 px-4 pb-6"
          >
            <div className="rounded-2xl bg-[#141418] border border-white/8 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-display text-ivory">Scout Someone</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-ivory-dim hover:text-ivory transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Options */}
              <button
                type="button"
                onClick={() => onSelect('research')}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <Search size={16} className="text-gold" />
                </div>
                <div>
                  <p className="text-sm text-ivory font-body">Research</p>
                  <p className="text-xs text-ivory-dim font-body">Analyze an Instagram screenshot</p>
                </div>
              </button>

              <div className="h-px bg-white/5 mx-4" />

              <button
                type="button"
                onClick={() => onSelect('scan')}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <Camera size={16} className="text-gold" />
                </div>
                <div>
                  <p className="text-sm text-ivory font-body">Scan</p>
                  <p className="text-xs text-ivory-dim font-body">Camera or photo from gallery</p>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
