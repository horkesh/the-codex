import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'

interface Props {
  gentName: string
  alias: string
  activePeriod?: string  // e.g. "2019 — 2024"
}

export function HonourableDischargeCertificate({ gentName, alias, activePeriod }: Props) {
  return (
    <motion.div
      variants={fadeUp}
      initial="initial"
      animate="animate"
      className="mx-auto max-w-sm"
    >
      <div className="relative border-2 border-gold/30 rounded-xl p-6 bg-gradient-to-b from-[#1a1510] to-obsidian overflow-hidden">
        {/* Guilloche-style decorative border (inner) */}
        <div className="absolute inset-3 border border-gold/15 rounded-lg pointer-events-none" />

        {/* Header */}
        <div className="text-center relative z-10">
          <p className="text-[9px] font-body text-gold/50 uppercase tracking-[0.4em] mb-1">The Gents Chronicles</p>
          <div className="h-px bg-gradient-to-r from-transparent via-gold/30 to-transparent mb-4" />
          <p className="text-[11px] font-body text-gold/70 uppercase tracking-[0.3em] mb-4">Honourable Discharge</p>
        </div>

        {/* Body */}
        <div className="text-center relative z-10 py-4">
          <p className="text-xs font-body text-ivory-dim/60 mb-2">This certifies that</p>
          <p className="text-2xl font-display text-ivory mb-1">{gentName}</p>
          <p className="text-sm font-body text-gold italic">&ldquo;{alias}&rdquo;</p>

          {activePeriod && (
            <p className="text-xs font-body text-ivory-dim/50 mt-4">
              Active Service: {activePeriod}
            </p>
          )}

          <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent my-4" />

          <p className="text-[11px] font-body text-ivory-dim/60 leading-relaxed max-w-xs mx-auto">
            Has served with distinction among The Gents and is hereby granted honourable discharge from active duty. His chronicle endures.
          </p>
        </div>

        {/* Stamp overlay */}
        <div className="absolute bottom-6 right-6 z-10">
          <span className="text-[10px] font-body text-red-400/50 uppercase tracking-[0.2em] border border-red-400/30 px-2 py-1 rounded -rotate-12 inline-block">
            Discharged
          </span>
        </div>

        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <img src="/logo-gold.webp" alt="" className="w-48 h-48" />
        </div>
      </div>
    </motion.div>
  )
}
