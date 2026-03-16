import { useState, useEffect } from 'react'
import { Trophy, Lock } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import { fetchEarnedAchievements, ACHIEVEMENT_DEFINITIONS } from '@/data/achievements'
import type { EarnedAchievement } from '@/data/achievements'
import { formatDate } from '@/lib/utils'

export function AchievementList() {
  const { gent } = useAuthStore()
  const [earned, setEarned] = useState<EarnedAchievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!gent) return
    fetchEarnedAchievements(gent.id)
      .then(setEarned)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [gent])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="md" />
      </div>
    )
  }

  const earnedTypes = new Set(earned.map(a => a.type))
  const locked = ACHIEVEMENT_DEFINITIONS.filter(d => !earnedTypes.has(d.type))

  if (earned.length === 0 && locked.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-ivory-dim text-sm font-body">No achievements available yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {earned.map(a => (
        <div
          key={a.type}
          className="flex items-center gap-3 border border-gold/20 bg-gold/5 rounded-xl px-4 py-3"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gold/10 shrink-0">
            <Trophy size={18} className="text-gold" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ivory font-body font-medium">{a.name}</p>
            <p className="text-xs text-ivory-dim">{a.description}</p>
          </div>
          <span className="font-mono text-[10px] text-gold-muted shrink-0">
            {formatDate(a.earned_at)}
          </span>
        </div>
      ))}

      {locked.map(d => (
        <div
          key={d.type}
          className="flex items-center gap-3 border border-white/5 rounded-xl px-4 py-3 opacity-40"
        >
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 shrink-0">
            <Lock size={18} className="text-ivory-dim" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-ivory-dim font-body font-medium">{d.name}</p>
            <p className="text-xs text-ivory-dim">???</p>
          </div>
        </div>
      ))}
    </div>
  )
}
