import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Wine, Camera, Lock } from 'lucide-react'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { useAuthStore } from '@/store/auth'
import { NAV_SECTIONS } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { launchToastSession } from '@/ai/toast'
import { isComfortMode } from '@/hooks/useComfortMode'
import { OnThisDayCard } from '@/components/home/OnThisDayCard'

const MotionLink = motion(Link)

type Section = typeof NAV_SECTIONS[number]

// ── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ section, featured = false }: { section: Section; featured?: boolean }) {
  return (
    <MotionLink
      to={section.path}
      whileTap={{ scale: 0.965 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className={cn(
        'relative block overflow-hidden rounded-2xl border border-white/8 bg-slate-mid',
        featured ? 'h-52' : 'h-40',
      )}
    >
      {/* Image — zooms on hover independently within clipped frame */}
      <motion.div
        className="absolute inset-0"
        whileHover={{ scale: 1.08 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <img
          src={section.image}
          alt=""
          aria-hidden="true"
          className="w-full h-full object-cover"
          style={{ opacity: featured ? 0.75 : 0.7 }}
          loading="eager"
          fetchPriority={featured ? 'high' : 'low'}
        />
      </motion.div>

      {/* Gradient overlay — only covers bottom third for label readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/30 to-transparent" />

      {/* Top-left label shimmer line — featured only */}
      {featured && (
        <div className="absolute top-4 left-5">
          <span className="text-[9px] tracking-[0.3em] uppercase font-body text-gold/60">
            Featured
          </span>
        </div>
      )}

      {/* Content — bottom */}
      <div className={cn('absolute bottom-0 left-0 right-0', featured ? 'p-5' : 'p-3.5')}>
        <p className={cn(
          'font-display text-ivory leading-tight',
          featured ? 'text-[20px]' : 'text-[15px]',
        )}>
          {section.label}
        </p>
        <p className={cn(
          'font-body text-ivory-dim/80 leading-snug mt-0.5',
          featured ? 'text-[11px]' : 'text-[10px]',
        )}>
          {section.subtitle}
        </p>
      </div>

      {/* Gold border — appears on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        initial={{ opacity: 0 }}
        whileHover={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        style={{ boxShadow: 'inset 0 0 0 1px rgba(201,168,76,0.55), 0 4px 24px rgba(201,168,76,0.12)' }}
      />

      {/* Featured card: persistent breathing glow */}
      {featured && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{
            boxShadow: [
              'inset 0 0 0 1px rgba(201,168,76,0.06)',
              'inset 0 0 0 1px rgba(201,168,76,0.22)',
              'inset 0 0 0 1px rgba(201,168,76,0.06)',
            ],
          }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
    </MotionLink>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
  const { gent } = useAuthStore()
  const comfort = gent ? isComfortMode(gent.id) : false

  return (
    <>
      <TopBar />
      <SectionNav />

      <PageWrapper padded scrollable>
        {/* Hero */}
        <div className="flex flex-col items-center gap-3 pt-6 pb-8">
          <motion.img
            src="/logo.png"
            alt="The Codex"
            className="w-20 h-20 rounded-full"
            style={{ boxShadow: '0 0 48px rgba(201,168,76,0.28), 0 0 0 1px rgba(201,168,76,0.12)' }}
            initial={{ opacity: 0, scale: 0.75 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.55, ease: [0.34, 1.56, 0.64, 1] }}
          />
          <motion.div
            className="flex flex-col items-center gap-1"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.18 }}
          >
            <h1 className="font-display text-2xl text-ivory tracking-wide">The Codex</h1>
            {gent && (
              <p className="text-ivory-dim text-xs font-body">{gent.full_alias}</p>
            )}
          </motion.div>
          <motion.div
            className="flex items-center gap-2 mt-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, delay: 0.3 }}
          >
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold/30" />
            <span className="text-gold/55 text-[10px] font-body uppercase tracking-[0.3em]">
              Private. Deliberate. Legendary.
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold/30" />
          </motion.div>
        </div>

        {/* On This Day — nostalgia card */}
        <OnThisDayCard />

        {/* Section cards — 2×3 grid, or 3×2 in comfort mode for bigger cards */}
        <div className={cn('grid gap-3 pb-4', comfort ? 'grid-cols-3' : 'grid-cols-2')}>
          {NAV_SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>

        {/* Quick actions */}
        <div className="pb-6 flex flex-col gap-3">
          <Link
            to="/momento"
            className="w-full bg-slate-dark rounded-xl p-4 border border-gold/20 text-left flex items-center gap-3 active:scale-[0.98] transition-transform no-underline"
          >
            <Camera size={20} className="text-gold shrink-0" />
            <div>
              <p className="text-ivory font-body text-sm font-semibold">Momento</p>
              <p className="text-ivory-dim font-body text-xs">Capture a framed story</p>
            </div>
          </Link>
          <Link
            to="/vaults"
            className="w-full bg-slate-dark rounded-xl p-4 border border-gold/20 text-left flex items-center gap-3 active:scale-[0.98] transition-transform no-underline"
          >
            <Lock size={20} className="text-gold shrink-0" />
            <div>
              <p className="text-ivory font-body text-sm font-semibold">The Vault</p>
              <p className="text-ivory-dim font-body text-xs">Seal a message for the future</p>
            </div>
          </Link>
          <button
            onClick={() => gent && launchToastSession(gent.id).catch(console.error)}
            className="w-full bg-slate-dark rounded-xl p-4 border border-gold/20 text-left flex items-center gap-3 active:scale-[0.98] transition-transform"
          >
            <Wine size={20} className="text-gold shrink-0" />
            <div>
              <p className="text-ivory font-body text-sm font-semibold">Host a Toast</p>
              <p className="text-ivory-dim font-body text-xs">Launch a cocktail session</p>
            </div>
          </button>
        </div>
      </PageWrapper>
    </>
  )
}
