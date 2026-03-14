import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/animations'

interface PS5RivalryProps {
  h2h: Record<string, Record<string, number>>
}

type Pairing = {
  a: string
  b: string
  labelA: string
  labelB: string
}

const PAIRINGS: Pairing[] = [
  { a: 'keys', b: 'bass', labelA: 'Keys', labelB: 'Bass' },
  { a: 'keys', b: 'lorekeeper', labelA: 'Keys', labelB: 'Lorekeeper' },
  { a: 'bass', b: 'lorekeeper', labelA: 'Bass', labelB: 'Lorekeeper' },
]

interface RivalryCardProps {
  pairing: Pairing
  h2h: Record<string, Record<string, number>>
}

function RivalryCard({ pairing, h2h }: RivalryCardProps) {
  const { a, b, labelA, labelB } = pairing
  const winsA = h2h[a]?.[b] ?? 0
  const winsB = h2h[b]?.[a] ?? 0
  const total = winsA + winsB

  const pctA = total > 0 ? (winsA / total) * 100 : 50
  const pctB = total > 0 ? (winsB / total) * 100 : 50

  const leaderIsA = winsA > winsB
  const tied = winsA === winsB

  return (
    <motion.div
      variants={staggerItem}
      className="bg-slate-mid rounded-xl p-5 shadow-card"
    >
      {/* Labels + scores */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col items-start gap-0.5">
          <span className={`font-body text-sm font-semibold ${!tied && leaderIsA ? 'text-gold' : 'text-ivory-muted'}`}>
            {labelA}
          </span>
          <span className={`font-mono text-2xl font-bold leading-none ${!tied && leaderIsA ? 'text-gold' : 'text-ivory'}`}>
            {winsA}
          </span>
        </div>

        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] text-ivory-dim uppercase tracking-widest font-body font-semibold">
            VS
          </span>
          {tied && (
            <span className="text-[10px] text-ivory-dim font-body">Tied</span>
          )}
        </div>

        <div className="flex flex-col items-end gap-0.5">
          <span className={`font-body text-sm font-semibold ${!tied && !leaderIsA ? 'text-gold' : 'text-ivory-muted'}`}>
            {labelB}
          </span>
          <span className={`font-mono text-2xl font-bold leading-none ${!tied && !leaderIsA ? 'text-gold' : 'text-ivory'}`}>
            {winsB}
          </span>
        </div>
      </div>

      {/* Dominance bar */}
      <div className="h-1.5 rounded-full overflow-hidden bg-white/10 flex">
        <motion.div
          className={`h-full rounded-l-full ${!tied && leaderIsA ? 'bg-gold' : 'bg-ivory-dim'}`}
          style={{ width: `${pctA}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${pctA}%` }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        />
        <motion.div
          className={`h-full rounded-r-full ${!tied && !leaderIsA ? 'bg-gold' : 'bg-ivory-dim'}`}
          style={{ width: `${pctB}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${pctB}%` }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 }}
        />
      </div>

      {/* Total */}
      <p className="text-[10px] text-ivory-dim font-body mt-2 text-center">
        {total} {total === 1 ? 'match' : 'matches'} played
      </p>
    </motion.div>
  )
}

export function PS5Rivalry({ h2h }: PS5RivalryProps) {
  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        The Rivalry
      </p>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-3"
      >
        {PAIRINGS.map((pairing) => (
          <RivalryCard key={`${pairing.a}-${pairing.b}`} pairing={pairing} h2h={h2h} />
        ))}
      </motion.div>
    </section>
  )
}
