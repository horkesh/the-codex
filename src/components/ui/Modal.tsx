import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { fadeIn, slideUp } from '@/lib/animations'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  // Stable ref so the Escape listener never needs to re-register due to onClose identity changes
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose })

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isOpen])

  // Escape key — depends only on isOpen
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="modal-backdrop"
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            aria-hidden="true"
          />

          {/* Single panel: bottom sheet on mobile, centered on desktop */}
          <motion.div
            key="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-[51]',
              'bg-slate-dark rounded-t-2xl px-4 pt-2 pb-8 safe-bottom',
              'max-h-[90vh] overflow-y-auto overscroll-contain',
              'md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:left-1/2 md:-translate-x-1/2',
              'md:w-full md:max-w-md md:rounded-2xl md:px-6 md:pt-6 md:pb-8',
              'md:shadow-[--shadow-modal]',
              className,
            )}
            variants={slideUp}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.9 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drag handle — mobile only */}
            <div className="flex justify-center mb-4 md:hidden">
              <div className="w-10 h-0.5 rounded-full bg-gold-dim" />
            </div>

            {title && (
              <h2 className="font-display text-lg text-ivory mb-4 px-1 md:px-0">{title}</h2>
            )}

            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
