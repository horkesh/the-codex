import { Link, useLocation } from 'react-router'
import { BookOpen, Bookmark, Users, BarChart2, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Tab {
  icon: React.ElementType
  label: string
  path: string
}

const TABS: Tab[] = [
  { icon: BookOpen,  label: 'Chronicle', path: '/chronicle' },
  { icon: Bookmark,  label: 'Passport',  path: '/passport'  },
  { icon: Users,     label: 'Circle',    path: '/circle'    },
  { icon: BarChart2, label: 'Ledger',    path: '/ledger'    },
  { icon: Layers,    label: 'Studio',    path: '/studio'    },
]

export function BottomNav() {
  const location = useLocation()

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-slate-dark/95 backdrop-blur-md border-t border-white/5 safe-bottom"
      aria-label="Primary navigation"
    >
      <div className="flex h-full items-stretch">
        {TABS.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname.startsWith(path)

          return (
            <Link
              key={path}
              to={path}
              className={cn(
                'relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-colors duration-150',
                isActive
                  ? 'text-gold'
                  : 'text-ivory-dim hover:text-ivory-muted',
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Gold active bar — runs along top edge of the nav */}
              {isActive && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-gold"
                  aria-hidden="true"
                />
              )}

              <Icon
                size={22}
                strokeWidth={isActive ? 2 : 1.75}
                aria-hidden="true"
              />

              <span className="text-[10px] font-medium tracking-wider uppercase leading-none">
                {label}
              </span>

              {/* Tiny gold dot below label for active tab */}
              {isActive && (
                <span
                  className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-gold"
                  aria-hidden="true"
                />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
