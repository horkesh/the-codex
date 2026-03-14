import { cn } from '@/lib/utils'
import type { EntryType } from '@/types/app'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'

type BadgeSize = 'sm' | 'default'

interface BadgeProps {
  type?: EntryType
  label?: string
  size?: BadgeSize
  className?: string
  color?: string
}

export function Badge({ type, label, size = 'default', className, color }: BadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[10px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5'

  const base = cn(
    'inline-flex items-center font-body font-medium tracking-wide rounded-full border border-gold/30 text-ivory',
    sizeClasses,
  )

  if (type) {
    const { bg, icon, label: typeLabel } = ENTRY_TYPE_META[type]
    return (
      <span className={cn(base, bg, className)}>
        <span role="img" aria-hidden="true" className="leading-none">{icon}</span>
        {typeLabel}
      </span>
    )
  }

  return (
    <span
      className={cn(base, !color && 'bg-slate-light', className)}
      style={color ? { backgroundColor: color } : undefined}
    >
      {label}
    </span>
  )
}
