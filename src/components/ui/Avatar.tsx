import { cn } from '@/lib/utils'

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

interface AvatarProps {
  src?: string | null
  name: string
  size?: AvatarSize
  active?: boolean
  className?: string
}

const sizeMap: Record<AvatarSize, { px: number; text: string; ring: string }> = {
  xs: { px: 24, text: 'text-[10px]', ring: 'ring-1' },
  sm: { px: 32, text: 'text-xs', ring: 'ring-1' },
  md: { px: 40, text: 'text-sm', ring: 'ring-1' },
  lg: { px: 56, text: 'text-base', ring: 'ring-2' },
  xl: { px: 80, text: 'text-xl', ring: 'ring-2' },
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function Avatar({ src, name, size = 'md', active = false, className }: AvatarProps) {
  const { px, text, ring } = sizeMap[size]
  const ringClass = active
    ? `${ring} ring-gold`
    : `${ring} ring-gold/40`

  const base = cn(
    'relative inline-flex items-center justify-center shrink-0 rounded-full overflow-hidden',
    ringClass,
    className,
  )

  const style = { width: px, height: px }

  if (src) {
    return (
      <div className={base} style={style}>
        <img
          src={src}
          alt={name}
          className="w-full h-full object-cover"
          draggable={false}
        />
      </div>
    )
  }

  return (
    <div className={cn(base, 'bg-slate-light')} style={style}>
      <span className={cn('font-display font-semibold text-gold leading-none select-none', text)}>
        {getInitials(name)}
      </span>
    </div>
  )
}
