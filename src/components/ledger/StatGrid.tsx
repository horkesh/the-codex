import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'
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

function sum(stats: GentStats[], key: keyof GentStats): number {
  return stats.reduce((acc, s) => acc + (s[key] as number), 0)
}

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

  const totalMissions = sum(stats, 'missions')
  const totalCountries = sum(stats, 'countries_visited')
  const totalPeople = sum(stats, 'people_met')
  const totalNightsOut = sum(stats, 'nights_out')

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
