import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Flame } from 'lucide-react'
import type { GentAlias } from '@/types/app'

// All gents to show
const GENTS: { alias: GentAlias; label: string }[] = [
  { alias: 'keys', label: 'Keys' },
  { alias: 'bass', label: 'Bass' },
  { alias: 'lorekeeper', label: 'Lorekeeper' },
]

const TYPE_LABELS: Record<string, string> = {
  mission: 'Missions',
  night_out: 'Nights Out',
  steak: 'Steaks',
  playstation: 'PS5 Sessions',
  gathering: 'Gatherings',
  interlude: 'Interludes',
}

interface GentStreak {
  alias: GentAlias
  label: string
  entryType: string
  currentStreak: number
  personalBest: number
}

// Return YYYY-MM string for a date string
function yearMonth(dateStr: string): string {
  return dateStr.slice(0, 7)
}

// Count consecutive months ending at the most recent month with data
function computeStreak(months: string[]): { current: number; best: number } {
  if (months.length === 0) return { current: 0, best: 0 }

  const sorted = [...new Set(months)].sort()

  // Find current streak: count backward from the last month
  const lastMonthWithData = sorted[sorted.length - 1]
  let current = 0
  let cursor = lastMonthWithData

  while (sorted.includes(cursor)) {
    current++
    // Go back one month
    const [y, m] = cursor.split('-').map(Number)
    const prev = m === 1
      ? `${y - 1}-12`
      : `${y}-${String(m - 1).padStart(2, '0')}`
    cursor = prev
  }

  // Find personal best (longest run)
  let best = 0
  let run = 1
  for (let i = 1; i < sorted.length; i++) {
    const [py, pm] = sorted[i - 1].split('-').map(Number)
    const [cy, cm] = sorted[i].split('-').map(Number)
    const isPrevious = (cy * 12 + cm) - (py * 12 + pm) === 1
    if (isPrevious) {
      run++
    } else {
      best = Math.max(best, run)
      run = 1
    }
  }
  best = Math.max(best, run)

  return { current, best }
}

export function StreaksSection() {
  const [streaks, setStreaks] = useState<GentStreak[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        // Fetch entries with their participants — bounded to last 4 years for streak computation
        const cutoff = new Date()
        cutoff.setFullYear(cutoff.getFullYear() - 4)
        const cutoffDate = cutoff.toISOString().split('T')[0]
        const { data, error } = await supabase
          .from('entry_participants')
          .select('gent_id, gents!inner(alias), entries!inner(date, type, status)')
          .in('entries.status', ['published', 'gathering_post'])
          .gte('entries.date', cutoffDate)

        if (error) throw error

        // Build map: gent_id -> type -> months[]
        const byGent: Record<string, Record<string, string[]>> = {}
        const gentAliasByid: Record<string, GentAlias> = {}

        for (const row of (data ?? []) as Array<{
          gent_id: string
          gents: { alias: string }
          entries: { date: string; type: string; status: string }
        }>) {
          const { gent_id, gents, entries: entry } = row
          if (!entry?.date || !entry?.type) continue
          if (!byGent[gent_id]) byGent[gent_id] = {}
          if (!byGent[gent_id][entry.type]) byGent[gent_id][entry.type] = []
          byGent[gent_id][entry.type].push(yearMonth(entry.date))
          gentAliasByid[gent_id] = gents.alias as GentAlias
        }

        const result: GentStreak[] = []

        for (const gentDef of GENTS) {
          // Find gent_id for this alias
          const gid = Object.keys(gentAliasByid).find(id => gentAliasByid[id] === gentDef.alias)
          if (!gid) {
            result.push({ alias: gentDef.alias, label: gentDef.label, entryType: 'mission', currentStreak: 0, personalBest: 0 })
            continue
          }
          const typeMap = byGent[gid] ?? {}

          // Find most frequent type
          let bestType = 'mission'
          let bestCount = 0
          for (const [type, months] of Object.entries(typeMap)) {
            if (months.length > bestCount) {
              bestCount = months.length
              bestType = type
            }
          }

          const { current, best } = computeStreak(typeMap[bestType] ?? [])
          result.push({ alias: gentDef.alias, label: gentDef.label, entryType: bestType, currentStreak: current, personalBest: best })
        }

        setStreaks(result)
      } catch {
        // silent
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading || streaks.every(s => s.currentStreak === 0 && s.personalBest === 0)) return null

  return (
    <div className="mt-6 mb-2">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
        Streaks
      </p>
      <div className="flex flex-col gap-3">
        {streaks.filter(s => s.currentStreak > 0 || s.personalBest > 0).map((s) => (
          <div
            key={s.alias}
            className="flex items-center gap-3 bg-slate-mid rounded-xl px-4 py-3 border border-white/6"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 shrink-0">
              <Flame size={16} className="text-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-sm text-ivory font-body font-medium">{s.label}</span>
                <span className="text-[10px] uppercase tracking-widest text-ivory-dim font-body">
                  {TYPE_LABELS[s.entryType] ?? s.entryType}
                </span>
              </div>
              <p className="text-xs text-ivory-dim font-body mt-0.5">
                Personal best: {s.personalBest} month{s.personalBest !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-display text-2xl text-gold leading-none">{s.currentStreak}</p>
              <p className="text-[10px] uppercase tracking-widest text-ivory-dim font-body mt-0.5">
                month streak
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
