import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchEntries } from '@/data/entries'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Spinner } from '@/components/ui/Spinner'
import type { EntryWithParticipants } from '@/types/app'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SteakhouseRecord {
  venue: string
  city: string
  avgScore: number
  count: number
}

interface CityRecord {
  city: string
  country: string
  count: number
}

// ─── Ranked row ───────────────────────────────────────────────────────────────

interface RankedRowProps {
  rank: number
  primary: string
  secondary?: string
  stat: string
  statLabel: string
  delay?: number
}

function RankedRow({ rank, primary, secondary, stat, statLabel }: RankedRowProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="flex items-start gap-4 py-3 border-b border-white/5 last:border-0"
    >
      {/* Rank number */}
      <span
        className="font-mono text-sm text-gold leading-none w-5 shrink-0 pt-0.5 text-right"
        aria-label={`Rank ${rank}`}
      >
        {rank}
      </span>

      {/* Name + sub */}
      <div className="flex flex-col flex-1 min-w-0 gap-0.5">
        <span className="font-display text-base text-ivory leading-tight tracking-wide truncate">
          {primary}
        </span>
        {secondary && (
          <span className="text-xs text-ivory-dim font-body truncate">{secondary}</span>
        )}
      </div>

      {/* Stat */}
      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className="font-mono text-sm text-ivory leading-none">{stat}</span>
        <span className="text-[10px] text-ivory-dim font-body uppercase tracking-wider">{statLabel}</span>
      </div>
    </motion.div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function VerdictBoard() {
  const [topSteaks, setTopSteaks] = useState<SteakhouseRecord[]>([])
  const [topCities, setTopCities] = useState<CityRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntries()
      .then((entries: EntryWithParticipants[]) => {
        // ── Top steakhouses ─────────────────────────────────────────────────
        const steakEntries = entries.filter((e) => e.type === 'steak')

        const venueMap: Record<string, { scores: number[]; count: number; city: string }> = {}
        for (const e of steakEntries) {
          const venue = (e.location ?? e.title).trim()
          const score = (e.metadata as Record<string, unknown>)?.score
          if (!venueMap[venue]) venueMap[venue] = { scores: [], count: 0, city: e.city ?? '' }
          venueMap[venue].count++
          if (typeof score === 'number' && !isNaN(score)) {
            venueMap[venue].scores.push(score)
          }
        }

        const steaks: SteakhouseRecord[] = Object.entries(venueMap)
          .map(([venue, v]) => ({
            venue,
            city: v.city,
            avgScore: v.scores.length
              ? v.scores.reduce((a, b) => a + b, 0) / v.scores.length
              : 0,
            count: v.count,
          }))
          .sort((a, b) => b.avgScore - a.avgScore || b.count - a.count)
          .slice(0, 5)

        setTopSteaks(steaks)

        // ── Top cities ──────────────────────────────────────────────────────
        const cityMap: Record<string, { count: number; country: string }> = {}
        for (const e of entries) {
          if (!e.city) continue
          const key = e.city.trim()
          if (!cityMap[key]) cityMap[key] = { count: 0, country: e.country ?? '' }
          cityMap[key].count++
        }

        const cities: CityRecord[] = Object.entries(cityMap)
          .map(([city, v]) => ({ city, country: v.country, count: v.count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        setTopCities(cities)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <section className="mb-10">
        <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
          The Verdict Board
        </p>
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      </section>
    )
  }

  const hasAnyData = topSteaks.length > 0 || topCities.length > 0

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        The Verdict Board
      </p>

      {!hasAnyData ? (
        <p className="text-ivory-dim text-sm font-body text-center py-8">
          Not enough data yet.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-4"
        >
          {/* Top Steakhouses */}
          {topSteaks.length > 0 && (
            <motion.div variants={staggerItem} className="bg-slate-mid rounded-xl p-5 shadow-card">
              {/* Sub-heading */}
              <p className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold mb-1">
                Top Steakhouses
              </p>
              <p className="text-[10px] text-ivory-dim/60 font-body mb-3">
                Ranked by average score
              </p>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {topSteaks.map((s, i) => (
                  <RankedRow
                    key={s.venue}
                    rank={i + 1}
                    primary={s.venue}
                    secondary={s.city || undefined}
                    stat={
                      s.avgScore > 0
                        ? s.avgScore.toFixed(1)
                        : `${s.count}`
                    }
                    statLabel={s.avgScore > 0 ? 'avg score' : `visit${s.count !== 1 ? 's' : ''}`}
                    delay={i * 0.05}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Top Cities */}
          {topCities.length > 0 && (
            <motion.div variants={staggerItem} className="bg-slate-mid rounded-xl p-5 shadow-card">
              <p className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold mb-1">
                Most Visited Cities
              </p>
              <p className="text-[10px] text-ivory-dim/60 font-body mb-3">
                Across all chronicle entries
              </p>

              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                {topCities.map((c, i) => (
                  <RankedRow
                    key={c.city}
                    rank={i + 1}
                    primary={c.city}
                    secondary={c.country || undefined}
                    stat={String(c.count)}
                    statLabel={`entr${c.count !== 1 ? 'ies' : 'y'}`}
                    delay={i * 0.05}
                  />
                ))}
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      )}
    </section>
  )
}
