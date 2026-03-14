import { cn } from '@/lib/utils'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import type { EntryType } from '@/types/app'

export interface ChronicleFilters {
  type?: EntryType
  gentId?: string
  year?: number
}

interface ChronicleFiltersProps {
  filters: ChronicleFilters
  onChange: (f: ChronicleFilters) => void
}

const ENTRY_TYPES: EntryType[] = [
  'mission',
  'night_out',
  'steak',
  'playstation',
  'toast',
  'gathering',
  'interlude',
]

const currentYear = new Date().getFullYear()
const YEARS = [currentYear, currentYear - 1]

export function ChronicleFilters({ filters, onChange }: ChronicleFiltersProps) {
  const setType = (type: EntryType | undefined) => {
    onChange({ ...filters, type })
  }

  const setYear = (year: number | undefined) => {
    onChange({ ...filters, year })
  }

  return (
    <div className="flex flex-col gap-2 py-2">
      {/* Type chips — horizontal scroll */}
      <div className="flex gap-2 overflow-x-auto scrollbar-none px-4 pb-0.5">
        {/* All chip */}
        <button
          type="button"
          onClick={() => setType(undefined)}
          className={cn(
            'inline-flex items-center shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all duration-150 border',
            !filters.type
              ? 'bg-gold text-obsidian border-gold shadow-gold'
              : 'bg-slate-light text-ivory-muted border-white/10 hover:text-ivory hover:border-white/20',
          )}
        >
          All
        </button>

        {ENTRY_TYPES.map((type) => {
          const meta = ENTRY_TYPE_META[type]
          const active = filters.type === type
          return (
            <button
              key={type}
              type="button"
              onClick={() => setType(active ? undefined : type)}
              className={cn(
                'inline-flex items-center gap-1.5 shrink-0 px-3 py-1.5 rounded-full text-xs font-body font-medium transition-all duration-150 border',
                active
                  ? 'bg-gold text-obsidian border-gold shadow-gold'
                  : 'bg-slate-light text-ivory-muted border-white/10 hover:text-ivory hover:border-white/20',
              )}
            >
              <meta.Icon size={14} aria-hidden="true" />
              {meta.label}
            </button>
          )
        })}
      </div>

      {/* Year chips */}
      <div className="flex gap-2 px-4">
        <button
          type="button"
          onClick={() => setYear(undefined)}
          className={cn(
            'inline-flex items-center shrink-0 px-3 py-1 rounded-full text-xs font-body font-medium transition-all duration-150 border',
            !filters.year
              ? 'bg-gold/20 text-gold border-gold/40'
              : 'bg-slate-light text-ivory-dim border-white/10 hover:text-ivory-muted hover:border-white/20',
          )}
        >
          All time
        </button>

        {YEARS.map((year) => {
          const active = filters.year === year
          return (
            <button
              key={year}
              type="button"
              onClick={() => setYear(active ? undefined : year)}
              className={cn(
                'inline-flex items-center shrink-0 px-3 py-1 rounded-full text-xs font-body font-medium transition-all duration-150 border',
                active
                  ? 'bg-gold/20 text-gold border-gold/40'
                  : 'bg-slate-light text-ivory-dim border-white/10 hover:text-ivory-muted hover:border-white/20',
              )}
            >
              {year}
            </button>
          )
        })}
      </div>
    </div>
  )
}
