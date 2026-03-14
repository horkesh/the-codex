import { cn } from '@/lib/utils'
import { Card } from '@/components/ui'
import type { EntryWithParticipants, PS5Match, GentAlias } from '@/types/app'

interface PS5ScoreboardProps {
  entry: EntryWithParticipants
}

interface HeadToHeadRecord {
  p1: GentAlias
  p2: GentAlias
  p1Wins: number
  p2Wins: number
}

function buildHeadToHead(matches: PS5Match[]): HeadToHeadRecord[] {
  // Collect all unique pairs
  const pairMap = new Map<string, HeadToHeadRecord>()

  for (const match of matches) {
    const key = [match.p1, match.p2].sort().join('|')
    if (!pairMap.has(key)) {
      const [a, b] = [match.p1, match.p2].sort() as [GentAlias, GentAlias]
      pairMap.set(key, { p1: a, p2: b, p1Wins: 0, p2Wins: 0 })
    }
    const record = pairMap.get(key)!
    if (match.winner === record.p1) record.p1Wins++
    else if (match.winner === record.p2) record.p2Wins++
  }

  return Array.from(pairMap.values())
}

function MatchRow({ match }: { match: PS5Match }) {
  const [p1Score, p2Score] = match.score.split('-').map(Number)
  const p1Won = match.winner === match.p1
  const p2Won = match.winner === match.p2

  return (
    <div className="flex items-center gap-2 py-2 border-b border-white/5 last:border-0">
      <span className="text-xs text-ivory-dim font-mono w-16 shrink-0">
        Match {match.match_number}
      </span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span
          className={cn(
            'text-sm font-mono capitalize truncate',
            p1Won ? 'text-gold font-semibold' : 'text-ivory-dim',
          )}
        >
          {match.p1}
        </span>
        <span className="text-xs font-mono text-ivory-dim shrink-0">
          {p1Score ?? '–'}
          <span className="mx-0.5 text-ivory-dim/40"> — </span>
          {p2Score ?? '–'}
        </span>
        <span
          className={cn(
            'text-sm font-mono capitalize truncate',
            p2Won ? 'text-gold font-semibold' : 'text-ivory-dim',
          )}
        >
          {match.p2}
        </span>
      </div>
      {match.winner && (
        <span className="text-xs text-ivory-dim shrink-0 font-body">
          [
          <span className="text-gold capitalize">{match.winner}</span>
          ]
        </span>
      )}
    </div>
  )
}

function HeadToHeadRow({ record }: { record: HeadToHeadRecord }) {
  const { p1, p2, p1Wins, p2Wins } = record
  const tied = p1Wins === p2Wins
  const leader = p1Wins > p2Wins ? p1 : p2

  return (
    <div className="flex items-center gap-2 py-1.5">
      <span
        className={cn(
          'text-sm font-mono capitalize',
          !tied && leader === p1 ? 'text-gold font-semibold' : 'text-ivory-muted',
        )}
      >
        {p1}
      </span>
      <span className="text-xs font-mono text-ivory-dim shrink-0">
        {p1Wins} — {p2Wins}
      </span>
      <span
        className={cn(
          'text-sm font-mono capitalize',
          !tied && leader === p2 ? 'text-gold font-semibold' : 'text-ivory-muted',
        )}
      >
        {p2}
      </span>
      {tied && (
        <span className="text-xs text-ivory-dim font-body ml-auto">tied</span>
      )}
    </div>
  )
}

export function PS5Scoreboard({ entry }: PS5ScoreboardProps) {
  const meta = entry.metadata as Record<string, unknown>
  const matches = (meta.matches as PS5Match[] | undefined) ?? []

  // Use snapshot if available; otherwise compute from matches
  const snapshotRaw = meta.head_to_head_snapshot as Record<string, unknown> | undefined
  let headToHead: HeadToHeadRecord[] = buildHeadToHead(matches)

  // If snapshot is provided in a structured form, use it instead
  if (snapshotRaw && typeof snapshotRaw === 'object' && !Array.isArray(snapshotRaw)) {
    // Snapshot keys are like "keys|bass" → { p1Wins: number, p2Wins: number }
    const snapshotRecords: HeadToHeadRecord[] = []
    for (const [key, val] of Object.entries(snapshotRaw)) {
      const [p1, p2] = key.split('|') as [GentAlias, GentAlias]
      const v = val as Record<string, number>
      snapshotRecords.push({
        p1,
        p2,
        p1Wins: v[p1] ?? v.p1Wins ?? 0,
        p2Wins: v[p2] ?? v.p2Wins ?? 0,
      })
    }
    if (snapshotRecords.length > 0) headToHead = snapshotRecords
  }

  return (
    <Card variant="glass" className="p-4 space-y-4">
      {/* Header */}
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
        🎮 Match Records
      </p>

      {/* Match list */}
      {matches.length === 0 ? (
        <p className="text-sm text-ivory-dim font-body py-2">No matches recorded.</p>
      ) : (
        <div>
          {matches.map((match) => (
            <MatchRow key={match.match_number} match={match} />
          ))}
        </div>
      )}

      {/* Head-to-head section */}
      {headToHead.length > 0 && (
        <>
          <div className="flex items-center gap-3 pt-1">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs tracking-widest text-ivory-dim uppercase font-body">
              Head to Head
            </span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="space-y-0.5">
            {headToHead.map((record) => (
              <HeadToHeadRow
                key={`${record.p1}|${record.p2}`}
                record={record}
              />
            ))}
          </div>
        </>
      )}
    </Card>
  )
}
