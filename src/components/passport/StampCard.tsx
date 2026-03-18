import { motion } from 'framer-motion'
import { Trophy, Globe } from 'lucide-react'
import { stampReveal } from '@/lib/animations'
import { cn, flagEmoji } from '@/lib/utils'
import type { PassportStamp } from '@/types/app'

interface StampCardProps {
  stamp: PassportStamp
  onPress: () => void
  large?: boolean
}

/** Decorative SVG passport stamp with guilloche rings + country code + city arc */
function GuillocheStamp({ stamp, size }: { stamp: PassportStamp; size: number }) {
  const cc = stamp.country_code?.toUpperCase() ?? '??'
  const city = (stamp.city ?? '').toUpperCase()
  const year = new Date(stamp.date_earned).getFullYear()
  const r = size / 2
  const textR = r - 10 // radius for arced text

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      {/* Outer dashed perforation ring */}
      <circle cx={r} cy={r} r={r - 2} fill="none" stroke="rgba(201,168,76,0.3)" strokeWidth={1} strokeDasharray="3 3" />

      {/* Guilloche concentric rings */}
      <circle cx={r} cy={r} r={r - 6} fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth={0.5} />
      <circle cx={r} cy={r} r={r - 9} fill="none" stroke="rgba(201,168,76,0.18)" strokeWidth={0.75} strokeDasharray="1.5 2" />
      <circle cx={r} cy={r} r={r - 12} fill="none" stroke="rgba(201,168,76,0.12)" strokeWidth={0.5} />

      {/* Inner solid ring */}
      <circle cx={r} cy={r} r={r - 16} fill="rgba(201,168,76,0.04)" stroke="rgba(201,168,76,0.25)" strokeWidth={0.75} />

      {/* Cross-hatch rosette — 12 radial lines */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180
        const x1 = r + (r - 16) * Math.cos(angle)
        const y1 = r + (r - 16) * Math.sin(angle)
        const x2 = r + (r - 9) * Math.cos(angle)
        const y2 = r + (r - 9) * Math.sin(angle)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(201,168,76,0.1)" strokeWidth={0.5} />
      })}

      {/* Country code — big centre text */}
      <text
        x={r}
        y={r + 1}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#C9A84C"
        fontSize={size * 0.28}
        fontFamily="'Playfair Display', Georgia, serif"
        fontWeight="700"
        letterSpacing="0.05em"
      >
        {cc}
      </text>

      {/* City name — arced along top */}
      {city && (
        <>
          <defs>
            <path id={`arc-top-${stamp.id}`} d={`M ${r - textR},${r} A ${textR},${textR} 0 0,1 ${r + textR},${r}`} fill="none" />
          </defs>
          <text fill="rgba(201,168,76,0.6)" fontSize={size * 0.09} fontFamily="'Instrument Sans', Arial, sans-serif" letterSpacing="0.12em">
            <textPath href={`#arc-top-${stamp.id}`} startOffset="50%" textAnchor="middle">
              {city}
            </textPath>
          </text>
        </>
      )}

      {/* Year — arced along bottom */}
      <defs>
        <path id={`arc-bot-${stamp.id}`} d={`M ${r - textR},${r} A ${textR},${textR} 0 0,0 ${r + textR},${r}`} fill="none" />
      </defs>
      <text fill="rgba(201,168,76,0.5)" fontSize={size * 0.1} fontFamily="'Instrument Sans', Arial, sans-serif" letterSpacing="0.15em">
        <textPath href={`#arc-bot-${stamp.id}`} startOffset="50%" textAnchor="middle">
          {String(year)}
        </textPath>
      </text>

      {/* Flag emoji centre-bottom */}
      {stamp.country_code && (
        <text x={r} y={r + size * 0.2} textAnchor="middle" fontSize={size * 0.13}>
          {flagEmoji(stamp.country_code)}
        </text>
      )}
    </svg>
  )
}

function StampPlaceholder({ stamp, size }: { stamp: PassportStamp; size: number }) {
  if (stamp.type === 'mission') {
    return <GuillocheStamp stamp={stamp} size={size} />
  }

  if (stamp.type === 'achievement') {
    return (
      <div className="rounded-full bg-gold/10 border border-gold/40 flex items-center justify-center" style={{ width: size, height: size }}>
        <Trophy size={size * 0.25} aria-hidden="true" className="text-gold" />
      </div>
    )
  }

  // diplomatic
  return (
    <div className="rounded-full bg-slate-mid border border-gold/30 flex items-center justify-center" style={{ width: size, height: size }}>
      <Globe size={size * 0.25} aria-hidden="true" className="text-ivory-muted" />
    </div>
  )
}

export function StampCard({ stamp, onPress, large }: StampCardProps) {
  const size = large ? 96 : 80

  return (
    <motion.button
      type="button"
      onClick={onPress}
      variants={stampReveal}
      whileTap={{ scale: 0.9 }}
      className={cn(
        'flex flex-col items-center gap-1.5 w-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold rounded-xl p-1',
      )}
      aria-label={stamp.name}
    >
      {/* Stamp circle */}
      {stamp.image_url ? (
        <div className="rounded-full overflow-hidden ring-2 ring-gold/20 shadow-[0_0_12px_rgba(201,168,76,0.15)]" style={{ width: size, height: size }}>
          <img
            src={stamp.image_url}
            alt={stamp.name}
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      ) : (
        <StampPlaceholder stamp={stamp} size={size} />
      )}

      {/* City name */}
      {stamp.city && (
        <span className="text-xs text-ivory-dim leading-tight text-center max-w-full truncate px-1">
          {stamp.city}
        </span>
      )}

      {/* Date */}
      <span className="text-[10px] text-ivory-dim/60 leading-tight">
        {new Date(stamp.date_earned).getFullYear()}
      </span>
    </motion.button>
  )
}
