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
        {/* Spacer to push content below the cover emblem area (~60% from top) */}
        <div className="pt-[58%]" />

        {/* Interior — overlaid on the cover image */}
        <div className="px-7 pb-8 pt-2 flex flex-col items-center gap-5">

          {/* Bearer info */}
          <div className="flex flex-col items-center gap-3 w-full">
            {/* Avatar */}
            <Avatar
              src={gent.avatar_url}
              name={gent.display_name}
              size="xl"
              active
            />

            {/* Name */}
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
            <div className="mx-6 mt-4 px-4 py-3 rounded-lg border border-gold/10 bg-obsidian/60 backdrop-blur-sm">
              <p className="text-[10px] font-mono tracking-[0.2em] text-gold-muted uppercase mb-1.5">Travel Intelligence</p>
              <p className="text-xs text-ivory-dim font-body leading-relaxed">{intelText}</p>
            </div>
          )}

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
