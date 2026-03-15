import { useState } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Trash2 } from 'lucide-react'

const OPEN_X = -80        // how far left the card rests when open
const DRAG_THRESHOLD = 50 // min drag distance to snap open

interface SwipeToDeleteProps {
  onDelete: () => void | Promise<void>
  children: React.ReactNode
}

export function SwipeToDelete({ onDelete, children }: SwipeToDeleteProps) {
  const x = useMotionValue(0)
  const [isOpen, setIsOpen] = useState(false)

  // Fade the trash button in as the card slides left
  const trashOpacity = useTransform(x, [OPEN_X, -30], [1, 0])
  const trashScale  = useTransform(x, [OPEN_X, -30], [1, 0.6])

  function snapTo(target: number) {
    setIsOpen(target !== 0)
    animate(x, target, { type: 'spring', stiffness: 500, damping: 40 })
  }

  function handleDragEnd(_: unknown, info: { offset: { x: number }; velocity: { x: number } }) {
    const fastSwipe = info.velocity.x < -400
    const farEnough = info.offset.x < -DRAG_THRESHOLD
    snapTo(fastSwipe || farEnough ? OPEN_X : 0)
  }

  async function handleDelete() {
    // Slide the card fully off screen, then notify parent
    await animate(x, -600, { type: 'tween', duration: 0.22, ease: 'easeIn' })
    onDelete()
  }

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete zone — sits behind the card */}
      <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center rounded-r-xl bg-red-950/90">
        <motion.button
          type="button"
          onClick={handleDelete}
          style={{ opacity: trashOpacity, scale: trashScale }}
          className="flex flex-col items-center gap-1"
          aria-label="Delete entry"
        >
          <Trash2 size={18} className="text-red-400" />
          <span className="text-[10px] text-red-400 font-body tracking-wide">Delete</span>
        </motion.button>
      </div>

      {/* Draggable card */}
      <motion.div
        drag="x"
        dragConstraints={{ left: OPEN_X, right: 0 }}
        dragElastic={{ left: 0.05, right: 0.15 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
      >
        {children}
      </motion.div>

      {/* Invisible overlay when open — tapping anywhere on the card closes it */}
      {isOpen && (
        <div
          className="absolute inset-0 z-10"
          onClick={() => snapTo(0)}
        />
      )}
    </div>
  )
}
