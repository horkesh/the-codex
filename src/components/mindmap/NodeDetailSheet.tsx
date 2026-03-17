import { useNavigate } from 'react-router'
import { Modal, Avatar, Button } from '@/components/ui'
import type { Person, PersonTier } from '@/types/app'

interface NodeDetailSheetProps {
  person: Person | null
  isOpen: boolean
  onClose: () => void
  onTierChange: (personId: string, tier: PersonTier) => void
}

const TIERS: Array<{ value: PersonTier; label: string }> = [
  { value: 'inner_circle', label: 'Inner Circle' },
  { value: 'outer_circle', label: 'Outer Circle' },
  { value: 'acquaintance', label: 'Acquaintance' },
]

export function NodeDetailSheet({ person, isOpen, onClose, onTierChange }: NodeDetailSheetProps) {
  const navigate = useNavigate()

  if (!person) return null

  const isPOI = person.category === 'person_of_interest'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={person.name}>
      <div className="space-y-4 pb-2">
        {/* Person info */}
        <div className="flex items-center gap-3">
          <Avatar
            src={person.portrait_url ?? person.photo_url}
            name={person.name}
            size="lg"
          />
          <div className="flex-1 min-w-0">
            <p className="font-display text-lg text-ivory truncate">{person.name}</p>
            {person.instagram && (
              <a
                href={`https://instagram.com/${person.instagram.replace(/^@/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-gold-muted hover:text-gold font-body truncate block transition-colors"
              >
                @{person.instagram.replace(/^@/, '')}
              </a>
            )}
            {person.met_location && (
              <p className="text-xs text-ivory-dim font-body mt-0.5 truncate">
                Met at {person.met_location}
              </p>
            )}
          </div>
        </div>

        {/* Tier selector (contacts only) */}
        {!isPOI && (
          <div className="space-y-2">
            <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
              Tier
            </p>
            <div className="flex gap-2">
              {TIERS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onTierChange(person.id, t.value)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-body transition-colors ${
                    person.tier === t.value
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'bg-slate-light/30 text-ivory-dim border border-white/5 hover:border-white/15'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes preview */}
        {person.notes && (
          <p className="text-xs text-ivory-dim font-body italic line-clamp-3">
            {person.notes}
          </p>
        )}

        {/* View Profile button */}
        <Button
          variant="outline"
          size="md"
          fullWidth
          onClick={() => {
            onClose()
            navigate(`/circle/${person.id}`)
          }}
        >
          View Profile
        </Button>
      </div>
    </Modal>
  )
}
