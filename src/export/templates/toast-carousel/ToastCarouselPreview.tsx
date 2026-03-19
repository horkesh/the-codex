import { useState, forwardRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { ToastSessionCard } from '../ToastSessionCard'

interface ToastCarouselProps {
  entry: {
    title: string
    date: string
    location: string | null
    lore: string | null
    metadata: Record<string, unknown>
  }
  backgroundUrl?: string
  activeSlide?: number
  onSlideChange?: (slide: number) => void
}

const SLIDE_COUNT = 3

export const ToastCarouselPreview = forwardRef<HTMLDivElement, ToastCarouselProps>(
  ({ entry, backgroundUrl, activeSlide: controlledSlide, onSlideChange }, ref) => {
    const [internalSlide, setInternalSlide] = useState(0)
    const active = controlledSlide ?? internalSlide

    const setSlide = (n: number) => {
      setInternalSlide(n)
      onSlideChange?.(n)
    }

    // Reset internal slide when controlled changes
    useEffect(() => {
      if (controlledSlide !== undefined) setInternalSlide(controlledSlide)
    }, [controlledSlide])

    const variant = (active + 1) as 1 | 2 | 3 | 4

    return (
      <div className="relative">
        <ToastSessionCard
          ref={ref}
          entry={entry}
          backgroundUrl={backgroundUrl}
          variant={variant <= 4 ? variant : 1}
        />

        {/* Navigation dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {Array.from({ length: SLIDE_COUNT }).map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`w-2 h-2 rounded-full transition-colors ${
                i === active ? 'bg-gold' : 'bg-white/30'
              }`}
            />
          ))}
        </div>

        {/* Arrows */}
        {active > 0 && (
          <button
            onClick={() => setSlide(active - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white z-10"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {active < SLIDE_COUNT - 1 && (
          <button
            onClick={() => setSlide(active + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white z-10"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    )
  },
)

ToastCarouselPreview.displayName = 'ToastCarouselPreview'
