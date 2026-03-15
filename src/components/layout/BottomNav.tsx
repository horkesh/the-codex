import { Link, useLocation, useNavigate } from 'react-router'
import { BookOpen, Bookmark, Users, BarChart2, Layers, Plus } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const navigate = useNavigate()
  const showFab = location.pathname !== '/chronicle/new'

  return (
    <nav
      className="fixed bottom-4 left-0 right-0 z-50 flex flex-col items-center px-4 safe-bottom"
      aria-label="Primary navigation"
    >
      {/* Quick-log FAB — floating above nav */}
      <AnimatePresence>
        {showFab && (
          <motion.button
            key="fab"
            type="button"
            onClick={() => navigate('/chronicle/new')}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="mb-3 w-12 h-12 rounded-full bg-gold text-obsidian flex items-center justify-center shadow-[0_4px_24px_rgba(201,168,76,0.4)] hover:bg-gold/90 active:scale-95 transition-colors"
            aria-label="Log new entry"
          >
            <Plus size={22} strokeWidth={2.5} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Tab bar pill */}
      <div className="flex w-full max-w-[420px]">
        <div
          className="flex w-full h-[62px] items-stretch rounded-full border border-gold/15 backdrop-blur-2xl"
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
      </div>
    </nav>
  )
}
