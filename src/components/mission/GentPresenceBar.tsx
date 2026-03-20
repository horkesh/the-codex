import type { Gent } from '@/types/app'
import { cn } from '@/lib/utils'

interface Props {
  participants: Gent[]
  presentAliases: string[]
}

export function GentPresenceBar({ participants, presentAliases }: Props) {
  if (participants.length === 0) return null

  return (
    <div className="flex gap-1.5 items-center">
      {participants.map(gent => {
        const isPresent = presentAliases.some(
          a => a.toLowerCase().includes(gent.alias) ||
               a.toLowerCase().includes(gent.display_name.toLowerCase())
        )
        return (
          <img
            key={gent.id}
            src={gent.avatar_url ?? ''}
            alt={gent.display_name}
            className={cn(
              'w-5 h-5 rounded-full border transition-opacity',
              isPresent
                ? 'border-gold/40 opacity-100'
                : 'border-ivory/10 opacity-25 grayscale',
            )}
            title={`${gent.display_name}${isPresent ? ' (present)' : ' (not seen)'}`}
          />
        )
      })}
    </div>
  )
}
