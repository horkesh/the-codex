import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router'
import { TopBar, PageWrapper } from '@/components/layout'
import { Avatar, Badge, Button, Spinner } from '@/components/ui'
import { fetchGentByAlias } from '@/data/gents'
import { fetchAllStats } from '@/data/stats'
import { fetchEntries } from '@/data/entries'
import { fetchEarnedAchievements, ACHIEVEMENT_ICONS, type EarnedAchievement } from '@/data/achievements'
import { fetchEarnedThresholds, THRESHOLD_DEFINITIONS } from '@/data/thresholds'
import { formatDate } from '@/lib/utils'
import { HonourableDischargeCertificate } from '@/components/passport/HonourableDischargeCertificate'
import type { Gent, GentStats, EntryWithParticipants } from '@/types/app'

// ─── Signature stat derivation ────────────────────────────────────────────────

type StatKey = 'steaks' | 'countries_visited' | 'missions' | 'nights_out'

const STAT_RULES: Array<{
  field: StatKey
  threshold: number
  thresholdLabel: string
  fallbackLabel: string
  display: (v: number) => string
}> = [
  { field: 'steaks', threshold: 10, thresholdLabel: 'Connoisseur', fallbackLabel: 'Steak Man', display: (v) => `${v} steaks` },
  { field: 'countries_visited', threshold: 5, thresholdLabel: 'Globetrotter', fallbackLabel: 'Traveller', display: (v) => `${v} countries` },
  { field: 'missions', threshold: 8, thresholdLabel: 'Expeditionary', fallbackLabel: 'Expeditionary', display: (v) => `${v} missions` },
  { field: 'nights_out', threshold: 15, thresholdLabel: 'Nighthawk', fallbackLabel: 'Night Owl', display: (v) => `${v} nights out` },
]

function deriveSignatureStat(myStats: GentStats, allStats: GentStats[]): string | null {
  if (allStats.length === 0) return null

  // Threshold-based labels (checked first in priority order)
  for (const rule of STAT_RULES) {
    const val = myStats[rule.field]
    if (val >= rule.threshold) return `${rule.display(val)} · ${rule.thresholdLabel}`
  }

  // Fallback: highest relative to group average
  let bestRule: (typeof STAT_RULES)[0] | null = null
  let bestScore = -Infinity

  for (const rule of STAT_RULES) {
    const myVal = myStats[rule.field]
    if (myVal === 0) continue
    const avg = allStats.reduce((s, g) => s + g[rule.field], 0) / allStats.length
    const score = avg > 0 ? myVal / avg : myVal
    if (score > bestScore) {
      bestScore = score
      bestRule = rule
    }
  }

  if (!bestRule) return null
  return `${bestRule.display(myStats[bestRule.field])} · ${bestRule.fallbackLabel}`
}

