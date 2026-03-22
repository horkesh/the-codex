import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchPS5HeadToHead } from '@/data/stats'
import { fetchEntries } from '@/data/entries'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { formatDate } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import type { EntryWithParticipants, GentAlias, PS5Match } from '@/types/app'

// ─── Constants ────────────────────────────────────────────────────────────────

const GENT_LABELS: Record<GentAlias, string> = {
  keys: 'Keys',
  bass: 'Bass',
  lorekeeper: 'Lorekeeper',
  operative: 'Operative',
}

type Pairing = { a: GentAlias; b: GentAlias }

const PAIRINGS: Pairing[] = [
  { a: 'keys',  b: 'bass'        },
  { a: 'keys',  b: 'lorekeeper'  },
  { a: 'bass',  b: 'lorekeeper'  },
]

// ─── Match result type ────────────────────────────────────────────────────────

interface MatchResult {
  date: string
  winner: GentAlias | null
  a: GentAlias
  b: GentAlias
  scoreA: number
  scoreB: number
}

// ─── Streak computation ───────────────────────────────────────────────────────

interface StreakInfo {
  holder: GentAlias | null   // who currently holds the streak
  current: number            // length of current win streak
  longestHolder: GentAlias | null
  longest: number
}

interface DecisiveVictory {
  winner: GentAlias
  loser: GentAlias
  gap: number                // score difference
  date: string
}

interface PairingStats {
  pairing: Pairing
  winsA: number
  winsB: number
  streak: StreakInfo
  decisive: DecisiveVictory | null
}

function computePairingStats(
  pairing: Pairing,
  h2h: Record<string, Record<string, number>>,
  matches: MatchResult[],
): PairingStats {
  const { a, b } = pairing
  const winsA = h2h[a]?.[b] ?? 0
  const winsB = h2h[b]?.[a] ?? 0

  // Filter matches for this pairing, sorted chronologically (earliest first)
  const pairingMatches = matches
    .filter(
      (m) =>
        (m.a === a && m.b === b) ||
        (m.a === b && m.b === a),
    )
    .sort((x, y) => x.date.localeCompare(y.date))

  // Compute current streak and longest streak from ordered matches
  let currentStreak = 0
  let currentHolder: GentAlias | null = null
  let longestStreak = 0
  let longestHolder: GentAlias | null = null
  let runHolder: GentAlias | null = null
  let runLen = 0

  for (const m of pairingMatches) {
    if (!m.winner) {
      // Draw — reset current run
      runLen = 0
      runHolder = null
      continue
    }
    if (m.winner === runHolder) {
      runLen++
    } else {
      runHolder = m.winner
      runLen = 1
    }
    if (runLen > longestStreak) {
      longestStreak = runLen
      longestHolder = runHolder
    }
  }
  // Current streak is the final run
  currentStreak = runLen
  currentHolder = runHolder

  // Most decisive victory (largest score gap)
  let decisive: DecisiveVictory | null = null
  for (const m of pairingMatches) {
    if (!m.winner) continue
    const gap = Math.abs(m.scoreA - m.scoreB)
    if (!decisive || gap > decisive.gap) {
      const loser: GentAlias = m.winner === m.a ? m.b : m.a
      decisive = { winner: m.winner, loser, gap, date: m.date }
    }
  }

  return {
    pairing,
    winsA,
    winsB,
    streak: { holder: currentHolder, current: currentStreak, longestHolder, longest: longestStreak },
    decisive,
  }
}

// ─── Parse PS5 matches from entry metadata ────────────────────────────────────

function parseMatches(entries: EntryWithParticipants[]): MatchResult[] {
  const results: MatchResult[] = []

  for (const entry of entries) {
    const meta = entry.metadata as Record<string, unknown>
    const matchList = meta?.matches as PS5Match[] | undefined
    if (!Array.isArray(matchList)) continue

    for (const m of matchList) {
      // Each match has p1/p2 + score e.g. "3-1" + winner
      if (!m.p1 || !m.p2 || !m.score) continue
      const parts = String(m.score).split('-')
      const scoreA = parseInt(parts[0] ?? '0', 10)
      const scoreB = parseInt(parts[1] ?? '0', 10)
      results.push({
        date: entry.date,
        winner: m.winner ?? null,
        a: m.p1 as GentAlias,
        b: m.p2 as GentAlias,
        scoreA: isNaN(scoreA) ? 0 : scoreA,
        scoreB: isNaN(scoreB) ? 0 : scoreB,
      })
    }
  }

  return results
}

