import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { EntryType } from '@/types/app'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'

type CardVariant = 'default' | 'elevated' | 'entry' | 'glass'

interface CardProps {
  variant?: CardVariant
  entryType?: EntryType
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

export function Card({
  variant = 'default',
  entryType,
  className,
  children,
  onClick,
}: CardProps) {
  const isClickable = typeof onClick === 'function'

  const variantClasses: Record<CardVariant, string> = {
    default: 'bg-slate-mid rounded-lg shadow-card',
    elevated: 'bg-slate-dark rounded-lg shadow-card hover:shadow-gold transition-shadow duration-300',
    entry: 'bg-slate-mid rounded-lg shadow-card border-l-4',
    glass: 'bg-white/5 backdrop-blur-md border border-white/10 rounded-lg',
  }

  const entryStyle =
    variant === 'entry'
      ? { borderLeftColor: entryType ? ENTRY_TYPE_META[entryType].borderColor : 'var(--color-gold)' }
      : undefined

  return (
    <motion.div
      className={cn('relative overflow-hidden', isClickable && 'cursor-pointer', variantClasses[variant], className)}
      style={entryStyle}
      onClick={onClick}
      whileHover={isClickable ? { y: -2 } : undefined}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
