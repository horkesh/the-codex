import { useEffect, useState, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Volume2, VolumeX, Loader2 } from 'lucide-react'
import { Link } from 'react-router'
import { fetchPS5HeadToHead, fetchPS5Streaks, fetchPS5AllMatches } from '@/data/stats'
import type { PS5Streak, PS5MatchFlat } from '@/data/stats'
import { computeElo, getLeaderboard, winProbability, getMostActiveMatchup, generateHeadlines } from '@/lib/elo'
import type { EloRatings } from '@/lib/elo'
import { GENT_LABELS } from '@/lib/gents'
import type { GentAlias } from '@/types/app'
import { Spinner } from '@/components/ui'
import { useNarration } from '@/hooks/useNarration'
import { supabase } from '@/lib/supabase'
import { fadeIn } from '@/lib/animations'

// ─── Commentary types & localStorage memory ─────────────────────────────────

interface Commentary {
  commentary: string
  trash_talk: string
  arc_narrative: string
}

const TRASH_TALK_STORAGE_KEY = 'codex_rivalry_trash_talk'

function getPreviousLines(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TRASH_TALK_STORAGE_KEY) ?? '[]')
  } catch { return [] }
}

function saveLine(line: string) {
  const prev = getPreviousLines()
  const updated = [line, ...prev].slice(0, 5)
  localStorage.setItem(TRASH_TALK_STORAGE_KEY, JSON.stringify(updated))
}

// ─── Season Awards ──────────────────────────────────────────────────────────

function computeSeasonAwards(
  matches: PS5MatchFlat[],
): Array<{ title: string; winner: string; description: string }> {
  const awards: Array<{ title: string; winner: string; description: string }> = []

  const now = new Date()
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
  const quarterMatches = matches.filter(m => new Date(m.date) >= quarterStart && m.winner)

  if (quarterMatches.length < 3) return []

  const wins: Record<string, number> = {}
  const losses: Record<string, number> = {}
  for (const m of quarterMatches) {
    if (!m.winner) continue
    wins[m.winner] = (wins[m.winner] ?? 0) + 1
    const loser = m.winner === m.p1 ? m.p2 : m.p1
    losses[loser] = (losses[loser] ?? 0) + 1
  }

  const mvpEntry = Object.entries(wins).sort(([, a], [, b]) => b - a)[0]
  if (mvpEntry) {
    awards.push({ title: 'MVP', winner: mvpEntry[0], description: `${mvpEntry[1]} wins this quarter` })
  }

  const chokerEntry = Object.entries(losses).sort(([, a], [, b]) => b - a)[0]
  if (chokerEntry && chokerEntry[1] >= 3) {
    awards.push({ title: 'Biggest Choker', winner: chokerEntry[0], description: `${chokerEntry[1]} losses this quarter` })
  }

  return awards
}

// ─── Wall of Shame ──────────────────────────────────────────────────────────

function getWallOfShame(
  streaks: PS5Streak[],
  ratings: EloRatings,
): { alias: string; reason: string } | null {
  // Find gent on a losing streak (lastResult === 'loss' and currentStreak === 0 means just lost)
  const losers = streaks.filter(s => s.lastResult === 'loss')
  if (losers.length > 0) {
    // Pick the one with the lowest ELO among current losers
    const sorted = losers.sort((a, b) => (ratings[a.alias] ?? 1200) - (ratings[b.alias] ?? 1200))
    const worst = sorted[0]
    return { alias: worst.alias, reason: `Lowest ELO among active losers: ${ratings[worst.alias] ?? 1200}` }
  }

  // Fall back to lowest ELO overall
  const entries = Object.entries(ratings)
  if (entries.length === 0) return null
  const lowest = entries.sort(([, a], [, b]) => a - b)[0]
  return { alias: lowest[0], reason: `Lowest ELO rating: ${lowest[1]}` }
}

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

