import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { getFilter } from '@/lib/photoFilters'
import type { FilterId } from '@/lib/photoFilters'

interface Photo {
  id: string
  url: string
  caption: string | null
}

interface PhotoStoryboardProps {
  photos: Photo[]
  onSetAsCover?: (url: string) => void
  currentCoverUrl?: string
  filterId?: FilterId
}

/*
 * Layout pattern (repeating cycle):
 *   hero   — 1 photo, full width, 16:9
 *   duo    — 2 photos, side by side, square
 *   trio   — 3 photos: tall portrait left + 2 stacked landscape right
 *   wide   — 1 photo, cinematic 2.2:1
 *
 * Gold ornamental dividers separate each block.
 * For < 7 photos the cycle is truncated naturally.
 */

type Block =
  | { type: 'hero'; photos: Photo[] }
  | { type: 'duo'; photos: Photo[] }
  | { type: 'trio'; photos: Photo[] }
  | { type: 'wide'; photos: Photo[] }

function buildBlocks(photos: Photo[]): Block[] {
  const blocks: Block[] = []
  let i = 0
  const pattern: Array<{ type: Block['type']; count: number }> = [
    { type: 'hero', count: 1 },
    { type: 'duo', count: 2 },
    { type: 'trio', count: 3 },
    { type: 'wide', count: 1 },
  ]

  let patIdx = 0
  while (i < photos.length) {
    const { type, count } = pattern[patIdx % pattern.length]
    const remaining = photos.length - i

    // If we only have 1 photo left and next block wants more, just do a wide
    if (remaining === 1) {
      blocks.push({ type: 'wide', photos: photos.slice(i, i + 1) })
      i += 1
    }
    // If we only have 2 left and next block wants 3, do a duo
    else if (remaining === 2 && count === 3) {
      blocks.push({ type: 'duo', photos: photos.slice(i, i + 2) })
      i += 2
    } else {
      const take = Math.min(count, remaining)
      blocks.push({ type, photos: photos.slice(i, i + take) })
      i += take
    }
    patIdx++
  }
  return blocks
}

function Divider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="flex-1 h-px bg-gold/20" />
      <div className="w-1 h-1 rounded-full border border-gold/40" />
      <div className="flex-1 h-px bg-gold/20" />
    </div>
  )
}

export function PhotoStoryboard({ photos, onSetAsCover, currentCoverUrl, filterId }: PhotoStoryboardProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)
  const filter = getFilter(filterId)

  if (photos.length === 0) return null

  const blocks = buildBlocks(photos)

  function renderPhoto(photo: Photo, aspectClass: string) {
    return (
      <motion.button
        key={photo.id}
        variants={staggerItem}
        className={`relative ${aspectClass} rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold group`}
        onClick={() => setLightboxPhoto(photo)}
        aria-label={photo.caption ?? 'View photo'}
      >
        <img
          src={photo.url}
          alt={photo.caption ?? ''}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          style={{ filter: filter.css }}
          draggable={false}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ background: filter.vignette }} />
        <div className="absolute inset-0 bg-obsidian/0 group-hover:bg-obsidian/20 transition-colors duration-200" />
      </motion.button>
    )
  }

  return (
    <>
      <motion.div
        className="flex flex-col gap-1.5"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {blocks.map((block, idx) => (
          <div key={idx}>
            {idx > 0 && <Divider />}

            {block.type === 'hero' && (
              <div className="flex flex-col gap-1.5">
                {renderPhoto(block.photos[0], 'aspect-video')}
              </div>
            )}

            {block.type === 'duo' && (
              <div className="grid grid-cols-2 gap-1.5">
                {block.photos.map((p) => renderPhoto(p, 'aspect-square'))}
              </div>
            )}

            {block.type === 'trio' && (
              <div className="flex gap-1.5">
                {/* Tall portrait left */}
                <div className="flex-[1.4] min-w-0">
                  {renderPhoto(block.photos[0], 'aspect-[3/4]')}
                </div>
                {/* Two stacked landscape right */}
                <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                  {block.photos.slice(1).map((p) => renderPhoto(p, 'aspect-[4/3]'))}
                </div>
              </div>
            )}

            {block.type === 'wide' && (
              <div className="flex flex-col gap-1.5">
                {renderPhoto(block.photos[0], 'aspect-[2.2/1]')}
              </div>
            )}
          </div>
        ))}
      </motion.div>

      {/* Lightbox Modal — same as PhotoGrid */}
      <Modal
        isOpen={lightboxPhoto !== null}
        onClose={() => setLightboxPhoto(null)}
        className="!bg-obsidian/95 !max-w-2xl !rounded-xl !px-2 !pt-2 !pb-4"
      >
        {lightboxPhoto && (
          <div className="flex flex-col gap-3">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                className="p-1.5 rounded-full bg-slate-light/60 text-ivory-muted hover:text-ivory hover:bg-slate-light transition-colors"
                aria-label="Close photo"
              >
                <X size={16} />
              </button>
            </div>

            <div className="rounded-lg overflow-hidden">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption ?? ''}
                className="w-full max-h-[70vh] object-contain"
                draggable={false}
              />
            </div>

            {lightboxPhoto.caption && (
              <p className="text-sm text-ivory-muted text-center font-body px-2">
                {lightboxPhoto.caption}
              </p>
            )}

            {onSetAsCover && lightboxPhoto.url !== currentCoverUrl && (
              <button
                type="button"
                onClick={() => { onSetAsCover(lightboxPhoto.url); setLightboxPhoto(null) }}
                className="text-xs text-gold font-body border border-gold/30 rounded-full px-4 py-1.5 hover:border-gold/60 transition-colors self-center"
              >
                Set as cover image
              </button>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
