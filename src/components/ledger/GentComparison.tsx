import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { GENT_LABELS, GENT_ALIASES } from '@/lib/gents'
import { COMPARISON_STAT_ROWS, computeLeaderSummary } from '@/data/stats'
import type { GentStats, GentAlias } from '@/types/app'

interface Props {
  stats: GentStats[]
}

export function GentComparison({ stats }: Props) {
  const navigate = useNavigate()
  const [aliasA, setAliasA] = useState<GentAlias>('keys')
  const [aliasB, setAliasB] = useState<GentAlias>('bass')

  const statA = stats.find((s) => s.alias === aliasA)
  const statB = stats.find((s) => s.alias === aliasB)

  if (!statA || !statB) return null

  const leaderLabel = computeLeaderSummary(statA, statB)

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        Intelligence
      </p>

      {/* Gent pickers */}
      <div className="flex items-center gap-3 mb-4">
        <GentPicker value={aliasA} exclude={aliasB} onChange={setAliasA} />
        <span className="text-[10px] text-ivory-dim font-body font-semibold uppercase tracking-widest shrink-0">VS</span>
        <GentPicker value={aliasB} exclude={aliasA} onChange={setAliasB} />
      </div>

      {/* Stat rows */}
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-3 bg-slate-mid rounded-xl p-5 shadow-card mb-3"
      >
        {COMPARISON_STAT_ROWS.map((row) => {
          const a = statA[row.field] as number
          const b = statB[row.field] as number
          const total = a + b
          const pctA = total > 0 ? (a / total) * 100 : 50
          const leaderIsA = a > b
          const tied = a === b

          return (
            <motion.div key={row.field} variants={staggerItem} className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className={`font-mono text-sm font-bold ${!tied && leaderIsA ? 'text-gold' : 'text-ivory'}`}>
                  {a}
                </span>
                <span className="text-[10px] text-ivory-dim font-body uppercase tracking-widest">
                  {row.label}
                </span>
                <span className={`font-mono text-sm font-bold ${!tied && !leaderIsA ? 'text-gold' : 'text-ivory'}`}>
                  {b}
                </span>
              </div>
              <div className="h-1 rounded-full overflow-hidden bg-white/10 flex">
                <motion.div
                  className={`h-full rounded-l-full ${!tied && leaderIsA ? 'bg-gold' : 'bg-ivory-dim/40'}`}
                  style={{ width: `${pctA}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pctA}%` }}
                  transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.05 }}
                />
                <motion.div
                  className={`h-full rounded-r-full ${!tied && !leaderIsA ? 'bg-gold' : 'bg-ivory-dim/40'}`}
                  style={{ width: `${100 - pctA}%` }}
                  initial={{ width: 0 }}
                  animate={{ width: `${100 - pctA}%` }}
                  transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.05 }}
                />
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Leader summary */}
      <p className="text-xs text-ivory-dim font-body text-center mb-3">{leaderLabel}</p>

      {/* Export button */}
      <button
        type="button"
        onClick={() => navigate(`/studio?comparison=${aliasA}:${aliasB}`)}
        className="w-full py-2.5 rounded-lg border border-white/10 text-xs font-body text-ivory-muted hover:text-ivory hover:border-gold/30 transition-colors"
      >
        Export Rivalry Card
      </button>
    </section>
  )
}

// ─── Gent picker — 2-option pill switcher ────────────────────────────────────

function GentPicker({
  value,
  exclude,
  onChange,
}: {
  value: GentAlias
  exclude: GentAlias
  onChange: (a: GentAlias) => void
}) {
  const options = GENT_ALIASES.filter((a) => a !== exclude)
  return (
    <div className="flex rounded-lg overflow-hidden border border-white/10 flex-1">
      {options.map((alias) => (
        <button
          key={alias}
          type="button"
          onClick={() => onChange(alias)}
          className={[
            'flex-1 py-1.5 text-xs font-body transition-colors',
            value === alias ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory',
          ].join(' ')}
        >
          {GENT_LABELS[alias]}
        </button>
      ))}
    </div>
  )
}
