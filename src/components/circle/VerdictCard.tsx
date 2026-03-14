import { cn } from '@/lib/utils'
import type { VerdictLabel } from '@/types/app'

interface VerdictCardProps {
  label: VerdictLabel
  score: number
  confidence: number
  vibe: string
  greenFlags: string[]
  watchouts: string[]
}

export function VerdictCard({ label, score, confidence, vibe, greenFlags, watchouts }: VerdictCardProps) {
  const isHighScore = score >= 8.0
  const confidencePct = Math.round(confidence * 100)
  const lowConfidence = confidence < 0.5
  const cautionConfidence = confidence >= 0.5 && confidence < 0.7

  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex flex-col gap-3',
        isHighScore ? 'border-gold/30 bg-gold/5' : 'border-white/10 bg-slate-light/20',
      )}
    >
      {/* Header: label + score */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className={cn('font-display text-lg leading-tight', isHighScore ? 'text-gold' : 'text-ivory')}>
            {label}
          </span>
          <span className="text-xs text-ivory-dim font-body italic">{vibe}</span>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className={cn('font-display text-2xl', isHighScore ? 'text-gold' : 'text-ivory-muted')}>
            {score.toFixed(1)}
          </span>
          <span className="text-[10px] text-ivory-dim font-body">/ 10</span>
        </div>
      </div>

      {/* Confidence */}
      {lowConfidence ? (
        <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-1.5">
          <p className="text-xs text-amber-400 font-body">
            Low confidence ({confidencePct}%) — treat as a rough draft, not a verdict.
          </p>
        </div>
      ) : cautionConfidence ? (
        <div className="rounded-lg bg-amber-500/8 border border-amber-500/15 px-3 py-1.5">
          <p className="text-xs text-amber-400/80 font-body">
            {confidencePct}% confident — review carefully before saving.
          </p>
        </div>
      ) : (
        <span className="self-start rounded-full bg-white/8 px-2.5 py-0.5 text-[10px] font-body text-ivory-muted">
          {confidencePct}% confident
        </span>
      )}

      {/* Disclosure */}
      <p className="text-[10px] text-ivory-dim font-body text-center italic">
        AI verdict only. Review and edit before saving.
      </p>

      {/* Green flags */}
      {greenFlags.length > 0 && (
        <div className="flex flex-col gap-1">
          {greenFlags.map((flag, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-green-400 text-xs mt-0.5">✓</span>
              <span className="text-xs text-ivory-muted font-body">{flag}</span>
            </div>
          ))}
        </div>
      )}

      {/* Watchouts */}
      {watchouts.length > 0 && (
        <div className="flex flex-col gap-1">
          {watchouts.map((w, i) => (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-amber-400 text-xs mt-0.5">·</span>
              <span className="text-xs text-ivory-dim font-body">{w}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
