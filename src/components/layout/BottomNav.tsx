import { Link, useLocation } from 'react-router'
import { BookOpen, Bookmark, Users, BarChart2, Layers } from 'lucide-react'
import { motion } from 'framer-motion'
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
      className="fixed bottom-4 left-0 right-0 z-50 flex justify-center px-4 safe-bottom"
      aria-label="Primary navigation"
    >
      <div
        className="flex w-full max-w-[420px] h-[62px] items-stretch rounded-full border border-gold/15 backdrop-blur-2xl"
        style={{
          background: 'rgba(20, 16, 25, 0.88)',
          boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 0 0 0.5px rgba(201,168,76,0.08)',
        }}
      >
        {TABS.map(({ icon: Icon, label, path }) => {
          const isActive = location.pathname.startsWith(path)

          return (
            <Link
              key={path}
              to={path}
              className="relative flex flex-1 flex-col items-center justify-center gap-[3px] transition-colors duration-200"
              aria-current={isActive ? 'page' : undefined}
            >
              {/* Active pill highlight */}
              {isActive && (
                <motion.span
                  layoutId="nav-active-pill"
                  className="absolute inset-y-[6px] inset-x-[2px] rounded-full bg-gold/10 border border-gold/20"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  aria-hidden="true"
                />
              )}

              <Icon
                size={20}
                strokeWidth={isActive ? 2 : 1.5}
                className={cn(
                  'relative z-10 transition-colors duration-200',
                  isActive ? 'text-gold' : 'text-ivory-dim',
                )}
                aria-hidden="true"
              />

              <span
                className={cn(
                  'relative z-10 text-[8px] font-body uppercase tracking-[0.12em] leading-none transition-colors duration-200',
                  isActive ? 'text-gold' : 'text-ivory-dim/50',
                )}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