export default function GentProfile() {
  const { alias } = useParams<{ alias: string }>()
  const navigate = useNavigate()

  const [gent, setGent] = useState<Gent | null>(null)
  const [stats, setStats] = useState<GentStats | null>(null)
  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [achievements, setAchievements] = useState<EarnedAchievement[]>([])
  const [thresholdKeys, setThresholdKeys] = useState<string[]>([])
  const [signature, setSignature] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!alias) return

    async function load() {
      setLoading(true)
      try {
        const [fetchedGent, allStats] = await Promise.all([
          fetchGentByAlias(alias!),
          fetchAllStats(),
        ])

        if (!fetchedGent) {
          setNotFound(true)
          return
        }

        setGent(fetchedGent)

        const gentStats = allStats.find((s) => s.alias === fetchedGent.alias) ?? null
        setStats(gentStats)
        if (gentStats) setSignature(deriveSignatureStat(gentStats, allStats))

        const [gentEntries, earned, earnedThresholds] = await Promise.all([
          fetchEntries({ gentId: fetchedGent.id }),
          fetchEarnedAchievements(fetchedGent.id),
          fetchEarnedThresholds(fetchedGent.id),
        ])
        setEntries(gentEntries.slice(0, 5))
        setAchievements(earned)
        setThresholdKeys(earnedThresholds)
      } catch {
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [alias])

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Profile" back />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      </div>
    )
  }

  if (notFound || !gent) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Not Found" back />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="text-ivory-dim text-sm font-body">Gent not found.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    )
  }

  const statChips: Array<{ label: string; value: number }> = stats
    ? [
        { label: 'Missions', value: stats.missions },
        { label: 'Nights Out', value: stats.nights_out },
        { label: 'Steaks', value: stats.steaks },
        { label: 'Countries', value: stats.countries_visited },
        { label: 'People', value: stats.people_met },
      ]
    : []

  return (
    <>
      <TopBar title={gent.display_name} back />
      <PageWrapper scrollable>
        <div className="flex flex-col pb-16">

          {/* ── Hero ── */}
          {gent.portrait_url ? (
            <div className="relative mb-5">
              <img
                src={gent.portrait_url}
                alt={gent.display_name}
                className="h-56 w-full object-cover rounded-2xl"
                style={gent.retired ? { filter: 'saturate(0.3) brightness(0.9)' } : undefined}
              />
              {/* gradient overlay */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-obsidian/80 via-obsidian/20 to-transparent" />
              {/* avatar + name anchored to bottom */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end gap-3">
                <div className="ring-2 ring-gold/40 rounded-full shrink-0">
                  <Avatar src={gent.avatar_url} name={gent.display_name} size="md" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="font-display text-2xl text-ivory leading-tight truncate">
                    {gent.full_alias}
                  </h1>
                  <span className="text-gold text-sm font-body">{gent.display_name}</span>
                  {signature && (
                    <span className="text-ivory-dim text-xs font-body italic mt-0.5">{signature}</span>
                  )}
                  {gent.status && (
                    <span className="mt-1 self-start text-xs text-ivory-muted bg-white/8 rounded-full px-3 py-1 truncate max-w-full">
                      {gent.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 pt-4 pb-5">
              <Avatar src={gent.avatar_url} name={gent.display_name} size="xl" />
              <h1 className="font-display text-2xl text-ivory text-center leading-tight">
                {gent.full_alias}
              </h1>
              <span className="text-gold text-sm font-body">{gent.display_name}</span>
              {signature && (
                <span className="text-ivory-dim text-xs font-body italic">{signature}</span>
              )}
              {gent.status && (
                <span className="text-xs text-ivory-muted bg-white/8 rounded-full px-3 py-1">
                  {gent.status}
                </span>
              )}
            </div>
          )}

          {/* ── Retired operative stamp ── */}
          {gent.retired && (
            <div className="flex justify-center my-4">
              <span className="text-xs font-body text-red-400/80 uppercase tracking-[0.25em] border-2 border-red-400/40 px-4 py-1.5 rounded -rotate-3"
                style={{ fontFamily: 'var(--font-body)' }}>
                Operative Status: Retired
              </span>
            </div>
          )}

          {/* ── Stats row ── */}
          {statChips.length > 0 && (
            <div className="mb-6">
              <p className="text-[10px] font-body text-ivory-dim uppercase tracking-widest mb-2">
                {gent.retired ? 'Legacy Stats' : 'Stats'}
              </p>
            <div className="flex gap-3 overflow-x-auto pb-1 px-0.5 scrollbar-none">
              {statChips.map((chip) => (
                <div
                  key={chip.label}
                  className="bg-slate-mid rounded-xl px-4 py-3 text-center shrink-0 min-w-[72px]"
                >
                  <p className="font-display text-xl text-ivory leading-none">{chip.value}</p>
                  <p className="text-[10px] uppercase tracking-widest text-ivory-dim font-body mt-0.5">
                    {chip.label}
                  </p>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* ── Honours ── */}
          {(achievements.length > 0 || thresholdKeys.length > 0) && (
            <div className="mb-6">
              <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-2">
                Honours
              </p>
              <div className="flex flex-wrap gap-2">
                {achievements.map((a) => (
                  <span
                    key={a.type}
                    title={a.description}
                    className="inline-flex items-center gap-1.5 bg-gold/8 border border-gold/20 rounded-full px-3 py-1 text-xs text-gold font-body"
                  >
                    <span aria-hidden="true">{ACHIEVEMENT_ICONS[a.type] ?? '&#9733;'}</span>
                    {a.name}
                  </span>
                ))}
                {thresholdKeys.map((key) => {
                  const def = THRESHOLD_DEFINITIONS.find((d) => d.reward_key === key)
                  if (!def) return null
                  return (
                    <span
                      key={key}
                      title={def.description}
                      className="inline-flex items-center gap-1.5 bg-gold/8 border border-gold/20 rounded-full px-3 py-1 text-xs text-gold font-body"
                    >
                      <span aria-hidden="true">&#9830;</span>
                      {def.name}
                    </span>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Bio ── */}
          {gent.bio && (
            <div className="mb-6">
              <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-2">
                About
              </p>
              <p className="text-sm text-ivory-muted font-body leading-relaxed">{gent.bio}</p>
            </div>
          )}

          {/* ── Retirement citation ── */}
          {gent.retired && (
            <div className="mt-6 mb-6 bg-white/3 border-l-2 border-gold/40 rounded-r-lg px-4 py-3">
              <p className="text-[10px] font-body text-gold/50 uppercase tracking-widest mb-2">Retirement Citation</p>
              <p className="text-sm font-display text-ivory/80 italic leading-relaxed">
                A founding member of The Gents. Though no longer among the active operatives, his presence shaped the early chronicles. The fourth chair remains.
              </p>
            </div>
          )}

          {/* ── Honourable Discharge certificate ── */}
          {gent.retired && (
            <div className="mb-6">
              <HonourableDischargeCertificate
                gentName={gent.display_name}
                alias={gent.full_alias}
              />
            </div>
          )}

          {/* ── Recent entries ── */}
          {entries.length > 0 && (
            <div>
              <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
                Chronicle
              </p>
              <div className="flex flex-col gap-2">
                {entries.map((entry) => (
                  <Link
                    key={entry.id}
                    to={`/chronicle/${entry.id}`}
                    className="flex items-center gap-3 bg-slate-mid rounded-xl px-4 py-3 border border-white/6 hover:border-white/12 transition-colors"
                  >
                    <div className="shrink-0">
                      <Badge type={entry.type} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ivory font-body truncate">{entry.title}</p>
                      <p className="text-xs text-ivory-dim font-body mt-0.5">
                        {formatDate(entry.date)}
                      </p>
                    </div>
                    <span className="text-ivory-dim text-base font-body shrink-0 leading-none">
                      ›
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </PageWrapper>
    </>
  )
}
