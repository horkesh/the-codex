import { useEffect, useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router'
import { fetchPS5HeadToHead, fetchPS5Streaks, fetchPS5AllMatches } from '@/data/stats'
import type { PS5Streak, PS5MatchFlat } from '@/data/stats'
import { computeElo, getLeaderboard, winProbability, getMostActiveMatchup, generateHeadlines } from '@/lib/elo'
import type { EloRatings } from '@/lib/elo'
import { GENT_LABELS } from '@/lib/gents'
import type { GentAlias } from '@/types/app'
import { Spinner } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { fadeIn } from '@/lib/animations'

// ─── Scanline overlay (CSS) ──────────────────────────────────────────────────

const SCANLINE_BG = `repeating-linear-gradient(
  0deg,
  transparent,
  transparent 2px,
  rgba(255,255,255,0.015) 2px,
  rgba(255,255,255,0.015) 4px
)`

// ─── Animated number ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = display
    const diff = value - start
    if (diff === 0) return
    const duration = 800
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return <span className={className}>{display}</span>
}

// ─── ELO Leaderboard ─────────────────────────────────────────────────────────

function EloLeaderboard({ ratings }: { ratings: EloRatings }) {
  const leaderboard = useMemo(() => getLeaderboard(ratings), [ratings])
  const maxRating = leaderboard[0]?.rating ?? 1200
  const minRating = Math.min(...leaderboard.map((e) => e.rating), 1100)

  return (
    <section className="mb-8">
      <h3 className="text-[10px] tracking-[0.25em] text-gold/60 uppercase font-body font-semibold mb-4">
        ELO Rankings
      </h3>
      <div className="flex flex-col gap-3">
        {leaderboard.map((entry, i) => {
          const pct = maxRating > minRating
            ? ((entry.rating - minRating) / (maxRating - minRating)) * 100
            : 50
          return (
            <motion.div
              key={entry.alias}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-lg font-bold text-gold/40 w-6">
                    {i + 1}
                  </span>
                  <span className={`font-body text-sm font-semibold tracking-wide uppercase ${i === 0 ? 'text-gold' : 'text-ivory'}`}>
                    {GENT_LABELS[entry.alias as GentAlias] ?? entry.alias}
                  </span>
                </div>
                <AnimatedNumber
                  value={entry.rating}
                  className={`font-mono text-2xl font-bold ${i === 0 ? 'text-gold' : 'text-ivory'}`}
                />
              </div>
              <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${i === 0 ? 'bg-gold' : 'bg-gold/40'}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(pct, 8)}%` }}
                  transition={{ duration: 0.8, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
                />
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Head-to-Head Grid ───────────────────────────────────────────────────────

function HeadToHeadGrid({ h2h }: { h2h: Record<string, Record<string, number>> }) {
  const aliases = useMemo(() => {
    const all = new Set<string>()
    for (const w of Object.keys(h2h)) {
      all.add(w)
      for (const l of Object.keys(h2h[w])) all.add(l)
    }
    return Array.from(all).sort()
  }, [h2h])

  return (
    <section className="mb-8">
      <h3 className="text-[10px] tracking-[0.25em] text-gold/60 uppercase font-body font-semibold mb-4">
        Head-to-Head Record
      </h3>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg overflow-hidden">
        <table className="w-full text-center">
          <thead>
            <tr>
              <th className="p-2 text-[10px] text-ivory-dim font-body uppercase tracking-wide" />
              {aliases.map((a) => (
                <th key={a} className="p-2 text-[10px] text-gold/70 font-body uppercase tracking-wider font-semibold">
                  {(GENT_LABELS[a as GentAlias] ?? a).slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {aliases.map((row) => (
              <tr key={row} className="border-t border-white/[0.04]">
                <td className="p-2 text-[10px] text-gold/70 font-body uppercase tracking-wider font-semibold text-left pl-3">
                  {(GENT_LABELS[row as GentAlias] ?? row).slice(0, 4)}
                </td>
                {aliases.map((col) => {
                  if (row === col) {
                    return (
                      <td key={col} className="p-2">
                        <span className="text-ivory-dim/30 font-mono text-xs">--</span>
                      </td>
                    )
                  }
                  const wins = h2h[row]?.[col] ?? 0
                  const losses = h2h[col]?.[row] ?? 0
                  const leading = wins > losses
                  return (
                    <td key={col} className="p-2">
                      <span className={`font-mono text-sm font-bold ${leading ? 'text-gold' : wins === losses && wins > 0 ? 'text-ivory' : 'text-ivory-dim'}`}>
                        {wins}
                      </span>
                      <span className="text-ivory-dim/40 font-mono text-xs mx-0.5">-</span>
                      <span className={`font-mono text-sm font-bold ${!leading && losses > wins ? 'text-gold' : 'text-ivory-dim'}`}>
                        {losses}
                      </span>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

// ─── Win Probability Bar ─────────────────────────────────────────────────────

function WinProbabilityBar({
  h2h,
  ratings,
}: {
  h2h: Record<string, Record<string, number>>
  ratings: EloRatings
}) {
  const matchup = useMemo(() => getMostActiveMatchup(h2h), [h2h])

  if (!matchup || !ratings[matchup.a] || !ratings[matchup.b]) return null

  const prob = winProbability(ratings[matchup.a], ratings[matchup.b])
  const pctA = Math.round(prob * 100)
  const pctB = 100 - pctA
  const labelA = GENT_LABELS[matchup.a as GentAlias] ?? matchup.a
  const labelB = GENT_LABELS[matchup.b as GentAlias] ?? matchup.b

  return (
    <section className="mb-8">
      <h3 className="text-[10px] tracking-[0.25em] text-gold/60 uppercase font-body font-semibold mb-4">
        Next Match Projection
      </h3>
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <span className={`font-body text-sm font-semibold uppercase tracking-wide ${pctA >= pctB ? 'text-gold' : 'text-ivory'}`}>
            {labelA}
          </span>
          <span className="text-[10px] text-ivory-dim font-body tracking-widest uppercase">
            ELO Projection
          </span>
          <span className={`font-body text-sm font-semibold uppercase tracking-wide ${pctB > pctA ? 'text-gold' : 'text-ivory'}`}>
            {labelB}
          </span>
        </div>

        <div className="flex items-center gap-3 mb-2">
          <span className={`font-mono text-xl font-bold ${pctA >= pctB ? 'text-gold' : 'text-ivory-dim'}`}>
            {pctA}%
          </span>
          <div className="flex-1 h-3 rounded-full overflow-hidden bg-white/[0.06] flex">
            <motion.div
              className={`h-full ${pctA >= pctB ? 'bg-gold' : 'bg-ivory-dim/50'}`}
              initial={{ width: 0 }}
              animate={{ width: `${pctA}%` }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
            <motion.div
              className={`h-full ${pctB > pctA ? 'bg-gold' : 'bg-ivory-dim/50'}`}
              initial={{ width: 0 }}
              animate={{ width: `${pctB}%` }}
              transition={{ duration: 1, ease: [0.25, 0.46, 0.45, 0.94] }}
            />
          </div>
          <span className={`font-mono text-xl font-bold ${pctB > pctA ? 'text-gold' : 'text-ivory-dim'}`}>
            {pctB}%
          </span>
        </div>

        <p className="text-[10px] text-ivory-dim/60 font-body text-center">
          Based on {matchup.winsA + matchup.winsB} matches played
        </p>
      </div>
    </section>
  )
}

// ─── Streaks Panel ───────────────────────────────────────────────────────────

function StreaksPanel({ streaks }: { streaks: PS5Streak[] }) {
  const active = streaks.filter((s) => s.currentStreak > 0).sort((a, b) => b.currentStreak - a.currentStreak)

  if (active.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="text-[10px] tracking-[0.25em] text-gold/60 uppercase font-body font-semibold mb-4">
        Active Streaks
      </h3>
      <div className="flex flex-col gap-2">
        {active.map((s, i) => (
          <motion.div
            key={s.alias}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-4 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3"
          >
            <div className="flex items-center gap-2">
              {/* Flame effect for streaks >= 3 */}
              {s.currentStreak >= 3 && (
                <span
                  className="text-base"
                  style={{
                    filter: 'grayscale(1) brightness(1.5) sepia(1) hue-rotate(5deg) saturate(3)',
                  }}
                >
                  {'///'}
                </span>
              )}
              <span className="font-body text-sm font-semibold text-gold uppercase tracking-wide">
                {GENT_LABELS[s.alias]}
              </span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-2xl font-bold text-gold">
                {s.currentStreak}
              </span>
              <span className="font-body text-xs text-gold/60 uppercase tracking-wide">
                wins
              </span>
            </div>
            {/* Pulse indicator */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e63946] opacity-60" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#e63946]" />
            </span>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

// ─── Breaking News Ticker ────────────────────────────────────────────────────

function NewsTicker({ headlines }: { headlines: string[] }) {
  if (headlines.length === 0) return null

  const text = headlines.map((h) => `BREAKING: ${h}`).join('   ///   ')
  // Double the text for seamless loop
  const doubled = `${text}   ///   ${text}`

  return (
    <div className="relative overflow-hidden border-t border-b border-[#e63946]/30 bg-[#e63946]/[0.06] py-2.5">
      <motion.div
        className="whitespace-nowrap"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: headlines.length * 8, repeat: Infinity, ease: 'linear' }}
      >
        <span className="font-mono text-xs text-[#e63946] tracking-wide font-semibold">
          {doubled}
        </span>
      </motion.div>
    </div>
  )
}

// ─── Match Log ───────────────────────────────────────────────────────────────

function RecentMatches({ matches, trashTalk }: { matches: PS5MatchFlat[]; trashTalk: string | null }) {
  const recent = useMemo(() => [...matches].reverse().slice(0, 8), [matches])

  if (recent.length === 0) return null

  return (
    <section className="mb-8">
      <h3 className="text-[10px] tracking-[0.25em] text-gold/60 uppercase font-body font-semibold mb-4">
        Recent Results
      </h3>
      <div className="flex flex-col gap-1.5">
        {recent.map((m, i) => {
          const labelA = GENT_LABELS[m.p1] ?? m.p1
          const labelB = GENT_LABELS[m.p2] ?? m.p2
          const draw = !m.winner
          return (
            <div key={`${m.date}-${i}`}>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.04 }}
                className="flex items-center gap-2 bg-white/[0.02] border border-white/[0.04] rounded px-3 py-2 font-mono text-xs"
              >
                <span className="text-ivory-dim/50 w-16 shrink-0">
                  {m.date.slice(5)}
                </span>
                <span className={m.winner === m.p1 ? 'text-gold font-bold' : 'text-ivory-dim'}>
                  {labelA}
                </span>
                <span className="text-ivory-dim/30 mx-1">vs</span>
                <span className={m.winner === m.p2 ? 'text-gold font-bold' : 'text-ivory-dim'}>
                  {labelB}
                </span>
                {draw && (
                  <>
                    <span className="flex-1" />
                    <span className="text-ivory-dim/40">Draw</span>
                  </>
                )}
              </motion.div>
              {i === 0 && trashTalk && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="px-4 py-3 bg-white/[0.03] rounded-lg border-l-2 border-gold/40 mt-2"
                >
                  <p className="text-xs font-display text-gold/80 italic">"{trashTalk}"</p>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RivalryDashboard() {
  const [h2h, setH2h] = useState<Record<string, Record<string, number>>>({})
  const [streaks, setStreaks] = useState<PS5Streak[]>([])
  const [matches, setMatches] = useState<PS5MatchFlat[]>([])
  const [loading, setLoading] = useState(true)
  const [trashTalk, setTrashTalk] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchPS5HeadToHead(), fetchPS5Streaks(), fetchPS5AllMatches()])
      .then(([h, s, m]) => {
        setH2h(h)
        setStreaks(s)
        setMatches(m)
      })
      .catch(err => console.error('RivalryDashboard: failed to load data:', err))
      .finally(() => setLoading(false))
  }, [])

  // Generate trash talk for the most recent match
  const trashTalkFetched = useRef(false)
  useEffect(() => {
    if (matches.length === 0 || trashTalkFetched.current) return
    const reversed = [...matches].reverse()
    const latest = reversed[0]
    if (!latest?.winner) return
    trashTalkFetched.current = true
    const winnerLabel = GENT_LABELS[latest.winner as GentAlias] ?? latest.winner
    const loserAlias = latest.winner === latest.p1 ? latest.p2 : latest.p1
    const loserLabel = GENT_LABELS[loserAlias as GentAlias] ?? loserAlias
    supabase.functions.invoke('generate-trash-talk', {
      body: {
        winner: winnerLabel,
        loser: loserLabel,
        game: 'PS5',
      },
    }).then(({ data }) => {
      if (data?.trash_talk) setTrashTalk(data.trash_talk)
    }).catch(() => {})
  }, [matches])

  const ratings = useMemo<EloRatings>(
    () => computeElo(matches.map((m) => ({ p1: m.p1, p2: m.p2, winner: m.winner }))),
    [matches],
  )

  const headlines = useMemo(
    () => generateHeadlines(h2h, ratings, streaks, GENT_LABELS),
    [h2h, ratings, streaks],
  )

  const totalMatches = matches.filter((m) => m.winner).length

  return (
    <div
      className="min-h-dvh bg-obsidian relative"
      style={{ backgroundImage: SCANLINE_BG }}
    >
      {/* Header */}
      <div className="sticky top-0 z-20 bg-obsidian/90 backdrop-blur-md border-b border-white/[0.06]">
        <div className="flex items-center gap-3 px-4 h-14">
          <Link to="/ledger" className="text-ivory-dim hover:text-ivory transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="font-display text-base text-ivory tracking-[0.15em] uppercase leading-tight">
              Rivalry Broadcast
            </h1>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#e63946] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#e63946]" />
            </span>
            <span className="font-mono text-[10px] text-[#e63946] font-bold tracking-[0.2em] uppercase">
              Live
            </span>
          </div>
        </div>

        {/* Ticker */}
        {!loading && <NewsTicker headlines={headlines} />}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner size="lg" />
        </div>
      ) : (
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="px-4 pt-6 pb-24"
        >
          {/* Summary bar */}
          <div className="flex items-center justify-between mb-8 bg-white/[0.03] border border-white/[0.06] rounded-lg px-4 py-3">
            <div className="text-center flex-1">
              <p className="font-mono text-xl font-bold text-gold">
                <AnimatedNumber value={totalMatches} />
              </p>
              <p className="text-[9px] text-ivory-dim/60 font-body uppercase tracking-wider mt-0.5">
                Matches
              </p>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center flex-1">
              <p className="font-mono text-xl font-bold text-ivory">
                {Object.keys(ratings).length}
              </p>
              <p className="text-[9px] text-ivory-dim/60 font-body uppercase tracking-wider mt-0.5">
                Competitors
              </p>
            </div>
            <div className="w-px h-8 bg-white/[0.06]" />
            <div className="text-center flex-1">
              <p className="font-mono text-xl font-bold text-ivory">
                {getLeaderboard(ratings)[0]
                  ? (GENT_LABELS[(getLeaderboard(ratings)[0].alias) as GentAlias] ?? '').slice(0, 4)
                  : '--'}
              </p>
              <p className="text-[9px] text-ivory-dim/60 font-body uppercase tracking-wider mt-0.5">
                No. 1 Seed
              </p>
            </div>
          </div>

          <EloLeaderboard ratings={ratings} />
          <HeadToHeadGrid h2h={h2h} />
          <WinProbabilityBar h2h={h2h} ratings={ratings} />
          <StreaksPanel streaks={streaks} />
          <RecentMatches matches={matches} trashTalk={trashTalk} />
        </motion.div>
      )}
    </div>
  )
}
