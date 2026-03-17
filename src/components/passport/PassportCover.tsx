import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
import { composeTravelIntel } from '@/ai/travelIntel'

interface PassportCoverProps {
  gent: {
    display_name: string
    alias: string
    avatar_url: string | null
  }
  onOpen: () => void
  stampCount: number
  countryCount: number
  cities?: string[]
  missionCount?: number
}

/** SVG chip icon matching the physical passport */
function ChipIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 30" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="38" height="28" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <rect x="8" y="6" width="24" height="18" rx="1.5" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="12" x2="0" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="8" y1="18" x2="0" y2="18" stroke="currentColor" strokeWidth="1" />
      <line x1="32" y1="12" x2="40" y2="12" stroke="currentColor" strokeWidth="1" />
      <line x1="32" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="1" />
      <line x1="16" y1="6" x2="16" y2="0" stroke="currentColor" strokeWidth="1" />
      <line x1="24" y1="6" x2="24" y2="0" stroke="currentColor" strokeWidth="1" />
      <line x1="16" y1="24" x2="16" y2="30" stroke="currentColor" strokeWidth="1" />
      <line x1="24" y1="24" x2="24" y2="30" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function PassportCover({ gent, onOpen, stampCount, countryCount, cities, missionCount }: PassportCoverProps) {
  const intelText = useMemo(() => {
    if (!cities?.length) return null
    const freq: Record<string, number> = {}
    for (const c of cities) freq[c] = (freq[c] ?? 0) + 1
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1])
    const topCity = sorted[0]?.[0] ?? ''
    const topCityCount = sorted[0]?.[1] ?? 0
    const uniqueCities = [...new Set(cities)]
    return composeTravelIntel({
      missions: missionCount ?? 0,
      countries: countryCount,
      cities: uniqueCities,
      topCity,
      topCityCount,
    })
  }, [cities, missionCount, countryCount])

  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4 py-8"
    >
      {/* Passport body */}
      <div className="relative w-full max-w-sm mx-auto">
        <div
          className={cn(
            'relative w-full',
            'border-2 border-gold/30 rounded-xl',
            'overflow-hidden',
          )}
          style={{
            backgroundImage: 'url(/passport-cover.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(201,168,76,0.08), inset 0 1px 0 rgba(201,168,76,0.1), inset 0 0 60px rgba(201,168,76,0.05)',
          }}
        >
        {/* Spacer to push content below the cover emblem area */}
        <div className="pt-[60%]" />

        {/* Interior — overlaid on the cover image */}
        <div className="px-7 pb-7 pt-2 flex flex-col items-center gap-4">

          {/* Bearer info */}
          <div className="flex flex-col items-center gap-2.5 w-full">
            <Avatar
              src={gent.avatar_url}
              name={gent.display_name}
              size="xl"
              active
            />
            <div className="flex flex-col items-center gap-0.5">
              <p className="font-display text-xl text-ivory leading-tight drop-shadow-lg">
                {gent.display_name}
              </p>
              <p className="text-xs text-gold-muted uppercase tracking-[0.2em] font-body drop-shadow-lg">
                {gent.alias}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div
            className={cn(
              'w-full flex items-center justify-center gap-0',
              'bg-obsidian/70 backdrop-blur-sm rounded-lg border border-gold/15',
              'divide-x divide-gold/10 overflow-hidden',
            )}
          >
            <div className="flex-1 flex flex-col items-center py-3">
              <span className="font-display text-lg text-gold leading-none">{stampCount}</span>
              <span className="text-[10px] text-ivory-dim uppercase tracking-wider mt-0.5 font-body">
                Stamps
              </span>
            </div>
            <div className="flex-1 flex flex-col items-center py-3">
              <span className="font-display text-lg text-gold leading-none">{countryCount}</span>
              <span className="text-[10px] text-ivory-dim uppercase tracking-wider mt-0.5 font-body">
                Countries
              </span>
            </div>
          </div>

          {/* Travel intelligence */}
          {intelText && (
            <div className="w-full px-4 py-3 rounded-lg border border-gold/10 bg-obsidian/60 backdrop-blur-sm">
              <p className="text-[10px] font-mono tracking-[0.2em] text-gold-muted uppercase mb-1.5">Travel Intelligence</p>
              <p className="text-xs text-ivory-dim font-body leading-relaxed">{intelText}</p>
            </div>
          )}

          {/* Multi-language passport text */}
          <div className="flex items-center gap-3 w-full justify-center">
            <p className="font-display text-[11px] text-gold/70 tracking-[0.15em] font-semibold leading-relaxed drop-shadow-lg text-center">
              PASO&Scaron; &middot; &#1055;&#1040;&#1057;&#1054;&#1064; &middot; PUTOVNICA &middot; PASSPORT
            </p>
            <ChipIcon className="w-7 h-5 text-gold/50 shrink-0" />
          </div>

          {/* Open button */}
          <motion.div
            whileHover={{ y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-full"
          >
            <Button
              variant="outline"
              size="lg"
              fullWidth
              onClick={onOpen}
              className="tracking-widest uppercase text-xs font-body font-semibold"
            >
              Open Passport
            </Button>
          </motion.div>
        </div>

        {/* Bottom spine accent */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
        </div>
      </div>
    </motion.div>
  )
}
