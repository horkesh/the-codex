import { useState } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui'
import { staggerContainer, staggerItem } from '@/lib/animations'

interface Photo {
  id: string
  url: string
  caption: string | null
}

interface PhotoGridProps {
  photos: Photo[]
  className?: string
}

export function PhotoGrid({ photos, className }: PhotoGridProps) {
  const [lightboxPhoto, setLightboxPhoto] = useState<Photo | null>(null)

  if (photos.length === 0) return null

  return (
    <>
      <motion.div
        className={cn(
          'grid grid-cols-2 md:grid-cols-3 gap-2',
          className,
        )}
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {photos.map((photo) => (
          <motion.button
            key={photo.id}
            variants={staggerItem}
            className="relative aspect-square rounded-lg overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold group"
            onClick={() => setLightboxPhoto(photo)}
            aria-label={photo.caption ?? 'View photo'}
          >
            <img
              src={photo.url}
              alt={photo.caption ?? ''}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              draggable={false}
            />
            {/* Hover overlay */}
            <div className="absolute inset-0 bg-obsidian/0 group-hover:bg-obsidian/20 transition-colors duration-200" />
          </motion.button>
        ))}
      </motion.div>

      {/* Lightbox Modal */}
      <Modal
        isOpen={lightboxPhoto !== null}
        onClose={() => setLightboxPhoto(null)}
        className="!bg-obsidian/95 !max-w-2xl !rounded-xl !px-2 !pt-2 !pb-4"
      >
        {lightboxPhoto && (
          <div className="flex flex-col gap-3">
            {/* Close button */}
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

            {/* Full image */}
            <div className="rounded-lg overflow-hidden">
              <img
                src={lightboxPhoto.url}
                alt={lightboxPhoto.caption ?? ''}
                className="w-full max-h-[70vh] object-contain"
                draggable={false}
              />
            </div>

            {/* Caption */}
            {lightboxPhoto.caption && (
              <p className="text-sm text-ivory-muted text-center font-body px-2">
                {lightboxPhoto.caption}
              </p>
            )}
          </div>
        )}
      </Modal>
    </>
  )
}
