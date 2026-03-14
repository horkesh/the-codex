import { motion } from 'framer-motion'
import { daysUntil, cn } from '@/lib/utils'

interface CountdownBadgeProps {
  eventDate: string
}

export function CountdownBadge({ eventDate }: CountdownBadgeProps) {
  const days = daysUntil(eventDate)

  if (days > 0) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold/20 border border-gold/40 text-gold font-body text-sm font-medium">
        In {days} {days === 1 ? 'day' : 'days'}
      </span>
    )
  }

  if (days === 0) {
    return (
      <motion.span
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gold border border-gold text-obsidian font-body text-sm font-semibold"
      >
        Today!
      </motion.span>
    )
  }

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/10 font-body text-sm',
      'text-ivory-dim bg-slate-light',
    )}>
      Past event
    </span>
  )
}
