import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface PageWrapperProps {
  children: React.ReactNode
  className?: string
  /** Adds horizontal px-4 padding. Default: true */
  padded?: boolean
  /** Enables vertical scrolling. Default: true */
  scrollable?: boolean
}

export function PageWrapper({
  children,
  className,
  padded = true,
  scrollable = true,
}: PageWrapperProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      exit="exit"
      className={cn(
        'flex-1 pt-2 pb-6',
        scrollable && 'overflow-y-auto',
        padded && 'px-4',
        className,
      )}
    >
      {children}
    </motion.div>
  )
}
