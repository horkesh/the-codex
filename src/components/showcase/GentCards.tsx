import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import type { Gent, GentStats } from '@/types/app'

const SIGNATURE_DRINKS: Record<string, string> = {
  keys: 'Cocktails',
  bass: 'Beer',
  lorekeeper: 'Beer',
}

const STAT_RULES: Array<{ field: keyof GentStats; threshold: number; label: string }> = [
  { field: 'steaks', threshold: 10, label: 'Connoisseur' },
  { field: 'countries_visited', threshold: 5, label: 'Globetrotter' },
  { field: 'missions', threshold: 8, label: 'Expeditionary' },
  { field: 'nights_out', threshold: 15, label: 'Nighthawk' },
]

function deriveLabel(stats: GentStats): string {
  for (const rule of STAT_RULES) {
    if ((stats[rule.field] as number) >= rule.threshold) return rule.label
  }
  return 'Chronicle Member'
}

interface GentCardsProps {
  gents: Gent[]
  stats: GentStats[]
}

export function GentCards({ gents, stats }: GentCardsProps) {
  const statsMap = Object.fromEntries(stats.map(s => [s.gent_id, s]))

  return (
    <section className="bg-obsidian px-6 pb-16">
      <p className="text-[10px] font-body tracking-[0.3em] uppercase text-gold/50 text-center mb-8">
        The Gents
      </p>
      <div className="flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory max-w-lg mx-auto">
        {gents.map(g => {
          const s = statsMap[g.id]
          const drink = SIGNATURE_DRINKS[g.alias] ?? null
          const label = s ? deriveLabel(s) : null
          return (
            <motion.div
              key={g.id}
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="min-w-[200px] snap-center flex flex-col items-center gap-3 bg-white/[0.03] border border-white/[0.06] rounded-xl px-5 py-6"
            >
              {/* Portrait */}
              <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gold/20 bg-slate-dark">
                {(g.portrait_url ?? g.avatar_url) ? (
                  <img src={(g.portrait_url ?? g.avatar_url)!} alt={g.display_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-display text-gold/50">
                    {g.display_name.charAt(0)}
                  </div>
                )}
              </div>
              {/* Name + alias */}
              <div className="text-center">
                <p className="font-display text-lg text-ivory">{g.display_name}</p>
                <p className="text-[10px] font-body tracking-[0.2em] uppercase text-gold/60 mt-0.5">{g.full_alias}</p>
              </div>
              {/* Stats */}
              {s && (
                <div className="flex gap-4 text-center mt-1">
                  <div>
                    <p className="font-display text-lg text-ivory">{s.missions}</p>
                    <p className="text-[9px] font-body tracking-widest uppercase text-ivory-dim">Missions</p>
                  </div>
                  <div>
                    <p className="font-display text-lg text-ivory">{s.countries_visited}</p>
                    <p className="text-[9px] font-body tracking-widest uppercase text-ivory-dim">Countries</p>
                  </div>
                </div>
              )}
              {/* Signature drink + label */}
              <div className="flex flex-col items-center gap-1 mt-1">
                {drink && (
                  <span className="text-[9px] font-body tracking-widest uppercase text-gold/50">{drink}</span>
                )}
                {label && (
                  <span className="text-[9px] font-body tracking-[0.2em] uppercase border border-gold/30 text-gold/70 px-2.5 py-0.5 rounded-full">{label}</span>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
