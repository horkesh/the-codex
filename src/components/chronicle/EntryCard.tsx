import { motion } from 'framer-motion'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'
import { staggerItem } from '@/lib/animations'
import { ENTRY_TYPE_IMAGES } from '@/lib/entryTypes'
import type { EntryWithParticipants } from '@/types/app'

interface EntryCardProps {
  entry: EntryWithParticipants
  onClick: () => void
}

export function EntryCard({ entry, onClick }: EntryCardProps) {

  const locationLabel = (() => {
    if (entry.city) {
      const code = entry.country_code ? `${entry.country_code} · ` : ''
      return code + entry.city
    }
    return entry.location ?? null
  })()

  const previewText = entry.lore ?? entry.description ?? null

  const visibleParticipants = entry.participants.slice(0, 3)
  const overflow = entry.participants.length - 3

  return (
    <motion.div
      variants={staggerItem}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className="cursor-pointer group rounded-xl border border-white/6 overflow-hidden bg-slate-dark transition-all duration-200 hover:border-gold/20"
      style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.35)' }}
    >
      {/* Cover image / gradient header */}
      <div className="relative h-[215px] w-full overflow-hidden">
        {entry.cover_image_url ? (
          <img
            src={entry.cover_image_url}
            alt={entry.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            draggable={false}
          />
        ) : (
          <img
            src={ENTRY_TYPE_IMAGES[entry.type]}
            alt=""
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            aria-hidden
          />
        )}

        {/* Atmospheric overlay — darkens towards edges for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-dark/90 via-transparent to-black/20" />

        {/* Badge — top left */}
        <div className="absolute top-3 left-3">
          <Badge type={entry.type} size="sm" />
        </div>

        {/* Date — top right */}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] text-ivory/60 font-body tracking-wide bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {formatDate(entry.date)}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 pt-3 pb-4 flex flex-col gap-2">
        {/* Title */}
        <h3 className="font-display text-xl text-ivory leading-tight line-clamp-2 tracking-wide">
          {entry.title}
        </h3>

        {/* Location + participants */}
        <div className="flex items-center justify-between gap-2">
          {locationLabel ? (
            <span className="flex items-center gap-1 text-xs text-ivory-dim font-body truncate flex-1">
              <MapPin size={10} className="text-gold/50 shrink-0" aria-hidden="true" />
              {locationLabel}
            </span>
          ) : (
            <span className="flex-1" />
          )}

          {entry.participants.length > 0 && (
            <div className="flex items-center shrink-0">
              <div className="flex -space-x-1.5">
                {visibleParticipants.map((gent) => (
                  <Avatar
                    key={gent.id}
                    src={gent.avatar_url}
                    name={gent.display_name}
                    size="xs"
                  />
                ))}
              </div>
              {overflow > 0 && (
                <span className="ml-1 text-[10px] text-ivory-dim font-body">+{overflow}</span>
              )}
            </div>
          )}
        </div>

        {/* Lore preview */}
        {previewText && (
          <p className="text-xs text-ivory-muted/70 font-display italic line-clamp-1 leading-snug">
            {previewText}
          </p>
        )}
      </div>
    </motion.div>
  )
}
