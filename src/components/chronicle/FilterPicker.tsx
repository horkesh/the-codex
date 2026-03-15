import { cn } from '@/lib/utils'
import { PHOTO_FILTERS } from '@/lib/photoFilters'
import type { FilterId } from '@/lib/photoFilters'

interface FilterPickerProps {
  filterId: FilterId
  onChange: (id: FilterId) => void
}

export function FilterPicker({ filterId, onChange }: FilterPickerProps) {
  return (
    <div className="flex items-center gap-1.5">
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
