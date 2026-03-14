import { cn } from '@/lib/utils'

interface GoldRuleProps {
  thick?: boolean
  className?: string
}

export function GoldRule({ thick = false, className }: GoldRuleProps) {
  return (
    <div
      className={cn(
        'w-full bg-gradient-to-r from-transparent via-gold/60 to-transparent',
        thick ? 'h-0.5' : 'h-px',
        className,
      )}
    />
  )
}
