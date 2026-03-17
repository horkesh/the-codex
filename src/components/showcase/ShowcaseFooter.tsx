import { Link } from 'react-router'
import { useAuthStore } from '@/store/auth'

export function ShowcaseFooter() {
  const gent = useAuthStore(s => s.gent)

  return (
    <footer className="bg-obsidian border-t border-white/[0.04] px-6 py-10">
      <div className="flex flex-col items-center gap-4 max-w-lg mx-auto">
        <p className="text-ivory-dim/40 text-xs italic font-display text-center">
          "Private chronicle. Public highlights."
        </p>
        <Link
          to={gent ? '/home' : '/login'}
          className="text-[10px] font-body tracking-[0.25em] uppercase text-gold/40 hover:text-gold/70 transition-colors"
        >
          The Gents Lounge
        </Link>
        <p className="text-ivory-dim/20 text-[10px] font-body">
          {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  )
}
