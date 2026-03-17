import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchSteakRatings, type SteakRating } from '@/data/stats'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Spinner } from '@/components/ui/Spinner'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

// ─── Bar row ──────────────────────────────────────────────────────────────────

interface BarRowProps {
  rating: SteakRating
}

function BarRow({ rating }: BarRowProps) {
  const pct = Math.min(Math.max((rating.score / 10) * 100, 0), 100)

  return (
    <motion.div variants={staggerItem} className="flex flex-col gap-1 py-2.5 border-b border-white/5 last:border-0">
      {/* Top line: date + cut */}
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-body text-xs text-ivory-muted shrink-0">
          {formatDate(rating.date)}
        </span>
        {rating.cut && (
          <span className="font-body text-xs text-ivory-dim truncate text-right">
            {rating.cut}
          </span>
        )}
      </div>

      {/* Bar + score */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-5 rounded-sm bg-slate-dark overflow-hidden relative">
          <motion.div
            className="h-full rounded-sm"
            style={{ backgroundColor: '#c9a84c' }}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
          />
        </div>
        <span className="font-mono text-sm text-ivory font-bold w-8 text-right shrink-0">
          {rating.score.toFixed(1)}
        </span>
      </div>

      {/* Location subtitle */}
      {rating.location && (
        <p className="font-body text-[11px] text-ivory-dim truncate">
          {rating.location}
        </p>
      )}
    </motion.div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SteakRatingsChart() {
  const [ratings, setRatings] = useState<SteakRating[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSteakRatings()
      .then(setRatings)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const avg = ratings.length > 0
    ? ratings.reduce((sum, r) => sum + r.score, 0) / ratings.length
    : 0

  const avgPct = (avg / 10) * 100

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        The Table -- Steak Ratings
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : ratings.length === 0 ? (
        <p className="text-ivory-dim text-sm font-body text-center py-8">
          No steak ratings logged yet.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="bg-slate-mid rounded-xl p-5 shadow-card relative"
        >
          {/* Summary row */}
          <div className="flex items-center gap-4 mb-4 pb-3 border-b border-white/8">
            <div className="flex flex-col items-center flex-1">
              <span className="font-mono text-2xl text-gold font-bold leading-none">
                {avg.toFixed(1)}
              </span>
              <span className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold mt-1">
                Average
              </span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <span className="font-mono text-2xl text-ivory font-bold leading-none">
                {ratings.length}
              </span>
              <span className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold mt-1">
                Steaks Rated
              </span>
            </div>
            <div className="flex flex-col items-center flex-1">
              <span className="font-mono text-2xl text-ivory font-bold leading-none">
                {Math.max(...ratings.map((r) => r.score)).toFixed(1)}
              </span>
              <span className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold mt-1">
                Best
              </span>
            </div>
          </div>

          {/* Bar chart with average line overlay */}
          <div className="relative">
            {/* Average line indicator */}
            <div
              className="absolute top-0 bottom-0 border-l border-dashed border-gold/50 z-10 pointer-events-none"
              style={{ left: `${avgPct}%` }}
            >
              <span className="absolute -top-0.5 left-1 text-[9px] text-gold/60 font-mono whitespace-nowrap">
                avg
              </span>
            </div>

            {/* Rows */}
            <div>
              {ratings.map((rating) => (
                <BarRow key={rating.entry_id} rating={rating} />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </section>
  )
}
