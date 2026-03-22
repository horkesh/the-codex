import type { GentAlias } from '@/types/app'

const K = 32

export type EloRatings = Record<string, number>

export interface EloSnapshot {
  alias: string
  rating: number
}

export function computeElo(
  matches: Array<{ p1: string; p2: string; winner: string | null }>,
): EloRatings {
  const ratings: EloRatings = {}

  for (const match of matches) {
    if (!match.winner) continue
    if (!ratings[match.p1]) ratings[match.p1] = 1200
    if (!ratings[match.p2]) ratings[match.p2] = 1200

    const r1 = ratings[match.p1]
    const r2 = ratings[match.p2]
    const e1 = 1 / (1 + Math.pow(10, (r2 - r1) / 400))
    const e2 = 1 - e1

    const s1 = match.winner === match.p1 ? 1 : 0
    const s2 = 1 - s1

    ratings[match.p1] = Math.round(r1 + K * (s1 - e1))
    ratings[match.p2] = Math.round(r2 + K * (s2 - e2))
  }

  return ratings
}

export function winProbability(rating1: number, rating2: number): number {
  return 1 / (1 + Math.pow(10, (rating2 - rating1) / 400))
}

export function getLeaderboard(ratings: EloRatings): EloSnapshot[] {
  return Object.entries(ratings)
    .map(([alias, rating]) => ({ alias, rating }))
    .sort((a, b) => b.rating - a.rating)
}

/** Find the most active matchup (most total matches between two players). */
export function getMostActiveMatchup(
  h2h: Record<string, Record<string, number>>,
): { a: string; b: string; winsA: number; winsB: number } | null {
  let best: { a: string; b: string; winsA: number; winsB: number } | null = null
  let bestTotal = 0
  const seen = new Set<string>()

  for (const winner of Object.keys(h2h)) {
    for (const loser of Object.keys(h2h[winner])) {
      const key = [winner, loser].sort().join('-')
      if (seen.has(key)) continue
      seen.add(key)

      const wA = h2h[winner]?.[loser] ?? 0
      const wB = h2h[loser]?.[winner] ?? 0
      const total = wA + wB
      if (total > bestTotal) {
        bestTotal = total
        best = { a: winner, b: loser, winsA: wA, winsB: wB }
      }
    }
  }

  return best
}

/** Generate data-driven headlines from match stats. */
export function generateHeadlines(
  h2h: Record<string, Record<string, number>>,
  ratings: EloRatings,
  streaks: Array<{ alias: GentAlias; currentStreak: number; longestStreak: number }>,
  labels: Record<string, string>,
): string[] {
  const headlines: string[] = []

  // Highest rated player
  const leaderboard = getLeaderboard(ratings)
  if (leaderboard.length > 0) {
    const top = leaderboard[0]
    headlines.push(
      `${labels[top.alias] ?? top.alias} holds the highest ELO rating at ${top.rating}`,
    )
  }

  // Longest active streak
  const activeStreaks = streaks.filter((s) => s.currentStreak > 1)
  if (activeStreaks.length > 0) {
    const best = activeStreaks.sort((a, b) => b.currentStreak - a.currentStreak)[0]
    headlines.push(
      `${labels[best.alias] ?? best.alias} is on a ${best.currentStreak}-match winning streak`,
    )
  }

  // All-time longest streak
  const allTimeBest = [...streaks].sort((a, b) => b.longestStreak - a.longestStreak)[0]
  if (allTimeBest && allTimeBest.longestStreak > 1) {
    headlines.push(
      `All-time streak record: ${labels[allTimeBest.alias] ?? allTimeBest.alias} with ${allTimeBest.longestStreak} consecutive wins`,
    )
  }

  // Biggest dominance (one player crushing another)
  const seen = new Set<string>()
  let biggestGap = 0
  let dominanceMsg = ''
  for (const winner of Object.keys(h2h)) {
    for (const loser of Object.keys(h2h[winner])) {
      const key = [winner, loser].sort().join('-')
      if (seen.has(key)) continue
      seen.add(key)

      const wA = h2h[winner]?.[loser] ?? 0
      const wB = h2h[loser]?.[winner] ?? 0
      const gap = Math.abs(wA - wB)
      if (gap > biggestGap && (wA + wB) > 2) {
        biggestGap = gap
        const dominant = wA > wB ? winner : loser
        const dominated = wA > wB ? loser : winner
        const dWins = Math.max(wA, wB)
        const dLosses = Math.min(wA, wB)
        dominanceMsg = `${labels[dominant] ?? dominant} leads ${labels[dominated] ?? dominated} ${dWins}-${dLosses} in their head-to-head`
      }
    }
  }
  if (dominanceMsg) headlines.push(dominanceMsg)

  // Most total matches played by a player
  const totalMatches: Record<string, number> = {}
  for (const w of Object.keys(h2h)) {
    for (const l of Object.keys(h2h[w])) {
      totalMatches[w] = (totalMatches[w] ?? 0) + (h2h[w][l] ?? 0)
      totalMatches[l] = (totalMatches[l] ?? 0) + (h2h[w][l] ?? 0)
    }
  }
  const mostActive = Object.entries(totalMatches).sort((a, b) => b[1] - a[1])[0]
  if (mostActive) {
    headlines.push(
      `${labels[mostActive[0]] ?? mostActive[0]} has been involved in ${mostActive[1]} total matches`,
    )
  }

  // ELO gap between top and bottom
  if (leaderboard.length >= 2) {
    const top = leaderboard[0]
    const bottom = leaderboard[leaderboard.length - 1]
    const gap = top.rating - bottom.rating
    if (gap > 30) {
      headlines.push(
        `${gap} ELO points separate ${labels[top.alias] ?? top.alias} from ${labels[bottom.alias] ?? bottom.alias}`,
      )
    }
  }

  // Win probability for the most active matchup
  const matchup = getMostActiveMatchup(h2h)
  if (matchup && ratings[matchup.a] && ratings[matchup.b]) {
    const prob = winProbability(ratings[matchup.a], ratings[matchup.b])
    const higher = prob >= 0.5 ? matchup.a : matchup.b
    const pct = Math.round((prob >= 0.5 ? prob : 1 - prob) * 100)
    if (pct > 52) {
      headlines.push(
        `ELO projects ${labels[higher] ?? higher} at ${pct}% to win the next match`,
      )
    }
  }

  // Cold streak
  const coldStreaks = streaks.filter((s) => s.currentStreak === 0 && s.longestStreak > 0)
  if (coldStreaks.length > 0) {
    const cold = coldStreaks[0]
    headlines.push(
      `${labels[cold.alias] ?? cold.alias}'s streak has been broken — back to square one`,
    )
  }

  return headlines
}
