import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  back?: boolean
  transparent?: boolean
}

export function TopBar({
  title,
  subtitle,
  right,
  back = false,
  transparent = false,
}: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 safe-top',
        !transparent && 'bg-slate-dark/95 backdrop-blur-md border-b border-white/5',
      )}
    >
      {/* 56px content row */}
      <div className="flex h-14 items-center px-4 gap-3">
        {/* Left — back button or spacer */}
        <div className="w-8 shrink-0 flex items-center justify-start">
          {back && (
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex items-center justify-center text-ivory-muted hover:text-ivory transition-colors duration-150 -ml-1 p-1"
              aria-label="Go back"
            >
              <ChevronLeft size={20} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* Center — title + optional subtitle */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <h1 className="font-display text-lg text-ivory leading-tight truncate max-w-full">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-ivory-dim leading-tight mt-px truncate max-w-full">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right — action slot or spacer */}
        <div className="w-8 shrink-0 flex items-center justify-end">
          {right ?? null}
        </div>
      </div>
    </header>
  )
}
