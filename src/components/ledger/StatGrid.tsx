import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { supabase } from '@/lib/supabase'
import type { GentStats } from '@/types/app'

interface StatGridProps {
  stats: GentStats[]
}

const GENT_LABELS: Record<string, string> = {
  keys: 'Keys',
  bass: 'Bass',
  lorekeeper: 'Lorekeeper',
}

const PER_GENT_ROWS: Array<{ key: keyof GentStats; label: string }> = [
  { key: 'missions', label: 'Missions' },
  { key: 'nights_out', label: 'Nights Out' },
  { key: 'steaks', label: 'Steaks' },
  { key: 'ps5_sessions', label: 'PS5 Sessions' },
  { key: 'toasts', label: 'Toasts' },
  { key: 'gatherings', label: 'Gatherings' },
  { key: 'people_met', label: 'People Met' },
  { key: 'countries_visited', label: 'Countries' },
  { key: 'cities_visited', label: 'Cities' },
  { key: 'stamps_collected', label: 'Stamps' },
]


interface BigStatCardProps {
  value: number
  label: string
}

function BigStatCard({ value, label }: BigStatCardProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="flex flex-col items-center justify-center bg-slate-mid rounded-xl p-5 gap-1 shadow-card"
    >
      <span className="font-display text-4xl text-ivory font-bold leading-none">
        {value.toLocaleString()}
      </span>
      <span className="text-xs text-ivory-dim uppercase tracking-widest font-body font-semibold mt-1">
        {label}
      </span>
    </motion.div>
  )
}

export function StatGrid({ stats }: StatGridProps) {
  if (stats.length === 0) return null

  const [monthlyLeaders, setMonthlyLeaders] = useState<Set<string>>(new Set())

  useEffect(() => {
    const now = new Date()
    const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]

    supabase
      .from('entry_participants')
      .select('gent_id, gents!inner(alias), entries!inner(date, status)')
      .gte('entries.date', monthStart)
      .lte('entries.date', monthEnd)
      .in('entries.status', ['published', 'gathering_post'])
      .then(({ data }) => {
        const counts: Record<string, number> = {}
        for (const row of (data ?? []) as Array<{ gent_id: string; gents: { alias: string }; entries: { date: string } }>) {
          const alias = row.gents?.alias
          if (alias) counts[alias] = (counts[alias] ?? 0) + 1
        }
        const max = Math.max(0, ...Object.values(counts))
        if (max > 0) {
          setMonthlyLeaders(new Set(Object.entries(counts).filter(([, v]) => v === max).map(([k]) => k)))
        }
      }, () => {})
  }, [])

  // Use max (not sum) for group stats — all gents share the same missions/nights out,
  // so summing would double/triple-count shared entries.
  const totalMissions = Math.max(0, ...stats.map(s => s.missions))
  const totalCountries = Math.max(0, ...stats.map(s => s.countries_visited))
  const totalPeople = Math.max(0, ...stats.map(s => s.people_met))
  const totalNightsOut = Math.max(0, ...stats.map(s => s.nights_out))

  return (
    <section className="mb-10">
      {/* Section heading */}
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        By The Numbers
      </p>

      {/* Top aggregate row */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 mb-6"
      >
        <BigStatCard value={totalMissions} label="Missions" />
        <BigStatCard value={totalCountries} label="Countries Visited" />
        <BigStatCard value={totalPeople} label="People in Circle" />
        <BigStatCard value={totalNightsOut} label="Nights Out" />
      </motion.div>

      {/* Per-gent breakdown table */}
      <div className="bg-slate-mid rounded-xl overflow-hidden shadow-card">
        {/* Table header */}
        <div className="grid grid-cols-4 border-b border-white/5 px-4 py-3">
          <span className="text-xs text-ivory-dim font-body font-semibold uppercase tracking-wider">Stat</span>
          {stats.map((s) => (
            <span
              key={s.alias}
              className="text-xs text-gold font-body font-semibold uppercase tracking-wider text-center"
            >
              {GENT_LABELS[s.alias] ?? s.alias}
              {monthlyLeaders.has(s.alias) && (
                <span className="text-gold text-xs" title="Monthly leader" aria-label="Monthly leader"> 👑</span>
              )}
            </span>
          ))}
        </div>

        {/* Rows */}
        {PER_GENT_ROWS.map((row, i) => (
          <div
            key={row.key}
            className={`grid grid-cols-4 px-4 py-3 ${i % 2 === 0 ? 'bg-white/[0.02]' : ''}`}
          >
            <span className="text-xs text-ivory-muted font-body">{row.label}</span>
            {stats.map((s) => (
              <span
                key={s.alias}
                className="font-mono text-sm text-ivory text-center"
              >
                {(s[row.key] as number).toLocaleString()}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
