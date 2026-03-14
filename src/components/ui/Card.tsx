import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type CardVariant = 'default' | 'elevated' | 'entry' | 'glass'

interface CardProps {
  variant?: CardVariant
  entryType?: string  // kept for API compatibility, no longer used for styling
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

export function Card({
  variant = 'default',
  entryType: _entryType,
  className,
  children,
  onClick,
}: CardProps) {
  const isClickable = typeof onClick === 'function'

  const variantClasses: Record<CardVariant, string> = {
    default: 'bg-slate-mid rounded-xl border border-white/6',
    elevated: 'bg-slate-dark rounded-xl border border-white/6 hover:border-gold/25 transition-all duration-300',
    entry: 'bg-slate-dark rounded-xl border border-white/6 hover:border-gold/25 transition-all duration-300',
    glass: 'bg-white/4 backdrop-blur-xl border border-white/8 rounded-xl',
  }

  return (
    <motion.div
      className={cn('relative overflow-hidden', isClickable && 'cursor-pointer', variantClasses[variant], className)}
      onClick={onClick}
      whileHover={isClickable ? { y: -1, boxShadow: '0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(201,168,76,0.15)' } : undefined}
      transition={{ duration: 0.15, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}
