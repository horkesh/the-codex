import { cn } from '@/lib/utils'

interface Props {
  days: { label: string; id: string }[]
  activeDay: string | null
  onDayClick: (id: string) => void
  extraItems?: { label: string; id: string }[]
}

export function DayStickyNav({ days, activeDay, onDayClick, extraItems = [] }: Props) {
  const allItems = [
    ...days.map((d, i) => ({ label: `Day ${i + 1}`, id: d.id })),
    ...extraItems,
  ]

  return (
    <div className="sticky top-0 z-20 bg-obsidian/90 backdrop-blur-sm border-b border-gold/10 px-4 py-2">
      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {allItems.map(item => (
          <button
            key={item.id}
            onClick={() => onDayClick(item.id)}
            className={cn(
              'shrink-0 px-3 py-1 rounded-full text-[10px] font-body font-semibold tracking-wider uppercase transition-colors',
              activeDay === item.id
                ? 'bg-gold/20 text-gold border border-gold/30'
                : 'text-ivory/40 border border-ivory/10 hover:text-ivory/60',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}
