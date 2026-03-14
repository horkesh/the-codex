import { useState, useRef, useEffect } from 'react'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CircleFiltersProps {
  filters: { search?: string; label?: string }
  onChange: (f: { search?: string; label?: string }) => void
  availableLabels: string[]
}

export function CircleFilters({ filters, onChange, availableLabels }: CircleFiltersProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchInput(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      onChange({ ...filters, search: value || undefined })
    }, 300)
  }

  const handleLabelClick = (label: string | undefined) => {
    onChange({ ...filters, label })
  }

  const activeLabel = filters.label

  return (
    <div className="flex flex-col gap-2 mb-4">
      {/* Search input */}
      <div className="relative">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-dim pointer-events-none"
        />
        <input
          type="text"
          value={searchInput}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search by name or Instagram..."
          className={cn(
            'w-full h-10 bg-slate-mid border border-white/10 rounded-[--radius-md]',
            'pl-9 pr-3 text-sm font-body text-ivory placeholder:text-ivory-dim',
            'focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20',
            'transition-colors duration-200',
          )}
        />
      </div>

      {/* Label chips */}
      {availableLabels.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {/* "All" chip */}
          <button
            type="button"
            onClick={() => handleLabelClick(undefined)}
            className={cn(
              'shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-body transition-colors duration-150',
              !activeLabel
                ? 'bg-gold text-obsidian font-medium'
                : 'bg-slate-light text-ivory-dim hover:text-ivory',
            )}
          >
            All
          </button>

          {availableLabels.map((label) => (
            <button
              key={label}
              type="button"
              onClick={() => handleLabelClick(label)}
              className={cn(
                'shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-body transition-colors duration-150',
                activeLabel === label
                  ? 'bg-gold text-obsidian font-medium'
                  : 'bg-slate-light text-ivory-dim hover:text-ivory',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
