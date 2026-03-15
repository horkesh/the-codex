import { Link, useLocation } from 'react-router'
import { cn } from '@/lib/utils'
import { NAV_SECTIONS } from '@/lib/navigation'

export function SectionNav() {
  const location = useLocation()

  return (
    <nav
      className="z-30 border-b border-white/6"
      style={{ background: 'rgba(20, 16, 25, 0.88)' }}
      aria-label="Section navigation"
    >
      <div className="flex items-stretch h-10">
        {NAV_SECTIONS.map(({ icon: Icon, navLabel, path }) => {
          const isActive = location.pathname === path || location.pathname.startsWith(path + '/')

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-[2px] transition-colors duration-200',
                isActive ? 'text-gold' : 'text-ivory-dim hover:text-ivory-muted',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && (
                <span className="absolute bottom-0 left-3 right-3 h-[2px] rounded-full bg-gold/80" />
              )}
              <Icon size={13} strokeWidth={isActive ? 2 : 1.5} aria-hidden="true" />
              <span className="text-[8px] font-body uppercase tracking-[0.12em] leading-none">
                {navLabel}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
