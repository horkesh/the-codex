import { cn } from '@/lib/utils'
import { GoldRule } from './GoldRule'

type BrandMarkSize = 'sm' | 'md' | 'lg'

interface BrandMarkProps {
  size?: BrandMarkSize
  showRule?: boolean
  className?: string
}

const SIZE_CLASSES: Record<BrandMarkSize, { gents: string; chronicles: string }> = {
  sm: { gents: 'text-[8px]',  chronicles: 'text-[6px]'  },
  md: { gents: 'text-[10px]', chronicles: 'text-[8px]'  },
  lg: { gents: 'text-xs',     chronicles: 'text-[10px]' },
}

export function BrandMark({ size = 'md', showRule = false, className }: BrandMarkProps) {
  const { gents, chronicles } = SIZE_CLASSES[size]

  return (
    <div className={cn('flex flex-col items-center gap-0.5', className)}>
      {showRule && <GoldRule className="mb-1.5 w-full" />}
      <span
        className={cn(
          'font-body tracking-widest uppercase text-gold leading-none',
          gents,
        )}
      >
        THE GENTS
      </span>
      <span
        className={cn(
          'font-body tracking-widest uppercase text-ivory-dim leading-none',
          chronicles,
        )}
      >
        CHRONICLES
      </span>
    </div>
  )
}
