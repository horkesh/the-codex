import { useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TopBarProps {
  title: string
  subtitle?: string
  right?: React.ReactNode
  back?: boolean
  transparent?: boolean
  /** Show the brand logo mark beside the title — use on main hub pages */
  logo?: boolean
}

export function TopBar({
  title,
  subtitle,
  right,
  back = false,
  transparent = false,
  logo = false,
}: TopBarProps) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 safe-top',
        !transparent && 'backdrop-blur-xl border-b border-white/[0.04]',
      )}
      style={!transparent ? { background: 'rgba(20, 16, 25, 0.92)' } : undefined}
    >
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

        {/* Center — logo mark + title + optional subtitle */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0">
          <div className="flex items-center gap-2">
            {logo && (
              <img
                src="/logo.png"
                alt=""
                aria-hidden="true"
                className="w-6 h-6 rounded-full opacity-90"
              />
            )}
            <h1 className="font-display text-[17px] text-ivory leading-tight tracking-wide truncate">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-[10px] text-ivory-dim leading-tight mt-px tracking-widest uppercase truncate">
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
