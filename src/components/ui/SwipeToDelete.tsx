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

  // Delete zone: invisible until drag starts, fully visible when snapped open
  const deleteZoneOpacity = useTransform(x, [-10, OPEN_X], [0, 1])
  const trashScale = useTransform(x, [OPEN_X, -30], [1, 0.6])

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
    await animate(x, -600, { type: 'tween', duration: 0.22, ease: 'easeIn' })
    onDelete()
  }

  return (
    <div className="relative rounded-xl overflow-hidden">
      {/* Delete zone — sits behind the card, hidden until drag reveals it */}
      <motion.div
        className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-950"
        style={{ opacity: deleteZoneOpacity }}
      >
        <button
          type="button"
          onClick={handleDelete}
          className="flex flex-col items-center gap-1"
          aria-label="Delete entry"
        >
          <motion.div style={{ scale: trashScale }}>
            <Trash2 size={18} className="text-red-400" />
          </motion.div>
          <span className="text-[10px] text-red-400 font-body tracking-wide">Delete</span>
        </button>
      </motion.div>

      {/* Draggable card — opaque background covers delete zone at rest */}
      <motion.div
        drag="x"
        dragConstraints={{ left: OPEN_X, right: 0 }}
        dragElastic={{ left: 0.05, right: 0.15 }}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="rounded-xl bg-slate-dark"
      >
        {children}
      </motion.div>

      {/* Overlay when open — only covers the card area, not the delete zone */}
      {isOpen && (
        <div
          className="absolute inset-y-0 left-0 z-10"
          style={{ right: `${Math.abs(OPEN_X)}px` }}
          onClick={() => snapTo(0)}
        />
      )}
    </div>
  )
}
