import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { fetchPS5Streaks, type PS5Streak } from '@/data/stats'
import { GENT_LABELS } from '@/lib/gents'

export function PS5StreaksSection() {
  const [streaks, setStreaks] = useState<PS5Streak[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPS5Streaks()
      .then(setStreaks)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || streaks.length === 0) return null

  // Find the leader (longest current streak)
  const maxCurrent = Math.max(...streaks.map((s) => s.currentStreak))
  const maxLongest = Math.max(...streaks.map((s) => s.longestStreak))

  // Don't render if nobody has any streak data
  if (maxLongest === 0) return null

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        Win Streaks
      </p>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-3 gap-3"
      >
        {streaks.map((streak) => {
          const isCurrentLeader = streak.currentStreak > 0 && streak.currentStreak === maxCurrent
          const isLongestLeader = streak.longestStreak > 0 && streak.longestStreak === maxLongest

          return (
            <motion.div
              key={streak.alias}
              variants={staggerItem}
              className="relative bg-slate-mid rounded-xl p-4 shadow-card flex flex-col items-center text-center"
            >
              {/* Crown for current streak leader */}
              {isCurrentLeader && (
                <Crown
                  size={16}
                  className="absolute top-2 right-2 text-gold"
                  strokeWidth={2}
                />
              )}

              {/* Alias */}
              <span className="font-body text-xs text-ivory-muted font-semibold tracking-wide uppercase mb-2">
                {GENT_LABELS[streak.alias]}
              </span>

              {/* Current streak */}
              <div className="flex items-baseline gap-0.5">
                <span className={`font-mono text-3xl font-bold leading-none ${streak.currentStreak > 0 ? 'text-gold' : 'text-ivory-dim'}`}>
                  {streak.currentStreak}
                </span>
                <span className={`font-body text-sm font-semibold ${streak.currentStreak > 0 ? 'text-gold' : 'text-ivory-dim'}`}>
                  W
                </span>
              </div>

              {/* Active streak pulse */}
              {streak.currentStreak > 0 && (
                <span className="mt-1.5 flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-gold" />
                  </span>
                  <span className="text-[10px] text-gold-muted font-body">Active</span>
                </span>
              )}

              {/* Longest streak */}
              <div className="mt-3 pt-2 border-t border-white/5 w-full">
                <p className="text-[10px] text-ivory-dim font-body uppercase tracking-wide">
                  Best
                </p>
                <div className="flex items-center justify-center gap-1 mt-0.5">
                  {isLongestLeader && (
                    <Crown size={10} className="text-gold" strokeWidth={2.5} />
                  )}
                  <span className={`font-mono text-base font-bold ${isLongestLeader ? 'text-gold' : 'text-ivory'}`}>
                    {streak.longestStreak}W
                  </span>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
    </section>
  )
}
