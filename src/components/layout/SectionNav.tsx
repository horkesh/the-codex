import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { NAV_SECTIONS } from '@/lib/navigation'
import { useAuthStore } from '@/store/auth'
import { isComfortMode } from '@/hooks/useComfortMode'

export function SectionNav() {
  const location = useLocation()
  const gent = useAuthStore((s) => s.gent)
  const comfort = gent ? isComfortMode(gent.id) : false

  return (
    <nav
      className="z-30 border-b border-white/6"
      style={{ background: 'rgba(20, 16, 25, 0.88)' }}
      aria-label="Section navigation"
    >
      <div className={cn('flex items-stretch', comfort ? 'flex-wrap h-auto' : 'h-10')}>
        {NAV_SECTIONS.map(({ icon: Icon, navLabel, path }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/')

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'relative flex flex-col items-center justify-center transition-colors duration-200',
                comfort ? 'flex-[0_0_33.33%] py-2.5 gap-1' : 'flex-1 gap-[2px]',
                isActive ? 'text-gold' : 'text-ivory-dim hover:text-ivory-muted',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gold/80" />
              )}
              <Icon size={comfort ? 20 : 13} strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
              <span className={cn(
                'font-body uppercase leading-none',
                comfort ? 'text-[11px] tracking-[0.1em]' : 'text-[8px] tracking-[0.12em]',
              )}>
                {navLabel}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
