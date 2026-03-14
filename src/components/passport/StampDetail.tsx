import { useNavigate } from 'react-router'
import { MapPin, Trophy, Globe } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { cn, flagEmoji, formatDate } from '@/lib/utils'
import type { PassportStamp } from '@/types/app'

interface StampDetailProps {
  stamp: PassportStamp | null
  onClose: () => void
}

const TYPE_LABEL: Record<PassportStamp['type'], string> = {
  mission: 'Mission Stamp',
  achievement: 'Achievement',
  diplomatic: 'Diplomatic',
}

const TYPE_BADGE_CLASS: Record<PassportStamp['type'], string> = {
  mission: 'bg-slate-light border-gold/30 text-gold',
  achievement: 'bg-gold/10 border-gold/40 text-gold-light',
  diplomatic: 'bg-slate-mid border-gold/30 text-ivory-muted',
}

function StampCircle({ stamp }: { stamp: PassportStamp }) {
  if (stamp.image_url) {
    return (
      <div
        className={cn(
          'w-48 h-48 rounded-full overflow-hidden mx-auto',
          'ring-4 ring-gold/30',
          'shadow-[0_0_40px_rgba(201,168,76,0.35),0_0_80px_rgba(201,168,76,0.12)]',
        )}
      >
        <img
          src={stamp.image_url}
          alt={stamp.name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    )
  }

  if (stamp.type === 'mission') {
    return (
      <div
        className={cn(
          'w-48 h-48 rounded-full mx-auto bg-slate-light',
          'ring-4 ring-gold/30',
          'shadow-[0_0_40px_rgba(201,168,76,0.25)]',
          'flex items-center justify-center',
        )}
      >
        {stamp.country_code ? (
          <span className="text-6xl leading-none" role="img" aria-label={stamp.country ?? 'location'}>
            {flagEmoji(stamp.country_code)}
          </span>
        ) : (
          <MapPin size={32} aria-hidden="true" className="text-ivory-muted" />
        )}
      </div>
    )
  }

  if (stamp.type === 'achievement') {
    return (
      <div
        className={cn(
          'w-48 h-48 rounded-full mx-auto bg-gold/10 border-2 border-gold/40',
          'shadow-[0_0_40px_rgba(201,168,76,0.25)]',
          'flex items-center justify-center',
        )}
      >
        <Trophy size={32} aria-hidden="true" className="text-gold" />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'w-48 h-48 rounded-full mx-auto bg-slate-mid border-2 border-gold/30',
        'shadow-[0_0_40px_rgba(201,168,76,0.15)]',
        'flex items-center justify-center',
      )}
    >
      <Globe size={32} aria-hidden="true" className="text-ivory-muted" />
    </div>
  )
}

export function StampDetail({ stamp, onClose }: StampDetailProps) {
  const navigate = useNavigate()

  return (
    <Modal isOpen={stamp !== null} onClose={onClose}>
      {stamp && (
        <div className="flex flex-col items-center gap-4 py-2">
          {/* Large stamp image */}
          <StampCircle stamp={stamp} />

          {/* Stamp name */}
          <h2 className="font-display text-xl text-ivory text-center leading-snug mt-1">
            {stamp.name}
          </h2>

          {/* Location */}
          {(stamp.city || stamp.country) && (
            <p className="text-ivory-muted text-sm text-center leading-snug">
              {[stamp.city, stamp.country].filter(Boolean).join(', ')}
              {stamp.country_code && (
                <span className="ml-1.5" role="img" aria-label={stamp.country ?? ''}>
                  {flagEmoji(stamp.country_code)}
                </span>
              )}
            </p>
          )}

          {/* Date */}
          <p className="text-ivory-dim text-sm">
            {formatDate(stamp.date_earned)}
          </p>

          {/* Type badge */}
          <span
            className={cn(
              'inline-flex items-center px-3 py-1 rounded-full text-xs font-body font-medium tracking-wide border',
              TYPE_BADGE_CLASS[stamp.type],
            )}
          >
            {TYPE_LABEL[stamp.type]}
          </span>

          {/* Description */}
          {stamp.description && (
            <p className="text-ivory-muted text-sm italic text-center leading-relaxed max-w-xs px-2">
              "{stamp.description}"
            </p>
          )}

          {/* View Mission Entry */}
          {stamp.entry_id && (
            <Button
              variant="outline"
              size="md"
              className="mt-2 w-full"
              onClick={() => {
                onClose()
                navigate(`/chronicle/${stamp.entry_id}`)
              }}
            >
              View Mission Entry
            </Button>
          )}
        </div>
      )}
    </Modal>
  )
}
