import { Card } from '@/components/ui/Card'
import { Avatar } from '@/components/ui/Avatar'
import { cn, formatDate } from '@/lib/utils'
import type { Person } from '@/types/app'

function scoreColor(score: number): string {
  if (score >= 9.0) return 'text-gold bg-gold/15 border-gold/30'
  if (score >= 8.0) return 'text-gold/80 bg-gold/10 border-gold/20'
  if (score >= 6.5) return 'text-ivory-dim bg-white/8 border-white/15'
  return 'text-ivory-dim/60 bg-white/5 border-white/10'
}

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
          {/* Name + score */}
          <div className="flex items-center gap-2">
            <p className="font-display text-base text-ivory leading-tight truncate">
              {person.name}
            </p>
            {person.score != null && (
              <span className={cn(
                'shrink-0 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-full border leading-none',
                scoreColor(person.score),
              )}>
                {person.score.toFixed(1)}
              </span>
            )}
          </div>

          {/* Instagram — display only, clickable in PersonDetail */}
          {person.instagram && (
            <p className="text-xs text-gold-muted leading-tight mt-0.5 truncate">
              @{person.instagram.replace(/^@/, '')}
            </p>
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
