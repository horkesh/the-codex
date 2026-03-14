import { motion } from 'framer-motion'
import { stampReveal } from '@/lib/animations'
import { cn, flagEmoji } from '@/lib/utils'
import type { PassportStamp } from '@/types/app'

interface StampCardProps {
  stamp: PassportStamp
  onPress: () => void
}

function StampPlaceholder({ stamp }: { stamp: PassportStamp }) {
  if (stamp.type === 'mission') {
    return (
      <div className="w-20 h-20 rounded-full bg-slate-light flex items-center justify-center">
        <span className="text-2xl leading-none" role="img" aria-label={stamp.country ?? 'location'}>
          {stamp.country_code ? flagEmoji(stamp.country_code) : '📍'}
        </span>
      </div>
    )
  }

  if (stamp.type === 'achievement') {
    return (
      <div className="w-20 h-20 rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center">
        <span className="text-2xl leading-none" role="img" aria-label="achievement">
          🏆
        </span>
      </div>
    )
  }

  // diplomatic
  return (
    <div className="w-20 h-20 rounded-full bg-slate-mid border border-gold/30 flex items-center justify-center">
      <span className="text-2xl leading-none" role="img" aria-label="diplomatic">
        🕊️
      </span>
    </div>
  )
}

export function StampCard({ stamp, onPress }: StampCardProps) {
  return (
    <motion.button
      type="button"
      onClick={onPress}
      variants={stampReveal}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'flex flex-col items-center gap-1.5 w-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-xl p-1',
      )}
      aria-label={stamp.name}
    >
      {/* Stamp circle */}
      {stamp.image_url ? (
        <div className="w-20 h-20 rounded-full overflow-hidden ring-2 ring-gold/20 shadow-[0_0_12px_rgba(201,168,76,0.15)]">
          <img
            src={stamp.image_url}
            alt={stamp.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ) : (
        <StampPlaceholder stamp={stamp} />
      )}

      {/* City name */}
      {stamp.city && (
        <span className="text-xs text-ivory-dim leading-tight text-center max-w-full truncate px-1">
          {stamp.city}
        </span>
      )}

      {/* Date */}
      <span className="text-[10px] text-ivory-dim/60 leading-tight">
        {new Date(stamp.date_earned).getFullYear()}
      </span>
    </motion.button>
  )
}
