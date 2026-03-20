import type { MissionVerdict as MissionVerdictType } from '@/types/app'

interface Props {
  verdict: MissionVerdictType
}

export function MissionVerdict({ verdict }: Props) {
  const items = [
    { label: 'Best Meal', value: verdict.best_meal, icon: 'M' },
    { label: 'Best Venue', value: verdict.best_venue, icon: 'V' },
    { label: 'Most Chaotic Moment', value: verdict.most_chaotic_moment, icon: 'C' },
    { label: 'MVP Scene', value: verdict.mvp_scene, icon: 'S' },
    { label: 'Would Return?', value: verdict.would_return, icon: 'R' },
  ].filter(i => i.value)

  if (items.length === 0) return null

  return (
    <div className="space-y-3">
      <h3 className="text-[10px] font-body uppercase tracking-[0.2em] text-gold/40">
        The Verdict
      </h3>
      <div className="space-y-2">
        {items.map(item => (
          <div
            key={item.label}
            className="flex items-start gap-3 p-3 bg-ivory/[0.03] border border-ivory/5 rounded-lg"
          >
            <div className="w-7 h-7 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
              <span className="text-[10px] font-display text-gold">{item.icon}</span>
            </div>
            <div>
              <p className="text-[10px] font-body uppercase tracking-widest text-ivory/30 mb-0.5">
                {item.label}
              </p>
              <p className="text-ivory/70 font-body text-xs leading-relaxed">
                {item.value}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
