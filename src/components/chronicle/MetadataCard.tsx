import { flagEmoji } from '@/lib/utils'
import { Card } from '@/components/ui'
import type { EntryWithParticipants, PS5Match, GentAlias } from '@/types/app'

interface MetadataCardProps {
  entry: EntryWithParticipants
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
      {children}
    </p>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-xs text-ivory-dim font-body">{label}</span>
      <span className="text-sm text-ivory font-body text-right">{value}</span>
    </div>
  )
}

// ── Mission ────────────────────────────────────────────────────────────────

function MissionMeta({ entry }: { entry: EntryWithParticipants }) {
  return (
    <Card variant="glass" className="p-4">
      <SectionLabel>✈️ Destination</SectionLabel>
      <div className="space-y-2">
        {entry.city && <Row label="City" value={entry.city} />}
        {entry.country && (
          <Row
            label="Country"
            value={
              <span className="flex items-center gap-1.5 justify-end">
                {entry.country_code && (
                  <span aria-hidden="true">{flagEmoji(entry.country_code)}</span>
                )}
                {entry.country}
              </span>
            }
          />
        )}
        {entry.location && <Row label="Venue" value={entry.location} />}
      </div>
    </Card>
  )
}

// ── Steak ──────────────────────────────────────────────────────────────────

function SteakMeta({ entry }: { entry: EntryWithParticipants }) {
  const meta = entry.metadata as Record<string, unknown>
  const restaurant = meta.restaurant as string | undefined
  const cut = meta.cut as string | undefined
  const score = meta.score as number | string | undefined
  const verdict = meta.verdict as string | undefined

  return (
    <Card variant="glass" className="p-4">
      <SectionLabel>🥩 The Verdict</SectionLabel>
      <div className="space-y-2">
        {restaurant && <Row label="Restaurant" value={restaurant} />}
        {entry.location && !restaurant && <Row label="Venue" value={entry.location} />}
        {cut && <Row label="Cut" value={cut} />}
        {score !== undefined && score !== null && (
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-xs text-ivory-dim font-body">Score</span>
            <span className="font-display text-2xl text-gold font-bold">
              {score}
              <span className="text-sm text-ivory-dim font-body font-normal">/10</span>
            </span>
          </div>
        )}
        {verdict && (
          <p className="text-sm text-ivory-muted font-display italic mt-2 pt-2 border-t border-white/10">
            "{verdict}"
          </p>
        )}
      </div>
    </Card>
  )
}

// ── PlayStation ────────────────────────────────────────────────────────────

function computePS5Summary(matches: PS5Match[]): { totalMatches: number; leader: GentAlias | 'tied' | null } {
  if (!matches || matches.length === 0) return { totalMatches: 0, leader: null }

  const wins: Record<string, number> = {}
  for (const match of matches) {
    if (match.winner) {
      wins[match.winner] = (wins[match.winner] ?? 0) + 1
    }
  }

  const entries = Object.entries(wins)
  if (entries.length === 0) return { totalMatches: matches.length, leader: null }

  entries.sort((a, b) => b[1] - a[1])
  if (entries.length >= 2 && entries[0][1] === entries[1][1]) {
    return { totalMatches: matches.length, leader: 'tied' }
  }

  return { totalMatches: matches.length, leader: entries[0][0] as GentAlias }
}

function PlaystationMeta({ entry }: { entry: EntryWithParticipants }) {
  const meta = entry.metadata as Record<string, unknown>
  const matches = (meta.matches as PS5Match[] | undefined) ?? []
  const { totalMatches, leader } = computePS5Summary(matches)

  return (
    <Card variant="glass" className="p-4">
      <SectionLabel>🎮 Scoreboard</SectionLabel>
      <div className="space-y-2">
        <Row label="Matches played" value={totalMatches} />
        {leader && leader !== 'tied' && (
          <Row
            label="Current leader"
            value={<span className="text-gold font-semibold capitalize">{leader}</span>}
          />
        )}
        {leader === 'tied' && (
          <Row
            label="Standing"
            value={<span className="text-ivory-muted">Tied</span>}
          />
        )}
        {!leader && totalMatches > 0 && (
          <Row label="Standing" value={<span className="text-ivory-dim">No winners recorded</span>} />
        )}
      </div>
    </Card>
  )
}

// ── Default (others) ───────────────────────────────────────────────────────

function DefaultMeta({ entry }: { entry: EntryWithParticipants }) {
  const hasLocation = entry.location || entry.city || entry.country

  if (!hasLocation && !entry.description) return null

  return (
    <Card variant="glass" className="p-4">
      <div className="space-y-2">
        {entry.location && (
          <Row label="Location" value={entry.location} />
        )}
        {entry.city && <Row label="City" value={entry.city} />}
        {entry.country && (
          <Row
            label="Country"
            value={
              <span className="flex items-center gap-1.5 justify-end">
                {entry.country_code && (
                  <span aria-hidden="true">{flagEmoji(entry.country_code)}</span>
                )}
                {entry.country}
              </span>
            }
          />
        )}
        {entry.description && (
          <p className="text-sm text-ivory-muted font-body leading-relaxed pt-2 border-t border-white/10 mt-2">
            {entry.description}
          </p>
        )}
      </div>
    </Card>
  )
}

// ── Main export ────────────────────────────────────────────────────────────

export function MetadataCard({ entry }: MetadataCardProps) {
  switch (entry.type) {
    case 'mission':
      return <MissionMeta entry={entry} />
    case 'steak':
      return <SteakMeta entry={entry} />
    case 'playstation':
      return <PlaystationMeta entry={entry} />
    default:
      return <DefaultMeta entry={entry} />
  }
}
