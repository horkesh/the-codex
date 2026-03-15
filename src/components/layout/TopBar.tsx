import { Link, useNavigate } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@/components/ui'

interface TopBarProps {
  title?: string
  subtitle?: string
  right?: React.ReactNode
  back?: boolean
}

export function TopBar({ title, subtitle, right, back = false }: TopBarProps) {
  const navigate = useNavigate()
  const { gent } = useAuthStore()

  return (
    <header
      className="sticky top-0 z-40 safe-top backdrop-blur-xl border-b border-gold/10"
      style={{ background: 'rgba(20, 16, 25, 0.92)' }}
    >
      <div className="flex h-14 items-center px-4 gap-2">
        {/* Back button */}
        {back && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center justify-center text-ivory-muted hover:text-ivory transition-colors -ml-1 p-1 shrink-0"
            aria-label="Go back"
          >
            <ChevronLeft size={20} strokeWidth={2} />
          </button>
        )}

        {/* Brand — always on left, always links to /home */}
        <Link
          to="/home"
          className="flex items-center gap-1.5 shrink-0 select-none"
          aria-label="Home"
        >
          <img src="/logo.png" alt="" aria-hidden="true" className="w-5 h-5 rounded-full opacity-90" />
          <span className="font-display text-[15px] text-gold tracking-wide leading-none">
            The Codex
          </span>
        </Link>

        {/* Section / page title */}
        {title && (
          <>
            <span className="text-ivory-dim/30 text-sm shrink-0 leading-none">·</span>
            <span className="font-body text-[14px] text-ivory-muted truncate leading-none">
              {title}
            </span>
          </>
        )}

        {/* Subtitle as second line — kept for special cases */}
        {subtitle && (
          <span className="text-[10px] text-ivory-dim tracking-widest uppercase leading-none ml-1 shrink-0">
            {subtitle}
          </span>
        )}

        {/* Spacer */}
        <div className="flex-1 min-w-0" />

        {/* Right action slot */}
        {right ?? null}

        {/* Profile avatar — always visible */}
        {gent && (
          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="flex items-center justify-center shrink-0 ml-1"
            aria-label="Profile"
          >
            <Avatar src={gent.avatar_url} name={gent.display_name} size="sm" />
          </button>
        )}
      </div>
    </header>
  )
}
