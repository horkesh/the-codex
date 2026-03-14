import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { formatDate, flagEmoji } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { fadeIn } from '@/lib/animations'
import type { EntryWithParticipants } from '@/types/app'

interface EntryHeroProps {
  entry: EntryWithParticipants
}

// Maps entry type to a CSS gradient for when there's no cover image
const TYPE_GRADIENT: Record<string, string> = {
  mission:     'from-[#3d2b6b] via-[#1e1228] to-[#0a0a0f]',
  night_out:   'from-[#0f2038] via-[#091420] to-[#0a0a0f]',
  steak:       'from-[#3d1a0a] via-[#1e0d05] to-[#0a0a0f]',
  playstation: 'from-[#0a2420] via-[#051210] to-[#0a0a0f]',
  toast:       'from-[#3d2010] via-[#1e1008] to-[#0a0a0f]',
  gathering:   'from-[#1a2a1a] via-[#0d150d] to-[#0a0a0f]',
  interlude:   'from-[#1a1a2e] via-[#0e0e1a] to-[#0a0a0f]',
}

export function EntryHero({ entry }: EntryHeroProps) {
  const gradient = TYPE_GRADIENT[entry.type] ?? 'from-slate-light via-slate-mid to-obsidian'
  const meta = ENTRY_TYPE_META[entry.type]

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
          variants={fadeIn}
          initial="initial"
          animate="animate"
        />
      ) : (
        <motion.div
          className={cn('absolute inset-0 bg-gradient-to-b', gradient)}
          variants={fadeIn}
          initial="initial"
          animate="animate"
        >
          {/* Subtle animated pulse overlay for visual interest */}
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute inset-0 animate-pulse"
              style={{
                background: `radial-gradient(ellipse at 30% 50%, ${meta.borderColor}80 0%, transparent 70%)`,
              }}
            />
          </div>
          {/* Large type icon centered as decoration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <meta.Icon
              size={96}
              className="opacity-10 select-none"
              aria-hidden="true"
            />
          </div>
        </motion.div>
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
