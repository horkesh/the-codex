import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { fetchAllPhotos, type TimelinePhoto } from '@/data/photos'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { staggerContainer, staggerItem } from '@/lib/animations'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupByMonth(photos: TimelinePhoto[]): Array<{ label: string; photos: TimelinePhoto[] }> {
  const groups: Map<string, TimelinePhoto[]> = new Map()

  for (const photo of photos) {
    const d = new Date(photo.entry_date + 'T00:00:00')
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`

    if (!groups.has(key)) {
      groups.set(key, [])
    }
    groups.get(key)!.push(photo)
  }

  // Already sorted by date DESC from fetch, so insertion order is correct
  return Array.from(groups.entries()).map(([, photos]) => {
    const d = new Date(photos[0].entry_date + 'T00:00:00')
    const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return { label, photos }
  })
}

// ─── Photo cell ───────────────────────────────────────────────────────────────

interface PhotoCellProps {
  photo: TimelinePhoto
  onClick: () => void
}

function PhotoCell({ photo, onClick }: PhotoCellProps) {
  const meta = ENTRY_TYPE_META[photo.entry_type]
  const Icon = meta.Icon

  return (
    <motion.button
      type="button"
      variants={staggerItem}
      onClick={onClick}
      className="relative aspect-square overflow-hidden rounded-lg bg-slate-dark group"
    >
      <img
        src={photo.url}
        alt={photo.entry_title}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Entry type icon overlay */}
      <div className="absolute bottom-1.5 left-1.5 flex items-center justify-center w-6 h-6 rounded-md bg-obsidian/70 backdrop-blur-sm">
        <Icon size={13} className="text-ivory/80" />
      </div>
    </motion.button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PhotoTimeline() {
  const navigate = useNavigate()
  const [photos, setPhotos] = useState<TimelinePhoto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAllPhotos()
      .then(setPhotos)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const groups = useMemo(() => groupByMonth(photos), [photos])

  return (
    <>
      <TopBar title="Photos" back />

      <PageWrapper scrollable>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : photos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 gap-3 text-center">
            <p className="font-body text-ivory-dim text-sm leading-relaxed">
              No photos in the Chronicle yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <section key={group.label}>
                {/* Month header */}
                <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
                  {group.label}
                </p>

                {/* 3-column grid */}
                <motion.div
                  variants={staggerContainer}
                  initial="initial"
                  animate="animate"
                  className="grid grid-cols-3 gap-1.5"
                >
                  {group.photos.map((photo) => (
                    <PhotoCell
                      key={photo.id}
                      photo={photo}
                      onClick={() => navigate(`/chronicle/${photo.entry_id}`)}
                    />
                  ))}
                </motion.div>
              </section>
            ))}
          </div>
        )}
      </PageWrapper>
    </>
  )
}
