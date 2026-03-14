import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

type SpinnerSize = 'sm' | 'md' | 'lg'

interface SpinnerProps {
  size?: SpinnerSize
  className?: string
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
}

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const px = sizeMap[size]
  const r = (px - 4) / 2
  const circumference = 2 * Math.PI * r

  return (
    <motion.svg
      width={px}
      height={px}
      viewBox={`0 0 ${px} ${px}`}
      fill="none"
      className={cn('text-gold', className)}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.9, ease: 'linear', repeat: Infinity }}
      aria-label="Loading"
      role="status"
    >
      {/* Track */}
      <circle
        cx={px / 2}
        cy={px / 2}
        r={r}
        stroke="currentColor"
        strokeOpacity={0.15}
        strokeWidth={2}
      />
      {/* Arc */}
      <circle
        cx={px / 2}
        cy={px / 2}
        r={r}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * 0.75}
        transform={`rotate(-90 ${px / 2} ${px / 2})`}
      />
    </motion.svg>
  )
}
