import { cn } from '@/lib/utils'

const MOODS = [
  { id: 'jazz', label: 'Jazz' },
  { id: 'electronic', label: 'Electronic' },
  { id: 'acoustic', label: 'Acoustic' },
  { id: 'rock', label: 'Rock' },
  { id: 'ambient', label: 'Ambient' },
  { id: 'hiphop', label: 'Hip-Hop' },
  { id: 'classical', label: 'Classical' },
] as const

interface Props {
  value: string | undefined
  onChange: (mood: string) => void
}

export function SoundtrackPicker({ value, onChange }: Props) {
  return (
    <div>
      <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-2 block">
        Soundtrack Mood (shapes narrative voice)
      </label>
      <div className="flex flex-wrap gap-2">
        {MOODS.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(value === m.id ? '' : m.id)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-body font-semibold border transition-colors',
              value === m.id
                ? 'bg-gold/15 text-gold border-gold/30'
                : 'text-ivory/40 border-ivory/10 hover:text-ivory/60',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
