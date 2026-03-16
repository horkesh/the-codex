import { cn } from '@/lib/utils'
import { PHOTO_FILTERS } from '@/lib/photoFilters'
import type { FilterId } from '@/lib/photoFilters'

interface FilterPickerProps {
  filterId: FilterId
  onChange: (id: FilterId) => void
  /** When provided, renders circular thumbnail previews with filter applied */
  previewUrl?: string
}

export function FilterPicker({ filterId, onChange, previewUrl }: FilterPickerProps) {
  if (!previewUrl) {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {PHOTO_FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={cn(
              'text-[10px] font-body px-2 py-0.5 rounded-full border transition-all duration-150',
              filterId === f.id
                ? 'border-gold text-gold bg-gold/10'
                : 'border-white/15 text-ivory-dim hover:border-white/25 hover:text-ivory-muted',
            )}
          >
            {f.name}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
      {PHOTO_FILTERS.map((f) => (
        <button
          key={f.id}
          type="button"
          onClick={() => onChange(f.id)}
          className="flex flex-col items-center gap-1 shrink-0"
        >
          <div
            className={cn(
              'w-9 h-9 rounded-full overflow-hidden border-2 transition-all duration-150',
              filterId === f.id
                ? 'border-gold ring-1 ring-gold/40'
                : 'border-transparent hover:border-white/25',
            )}
          >
            <div className="relative w-full h-full">
              <img
                src={previewUrl}
                alt={f.name}
                className="w-full h-full object-cover"
                style={{ filter: f.css }}
                loading="lazy"
              />
              <div
                className="absolute inset-0"
                style={{ background: f.vignette }}
              />
            </div>
          </div>
          <span
            className={cn(
              'text-[9px] font-body leading-tight transition-colors duration-150',
              filterId === f.id ? 'text-gold' : 'text-ivory-dim',
            )}
          >
            {f.name}
          </span>
        </button>
      ))}
    </div>
  )
}