function RecentMatches({ matches, trashTalk }: { matches: PS5MatchFlat[]; trashTalk: string | null | undefined }) {
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
  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const { audioUrl: commentaryAudioUrl, generating: generatingAudio, playing: playingAudio, generate: generateAudio, play: playAudio } = useNarration('rivalry-commentary')

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

  // Generate commentary for the most recent match
  const trashTalkFetched = useRef(false)
  useEffect(() => {
    if (matches.length === 0 || trashTalkFetched.current || Object.keys(h2h).length === 0) return
    const reversed = [...matches].reverse()
    const latest = reversed[0]
    if (!latest?.winner) return
    trashTalkFetched.current = true

    const winnerAlias = latest.winner
    const loserAlias = latest.winner === latest.p1 ? latest.p2 : latest.p1
    const winnerLabel = GENT_LABELS[winnerAlias as GentAlias] ?? winnerAlias
    const loserLabel = GENT_LABELS[loserAlias as GentAlias] ?? loserAlias

    // Compute context for richer prompt
    const winsVsLoser = h2h[winnerAlias]?.[loserAlias] ?? 0
    const lossesVsLoser = h2h[loserAlias]?.[winnerAlias] ?? 0
    const h2hRecord = `${winnerLabel} leads ${winsVsLoser}-${lossesVsLoser} all time`
    const totalBetween = winsVsLoser + lossesVsLoser

    // Compute streak
    let streak = 0
    for (let i = reversed.length - 1; i >= 0; i--) {
      const m = reversed[i]
      if ((m.p1 === winnerAlias && m.p2 === loserAlias) || (m.p1 === loserAlias && m.p2 === winnerAlias)) {
        if (m.winner === winnerAlias) streak++
        else break
      }
    }

    // Recent results
    const recentResults = reversed
      .filter(m => (m.p1 === winnerAlias && m.p2 === loserAlias) || (m.p1 === loserAlias && m.p2 === winnerAlias))
      .slice(0, 5)
      .map(m => {
        const w = m.winner ? (GENT_LABELS[m.winner as GentAlias] ?? m.winner) : 'Draw'
        const l = m.winner === m.p1 ? m.p2 : m.p1
        return m.winner ? `${w} beat ${GENT_LABELS[l as GentAlias] ?? l}` : 'Draw'
      })

    // ELO ratings
    const currentRatings = computeElo(matches.map(m => ({ p1: m.p1, p2: m.p2, winner: m.winner })))

    // Season context
    const now = new Date()
    const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
    const quarterMatches = matches.filter(m => new Date(m.date) >= quarterStart)
    const seasonContext = `${quarterMatches.length} matches played this quarter`

    supabase.functions.invoke('generate-trash-talk', {
      body: {
        winner: winnerLabel,
        loser: loserLabel,
        game: 'PS5',
        streak,
        h2h_record: h2hRecord,
        winner_elo: currentRatings[winnerAlias] ?? 1200,
        loser_elo: currentRatings[loserAlias] ?? 1200,
        recent_results: recentResults,
        previous_lines: getPreviousLines(),
        total_matches: totalBetween,
        season_context: seasonContext,
      },
    }).then(({ data }) => {
      if (data?.trash_talk) {
        setCommentary({
          commentary: data.commentary ?? '',
          trash_talk: data.trash_talk,
          arc_narrative: data.arc_narrative ?? '',
        })
        saveLine(data.trash_talk)
      }
    }).catch(() => {})
  }, [matches, h2h])

  function handlePlayCommentary() {
    if (!commentary) return
    if (commentaryAudioUrl) playAudio()
    else generateAudio(`${commentary.commentary} ${commentary.trash_talk}`)
  }

  const ratings = useMemo<EloRatings>(
    () => computeElo(matches.map((m) => ({ p1: m.p1, p2: m.p2, winner: m.winner }))),
    [matches],
  )

  const headlines = useMemo(
    () => generateHeadlines(h2h, ratings, streaks, GENT_LABELS),
    [h2h, ratings, streaks],
  )

  const totalMatches = matches.filter((m) => m.winner).length

  const seasonAwards = useMemo(() => computeSeasonAwards(matches), [matches])
  const wallOfShame = useMemo(() => getWallOfShame(streaks, ratings), [streaks, ratings])

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
          <RecentMatches matches={matches} trashTalk={commentary?.trash_talk ?? null} />

          {/* Match Commentary */}
          {commentary && (
            <section className="mb-8">
              <h3 className="text-[10px] tracking-[0.25em] text-gold/60 uppercase font-body font-semibold mb-3">
                Match Commentary
              </h3>

              {/* Commentary */}
              {commentary.commentary && (
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 mb-3">
                  <p className="text-sm font-body text-ivory/80 leading-relaxed">{commentary.commentary}</p>
                </div>
              )}

              {/* Trash talk */}
              <div className="border-l-2 border-red-500/40 pl-4 py-2 mb-3">
                <p className="text-sm font-display text-red-400/80 italic">&ldquo;{commentary.trash_talk}&rdquo;</p>
              </div>

              {/* Arc narrative */}
              {commentary.arc_narrative && (
                <div className="border-l-2 border-gold/30 pl-4 py-2">
                  <p className="text-xs font-body text-ivory-dim/60 italic">{commentary.arc_narrative}</p>
                </div>
              )}

              {/* Play commentary button — TTS */}
              <button
                type="button"
                onClick={handlePlayCommentary}
                disabled={generatingAudio}
                className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/10 border border-gold/20 text-xs font-body text-gold hover:bg-gold/15 transition-colors disabled:opacity-40"
              >
                {generatingAudio ? (
                  <><Loader2 size={12} className="animate-spin" /> Generating...</>
                ) : playingAudio ? (
                  <><VolumeX size={12} /> Stop</>
                ) : (
                  <><Volume2 size={12} /> Play Commentary</>
                )}
              </button>
            </section>
          )}

          {/* Season Awards */}
          {seasonAwards.length > 0 && (
            <section className="mb-8">
              <h3 className="text-[10px] tracking-[0.25em] text-gold/60 uppercase font-body font-semibold mb-3">
                Season Awards
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {seasonAwards.map(a => (
                  <div key={a.title} className="bg-white/[0.03] border border-gold/15 rounded-xl p-3 text-center">
                    <p className="text-[9px] font-body text-gold/50 uppercase tracking-widest">{a.title}</p>
                    <p className="text-sm font-display text-gold mt-1">{GENT_LABELS[a.winner as GentAlias] ?? a.winner}</p>
                    <p className="text-[10px] font-body text-ivory-dim/40 mt-0.5">{a.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Wall of Shame */}
          {wallOfShame && (
            <section className="mb-8">
              <h3 className="text-[10px] tracking-[0.25em] text-red-400/60 uppercase font-body font-semibold mb-3">
                Wall of Shame
              </h3>
              <div className="bg-red-950/20 border border-red-500/15 rounded-xl p-4 text-center">
                <p className="text-2xl font-display text-red-400/80">{GENT_LABELS[wallOfShame.alias as GentAlias] ?? wallOfShame.alias}</p>
                <p className="text-xs font-body text-red-400/40 mt-1">{wallOfShame.reason}</p>
                <p className="text-[10px] font-body text-ivory-dim/30 mt-2 italic">May they find peace in their next session.</p>
              </div>
            </section>
          )}
        </motion.div>
      )}
    </div>
  )
}
