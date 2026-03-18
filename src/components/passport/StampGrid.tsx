import { motion, AnimatePresence } from 'framer-motion'
import { StampCard } from './StampCard'
import { EmptyStateImage } from '@/components/ui/EmptyStateImage'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/animations'
import type { PassportStamp } from '@/types/app'

interface StampGridProps {
  stamps: PassportStamp[]
  onStampPress: (stamp: PassportStamp) => void
}

export function StampGrid({ stamps, onStampPress }: StampGridProps) {
  const large = stamps.length < 6

  return (
    <div
      className="bg-gradient-to-br from-[#1a1610] via-[#0f0d0a] to-[#1a1610] border border-gold/8 rounded-xl p-4"
      style={{ boxShadow: 'inset 0 0 40px rgba(201,168,76,0.03)' }}
    >
      <AnimatePresence mode="wait">
        {stamps.length === 0 ? (
          <motion.div
            key="empty"
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center justify-center py-16 gap-3"
          >
            <EmptyStateImage src="/empty-states/passport.webp" />
            <p className="text-ivory-dim text-sm text-center">
              No stamps yet. Log a mission to earn your first.
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className={`grid gap-4 ${
              stamps.length <= 2
                ? 'grid-cols-2 max-w-xs mx-auto'
                : stamps.length <= 3
                  ? 'grid-cols-3 max-w-sm mx-auto'
                  : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {stamps.map(stamp => (
              <motion.div key={stamp.id} variants={staggerItem}>
                <StampCard stamp={stamp} onPress={() => onStampPress(stamp)} large={large} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
