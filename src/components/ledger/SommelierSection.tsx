import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fetchEntries } from '@/data/entries'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { Spinner } from '@/components/ui/Spinner'

// ─── Types ────────────────────────────────────────────────────────────────────

interface SpiritRecord {
  spirit: string
  count: number
  entries: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Best-effort grouping of spirit names into broad categories. */
function categoriseSpirit(name: string): string {
  const lower = name.toLowerCase()
  if (/whisky|whiskey|bourbon|scotch|rye|single malt|blended malt/.test(lower)) return 'Whisky'
  if (/gin|genever/.test(lower)) return 'Gin'
  if (/rum|rhum|cachaça/.test(lower)) return 'Rum'
  if (/tequila|mezcal/.test(lower)) return 'Agave'
  if (/cognac|armagnac|brandy|calvados/.test(lower)) return 'Brandy'
  if (/vodka/.test(lower)) return 'Vodka'
  if (/champagne|prosecco|cava|wine|port|sherry|sake/.test(lower)) return 'Wine & Sparkling'
  if (/beer|ale|lager|stout|porter/.test(lower)) return 'Beer'
  return 'Other'
}

// ─── Stat chip ────────────────────────────────────────────────────────────────

interface StatChipProps {
  value: string | number
  label: string
}

function StatChip({ value, label }: StatChipProps) {
  return (
    <motion.div
      variants={staggerItem}
      className="flex flex-col items-center justify-center bg-slate-dark rounded-xl px-4 py-4 gap-1 flex-1 min-w-0"
    >
      <span className="font-mono text-2xl text-ivory font-bold leading-none truncate max-w-full">
        {value}
      </span>
      <span className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold text-center leading-tight">
        {label}
      </span>
    </motion.div>
  )
}

// ─── Spirit row ───────────────────────────────────────────────────────────────

interface SpiritRowProps {
  spirit: SpiritRecord
  isTop: boolean
}

function SpiritRow({ spirit, isTop }: SpiritRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isTop && (
          <span className="font-mono text-gold text-xs shrink-0" aria-label="Most logged">
            ★
          </span>
        )}
        <span
          className={[
            'font-body text-sm truncate',
            isTop ? 'text-ivory font-medium' : 'text-ivory-muted',
          ].join(' ')}
        >
          {spirit.spirit}
        </span>
      </div>
      <span className="font-mono text-xs text-ivory-dim shrink-0">
        {spirit.count}x
      </span>
    </div>
  )
}

// ─── Category group ───────────────────────────────────────────────────────────

interface CategoryGroupProps {
  category: string
  spirits: SpiritRecord[]
  topSpirit: string | null
}

function CategoryGroup({ category, spirits, topSpirit }: CategoryGroupProps) {
  return (
    <motion.div variants={staggerItem} className="mb-1">
      {/* Category header */}
      <p className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold pt-4 pb-1 border-b border-white/5">
        {category}
      </p>
      {spirits.map((s) => (
        <SpiritRow key={s.spirit} spirit={s} isTop={s.spirit === topSpirit} />
      ))}
    </motion.div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SommelierSection() {
  const [spirits, setSpirits] = useState<SpiritRecord[]>([])
  const [totalSessions, setTotalSessions] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntries({ type: 'toast' })
      .then((entries) => {
        setTotalSessions(entries.length)

        const spiritMap: Record<string, string[]> = {}
        for (const e of entries) {
          const raw = (e.metadata as Record<string, unknown>)?.spirit
          if (typeof raw === 'string' && raw.trim()) {
            const key = raw.trim()
            if (!spiritMap[key]) spiritMap[key] = []
            spiritMap[key].push(e.id)
          }
          // Also check `dram` field as a fallback
          const dram = (e.metadata as Record<string, unknown>)?.dram
          if (typeof dram === 'string' && dram.trim() && !spiritMap[dram.trim()]) {
            spiritMap[dram.trim()] = [e.id]
          }
        }

        const list: SpiritRecord[] = Object.entries(spiritMap)
          .map(([spirit, ids]) => ({ spirit, count: ids.length, entries: ids }))
          .sort((a, b) => b.count - a.count)

        setSpirits(list)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // ── Derived ────────────────────────────────────────────────────────────────

  const topSpirit = spirits[0] ?? null
  const uniqueCount = spirits.length

  // Group spirits by category
  const grouped: Record<string, SpiritRecord[]> = {}
  for (const s of spirits) {
    const cat = categoriseSpirit(s.spirit)
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  }
  // Sort groups alphabetically, put "Other" last
  const groupKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'Other') return 1
    if (b === 'Other') return -1
    return a.localeCompare(b)
  })

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        The Sommelier
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : totalSessions === 0 ? (
        <p className="text-ivory-dim text-sm font-body text-center py-8">
          No toast entries logged yet.
        </p>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="bg-slate-mid rounded-xl p-5 shadow-card"
        >
          {/* Stat chips */}
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex gap-3 mb-6"
          >
            <StatChip
              value={topSpirit?.spirit ?? '—'}
              label="Most Logged"
            />
            <StatChip value={uniqueCount} label="Unique Spirits" />
            <StatChip value={totalSessions} label="Toast Sessions" />
          </motion.div>

          {/* Spirit list grouped by category */}
          {uniqueCount === 0 ? (
            <p className="text-ivory-dim text-xs font-body text-center py-4">
              No spirits recorded in metadata yet.
            </p>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {groupKeys.map((cat) => (
                <CategoryGroup
                  key={cat}
                  category={cat}
                  spirits={grouped[cat]}
                  topSpirit={topSpirit?.spirit ?? null}
                />
              ))}
            </motion.div>
          )}
        </motion.div>
      )}
    </section>
  )
}
