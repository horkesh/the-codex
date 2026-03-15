import { motion } from 'framer-motion'
import { formatDate, flagEmoji } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { ENTRY_TYPE_IMAGES } from '@/lib/entryTypes'
import { fadeIn } from '@/lib/animations'
import { getFilter } from '@/lib/photoFilters'
import type { FilterId } from '@/lib/photoFilters'
import type { EntryWithParticipants } from '@/types/app'

interface EntryHeroProps {
  entry: EntryWithParticipants
  filterId?: FilterId
}

export function EntryHero({ entry, filterId }: EntryHeroProps) {
  const filter = getFilter(filterId)

  const hasLocation = entry.city || entry.country
  const locationParts: string[] = []
  if (entry.city) locationParts.push(entry.city)
  if (entry.country) locationParts.push(entry.country)
  const locationStr = locationParts.join(', ')

  return (
    <div className="relative w-full h-72 overflow-hidden">
      {/* Background: cover image or animated gradient */}
      {entry.cover_image_url ? (
        <motion.img
          src={entry.cover_image_url}
          alt={entry.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: filter.css }}
          variants={fadeIn}
          initial="initial"
          animate="animate"
        />
      ) : (
        <motion.img
          src={ENTRY_TYPE_IMAGES[entry.type]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden
          variants={fadeIn}
          initial="initial"
          animate="animate"
        />
      )}

      {/* Photo filter vignette — only when user has a cover photo */}
      {entry.cover_image_url && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: filter.vignette }} />
      )}

      {/* Gradient overlay: bottom heavy so text is readable */}
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent" />

      {/* Badge + date row — top of image area */}
      <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
        <Badge type={entry.type} size="sm" />
        <span className="text-xs text-ivory-muted font-body bg-obsidian/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
          {formatDate(entry.date)}
        </span>
      </div>

      {/* Title + location + participants — bottom of image area */}
      <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8">
        <h1 className="font-display text-2xl text-ivory font-bold leading-tight line-clamp-2 mb-2">
          {entry.title}
        </h1>

        <div className="flex items-center justify-between gap-2">
          {/* Location */}
          <div className="flex items-center gap-1 min-w-0">
            {hasLocation && (
              <>
                {entry.country_code && (
                  <span className="text-base leading-none" aria-hidden="true">
                    {flagEmoji(entry.country_code)}
                  </span>
                )}
                <span className="text-sm text-ivory-muted truncate">
                  {locationStr}
                </span>
              </>
            )}
          </div>

          {/* Participant avatars */}
          {entry.participants.length > 0 && (
            <div className="flex items-center shrink-0">
              {entry.participants.map((gent, idx) => (
                <div
                  key={gent.id}
                  className="relative"
                  style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: entry.participants.length - idx }}
                >
                  <Avatar
                    src={gent.avatar_url}
                    name={gent.display_name}
                    size="sm"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