// ─── Rivalry card ─────────────────────────────────────────────────────────────

interface RivalryCardProps {
  stats: PairingStats
}

function RivalryCard({ stats }: RivalryCardProps) {
  const { pairing, winsA, winsB, streak, decisive } = stats
  const { a, b } = pairing
  const total = winsA + winsB
  const pctA = total > 0 ? (winsA / total) * 100 : 50
  const leaderIsA = winsA > winsB
  const tied = winsA === winsB

  const streakText =
    streak.current > 0 && streak.holder
      ? `${GENT_LABELS[streak.holder]} on a ${streak.current}-match run`
      : 'No active streak'

  const longestText =
    streak.longest > 0 && streak.longestHolder
      ? `Longest: ${GENT_LABELS[streak.longestHolder]} — ${streak.longest} in a row`
      : null

  const decisiveText =
    decisive
      ? `Biggest win: ${GENT_LABELS[decisive.winner]} +${decisive.gap} (${formatDate(decisive.date)})`
      : null

  return (
    <motion.div
      variants={staggerItem}
      className="bg-slate-mid rounded-xl p-5 shadow-card"
    >
      {/* Labels + scores */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-start gap-0.5">
          <span className={`font-body text-sm font-semibold ${!tied && leaderIsA ? 'text-gold' : 'text-ivory-muted'}`}>
            {GENT_LABELS[a]}
          </span>
          <span className={`font-mono text-2xl font-bold leading-none ${!tied && leaderIsA ? 'text-gold' : 'text-ivory'}`}>
            {winsA}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold">
            VS
          </span>
          {tied && (
            <span className="text-[10px] text-ivory-dim font-body">Tied</span>
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className={`font-body text-sm font-semibold ${!tied && !leaderIsA ? 'text-gold' : 'text-ivory-muted'}`}>
            {GENT_LABELS[b]}
          </span>
          <span className={`font-mono text-2xl font-bold leading-none ${!tied && !leaderIsA ? 'text-gold' : 'text-ivory'}`}>
            {winsB}
          </span>
        </div>
      </div>

      {/* Dominance bar */}
      <div className="h-1.5 rounded-full overflow-hidden bg-white/10 flex mb-3">
        <motion.div
          className={`h-full rounded-l-full ${!tied && leaderIsA ? 'bg-gold' : 'bg-ivory-dim'}`}
          style={{ width: `${pctA}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${pctA}%` }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        />
        <motion.div
          className={`h-full rounded-r-full ${!tied && !leaderIsA ? 'bg-gold' : 'bg-ivory-dim'}`}
          style={{ width: `${100 - pctA}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${100 - pctA}%` }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        />
      </div>

      {/* Total matches */}
      <p className="text-[10px] text-ivory-dim font-body text-center mb-3">
        {total} {total === 1 ? 'match' : 'matches'} played
      </p>

      {/* Divider */}
      {(streak.current > 0 || decisive) && (
        <div className="border-t border-white/5 pt-3 flex flex-col gap-1.5">
          {/* Current streak */}
          {streak.current > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-gold text-[10px]">—</span>
              <p className="text-xs text-ivory-muted font-body">{streakText}</p>
            </div>
          )}

          {/* Longest streak */}
          {longestText && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-ivory-dim text-[10px]">—</span>
              <p className="text-[10px] text-ivory-dim font-body">{longestText}</p>
            </div>
          )}

          {/* Most decisive victory */}
          {decisiveText && (
            <div className="flex items-center gap-2">
              <span className="font-mono text-ivory-dim text-[10px]">—</span>
              <p className="text-[10px] text-ivory-dim font-body">{decisiveText}</p>
            </div>
          )}
        </div>
      )}
    </motion.div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RivalryIndex() {
  const [pairingStats, setPairingStats] = useState<PairingStats[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchPS5HeadToHead(),
      fetchEntries({ type: 'playstation' }),
    ])
      .then(([h2h, entries]) => {
        const matches = parseMatches(entries)
        const stats = PAIRINGS.map((p) => computePairingStats(p, h2h, matches))
        setPairingStats(stats)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        Rivalry Index
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-3"
        >
          {pairingStats.map((stats) => (
            <RivalryCard
              key={`${stats.pairing.a}-${stats.pairing.b}`}
              stats={stats}
            />
          ))}
        </motion.div>
      )}
    </section>
  )
}
