import type { Variants } from 'framer-motion'

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
}

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
}

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.08 } },
  exit: {},
}

export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: 8, scale: 0.97, transition: { duration: 0.2 } },
}

export const stampReveal: Variants = {
  initial: { scale: 0, rotate: -15, opacity: 0 },
  animate: {
    scale: 1, rotate: 0, opacity: 1,
    transition: { type: 'spring', stiffness: 300, damping: 20, duration: 0.6 },
  },
}

export const slideUp: Variants = {
  initial: { y: '100%' },
  animate: { y: 0, transition: { type: 'spring', stiffness: 300, damping: 30 } },
  exit: { y: '100%', transition: { duration: 0.25, ease: 'easeIn' } },
}

// Achievement unlock — full-screen gold moment
export const achievementUnlock: Variants = {
  initial: { scale: 0.5, opacity: 0, rotate: -10 },
  animate: {
    scale: 1, opacity: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 200, damping: 15 },
  },
  exit: { scale: 1.1, opacity: 0, transition: { duration: 0.3 } },
}

// Lore text fade — paragraph by paragraph
export const loreFadeIn: Variants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' } },
}

// Card flip (for guest book submit)
export const cardFlip: Variants = {
  initial: { rotateY: 90, opacity: 0 },
  animate: { rotateY: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
  exit: { rotateY: -90, opacity: 0, transition: { duration: 0.3 } },
}

// Gather invite unfold
export const inviteUnfold: Variants = {
  initial: { scaleY: 0, opacity: 0, transformOrigin: 'top center' },
  animate: { scaleY: 1, opacity: 1, transition: { type: 'spring', stiffness: 150, damping: 20 } },
  exit: { scaleY: 0, opacity: 0, transition: { duration: 0.2 } },
}
