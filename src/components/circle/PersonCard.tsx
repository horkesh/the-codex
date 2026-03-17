import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatDate } from '@/lib/utils'
import type { Person } from '@/types/app'

interface PersonCardProps {
  person: Person
  onClick: () => void
}

export function PersonCard({ person, onClick }: PersonCardProps) {
  const locationLine = person.met_location
    ? person.met_location
    : person.met_date
    ? formatDate(person.met_date)
    : null

  const visibleLabels = person.labels.slice(0, 3)
  const extraCount = person.labels.length - visibleLabels.length

  return (
    <Card variant="default" onClick={onClick} className="p-3">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar
          src={person.portrait_url ?? person.photo_url}
          name={person.name}
          size="md"
          className="shrink-0 mt-0.5"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          {/* Name */}
          <p className="font-display text-base text-ivory leading-tight truncate">
            {person.name}
          </p>

          {/* Instagram */}
          {person.instagram && (
            <a
              href={`https://instagram.com/${person.instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-gold-muted hover:text-gold leading-tight mt-0.5 truncate block transition-colors"
            >
              @{person.instagram.replace(/^@/, '')}
            </a>
          )}

          {/* Where met */}
          {locationLine && (
            <p className="text-xs text-ivory-dim leading-tight mt-0.5 truncate">
              {locationLine}
            </p>
          )}

          {/* Labels */}
          {person.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {visibleLabels.map((label) => (
                <span
                  key={label}
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5',
                    'bg-slate-light text-ivory-dim text-[10px] font-body leading-none',
                  )}
                >
                  {label}
                </span>
              ))}
              {extraCount > 0 && (
                <span
                  className={cn(
                    'inline-flex items-center rounded-full px-2 py-0.5',
                    'bg-slate-light text-ivory-dim text-[10px] font-body leading-none',
                  )}
                >
                  +{extraCount}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
