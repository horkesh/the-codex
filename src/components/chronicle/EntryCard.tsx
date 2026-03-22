import { useState } from 'react'
import { motion } from 'framer-motion'
import { MapPin, Pin, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { formatDate, getCoverCrop } from '@/lib/utils'
import { staggerItem } from '@/lib/animations'
import { ENTRY_TYPE_IMAGES } from '@/lib/entryTypes'
import { getFilter } from '@/lib/photoFilters'
import { getStoredFilter } from '@/hooks/useEntryFilter'
import { useAuthStore } from '@/store/auth'
import type { EntryWithParticipants } from '@/types/app'

interface EntryCardProps {
  entry: EntryWithParticipants
  onClick: () => void
  onTogglePin?: (pinned: boolean) => Promise<void>
}

export function EntryCard({ entry, onClick, onTogglePin }: EntryCardProps) {
  const [pinning, setPinning] = useState(false)
  const gent = useAuthStore((s) => s.gent)
  const filter = getFilter(getStoredFilter(entry.id))

  const isGathering = entry.type === 'gathering'
  const unseenCount = isGathering ? ((entry.metadata as Record<string, unknown>)?.rsvp_unseen_count as number) ?? 0 : 0
  const isCreator = gent?.id === entry.created_by

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
      style={{
        boxShadow: '0 2px 16px rgba(0,0,0,0.35)',
        ...(entry.pinned ? { borderLeftWidth: '3px', borderLeftColor: '#C9A84C' } : {}),
      }}
    >
      {/* Cover image / gradient header */}
      <div className="relative h-[215px] w-full overflow-hidden">
        {entry.cover_image_url ? (
          <img
            src={entry.cover_image_url}
            alt={entry.title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
            style={{
              filter: filter.css,
              objectPosition: `${getCoverCrop(entry).x}% ${getCoverCrop(entry).y}%`,
            }}
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

        {/* Photo filter vignette — only when user has a cover photo */}
        {entry.cover_image_url && (
          <div className="absolute inset-0 pointer-events-none" style={{ background: filter.vignette }} />
        )}

        {/* Atmospheric overlay — darkens towards edges for text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-dark/90 via-transparent to-black/20" />

        {/* Badge — top left */}
        <div className="absolute top-3 left-3">
          <Badge type={entry.type} size="sm" />
        </div>

        {/* Date + Lock + Pin — top right */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {entry.visibility === 'private' && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/30 backdrop-blur-sm">
              <Lock size={10} className="text-ivory-dim" aria-label="Private entry" />
            </span>
          )}
          <span className="text-[10px] text-ivory/60 font-body tracking-wide bg-black/30 backdrop-blur-sm px-2 py-0.5 rounded-full">
            {formatDate(entry.date)}
          </span>
          {onTogglePin && (
            <button
              type="button"
              aria-label={entry.pinned ? 'Unpin entry' : 'Pin entry'}
              className={`flex items-center justify-center w-7 h-7 rounded-full backdrop-blur-sm transition-all duration-150 ${
                entry.pinned
                  ? 'bg-gold/30 text-gold'
                  : 'bg-transparent text-ivory/0 group-hover:bg-black/30 group-hover:text-ivory/50 hover:!text-ivory/80'
              }`}
              onClick={(e) => {
                e.stopPropagation()
                if (pinning) return
                setPinning(true)
                onTogglePin(!entry.pinned).finally(() => setPinning(false))
              }}
            >
              <Pin size={14} strokeWidth={2} className={entry.pinned ? 'fill-gold' : ''} />
            </button>
          )}
        </div>

        {/* RSVP unseen badge — creator only */}
        {isGathering && isCreator && unseenCount > 0 && (
          <span className="absolute top-12 right-3 min-w-[20px] h-5 rounded-full bg-gold flex items-center justify-center text-[10px] font-body text-obsidian font-bold px-1.5">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
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
                {visibleParticipants.map((p) => (
                  <div key={p.id} className={p.retired ? 'opacity-50 saturate-[0.3]' : undefined}>
                    <Avatar
                      src={p.avatar_url}
                      name={p.display_name}
                      size="xs"
                    />
                  </div>
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
