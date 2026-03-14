import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'

interface PassportCoverProps {
  gent: {
    display_name: string
    alias: string
    avatar_url: string | null
  }
  onOpen: () => void
  stampCount: number
  countryCount: number
}

function CompassRose() {
  return (
    <svg
      width="72"
      height="72"
      viewBox="0 0 72 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer ring */}
      <circle cx="36" cy="36" r="34" stroke="#c9a84c" strokeOpacity="0.35" strokeWidth="1" />
      <circle cx="36" cy="36" r="28" stroke="#c9a84c" strokeOpacity="0.2" strokeWidth="0.5" />

      {/* Cardinal points — N, S, E, W diamonds */}
      {/* North */}
      <polygon points="36,4 39,32 36,36 33,32" fill="#c9a84c" fillOpacity="0.9" />
      {/* South */}
      <polygon points="36,68 39,40 36,36 33,40" fill="#c9a84c" fillOpacity="0.5" />
      {/* East */}
      <polygon points="68,36 40,33 36,36 40,39" fill="#c9a84c" fillOpacity="0.5" />
      {/* West */}
      <polygon points="4,36 32,33 36,36 32,39" fill="#c9a84c" fillOpacity="0.5" />

      {/* Ordinal points — smaller */}
      {/* NE */}
      <polygon points="61,11 40,32 36,36 37,31" fill="#c9a84c" fillOpacity="0.3" />
      {/* NW */}
      <polygon points="11,11 32,32 36,36 31,37" fill="#c9a84c" fillOpacity="0.3" />
      {/* SE */}
      <polygon points="61,61 40,40 36,36 41,35" fill="#c9a84c" fillOpacity="0.3" />
      {/* SW */}
      <polygon points="11,61 32,40 36,36 35,41" fill="#c9a84c" fillOpacity="0.3" />

      {/* Center circle */}
      <circle cx="36" cy="36" r="4" fill="#c9a84c" fillOpacity="0.8" />
      <circle cx="36" cy="36" r="2" fill="#c9a84c" />
    </svg>
  )
}

export function PassportCover({ gent, onOpen, stampCount, countryCount }: PassportCoverProps) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="flex items-center justify-center min-h-[calc(100vh-56px)] px-4 py-8"
    >
      {/* Passport body */}
      <div className="relative w-full max-w-sm mx-auto">
        {/* Optional guilloche texture — add public/textures/guilloche.webp to enable */}
        <div
          className="absolute inset-0 rounded-xl pointer-events-none opacity-[0.06] bg-repeat"
          style={{ backgroundImage: "url('/textures/guilloche.webp')" }}
          aria-hidden
        />
        <div
          className={cn(
            'relative w-full',
            'bg-slate-dark',
            'border-2 border-gold/30 rounded-xl',
            'shadow-[0_8px_40px_rgba(0,0,0,0.6),0_0_0_1px_rgba(201,168,76,0.08),inset_0_1px_0_rgba(201,168,76,0.1)]',
            'overflow-hidden',
          )}
        >
        {/* Spine accent line */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-gold/50 to-transparent" />

        {/* Interior */}
        <div className="px-7 py-8 flex flex-col items-center gap-5">

          {/* Header label */}
          <p className="text-xs tracking-[0.3em] text-gold uppercase font-body font-medium">
            The Gents Chronicles
          </p>

          {/* Compass crest */}
          <motion.div
            animate={{ rotate: [0, 2, -2, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <CompassRose />
          </motion.div>

          {/* Title */}
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-display text-3xl text-gold tracking-wide leading-none">
              CODEX
            </h1>
            <p className="text-[10px] tracking-[0.28em] text-ivory-dim uppercase font-body">
              Personal Document
            </p>
          </div>

          {/* Divider */}
          <div className="w-full flex items-center gap-3">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/30" />
            <div className="w-1 h-1 rounded-full bg-gold/50" />
            <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/30" />
          </div>

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
              <p className="font-display text-xl text-ivory leading-tight">
                {gent.display_name}
              </p>
              <p className="text-xs text-gold-muted uppercase tracking-[0.2em] font-body">
                {gent.alias}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div
            className={cn(
              'w-full flex items-center justify-center gap-0',
              'bg-slate-mid/60 rounded-lg border border-gold/10',
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
