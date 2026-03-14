import { motion } from 'framer-motion'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatDate, flagEmoji } from '@/lib/utils'
import { staggerItem } from '@/lib/animations'
import type { EntryWithParticipants, EntryType } from '@/types/app'

interface EntryCardProps {
  entry: EntryWithParticipants
  onClick: () => void
}

const gradientMap: Record<EntryType, string> = {
  mission:     'from-mission to-obsidian',
  night_out:   'from-night-out to-obsidian',
  steak:       'from-steak to-obsidian',
  playstation: 'from-playstation to-obsidian',
  toast:       'from-toast to-obsidian',
  gathering:   'from-gathering to-obsidian',
  interlude:   'from-interlude to-obsidian',
}

export function EntryCard({ entry, onClick }: EntryCardProps) {
  const gradient = gradientMap[entry.type]

  const locationLabel = (() => {
    if (entry.city) {
      const flag = entry.country_code ? flagEmoji(entry.country_code) + ' ' : ''
      return flag + entry.city
    }
    return entry.location ?? null
  })()

  const previewText = entry.lore ?? entry.description ?? null

  const visibleParticipants = entry.participants.slice(0, 3)
  const overflow = entry.participants.length - 3

  return (
    <motion.div variants={staggerItem} whileTap={{ scale: 0.98 }}>
      <Card variant="entry" entryType={entry.type} onClick={onClick} className="overflow-hidden">
        {/* Cover image / gradient header */}
        <div className="relative h-[180px] w-full overflow-hidden rounded-t-lg">
          {entry.cover_image_url ? (
            <img
              src={entry.cover_image_url}
              alt={entry.title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className={cn('w-full h-full bg-gradient-to-br', gradient)} />
          )}

          {/* Badge + date overlay */}
          <div className="absolute bottom-0 left-0 right-0 px-3 py-2 flex items-end justify-between bg-gradient-to-t from-black/60 to-transparent">
            <Badge type={entry.type} size="sm" />
            <span className="text-xs text-ivory-dim font-body">
              {formatDate(entry.date)}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="px-3 pt-2.5 pb-3 flex flex-col gap-1.5">
          {/* Title */}
          <h3
            className="font-display text-lg text-ivory leading-tight line-clamp-2"
          >
            {entry.title}
          </h3>

          {/* Location + participants row */}
          <div className="flex items-center justify-between gap-2">
            {locationLabel ? (
              <span className="text-xs text-ivory-dim font-body truncate flex-1">
                {locationLabel}
              </span>
            ) : (
              <span className="flex-1" />
            )}

            {/* Participant avatars */}
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
                  <span className="ml-1 text-[10px] text-ivory-dim font-body">
                    +{overflow}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Lore preview */}
          {previewText && (
            <p className="text-xs text-ivory-muted font-body italic truncate leading-snug">
              {previewText}
            </p>
          )}
        </div>
      </Card>
    </motion.div>
  )
}
