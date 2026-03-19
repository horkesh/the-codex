import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wine, Camera, MessageCircle } from 'lucide-react'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { fetchAllToastStats } from '@/data/toast'
import { supabase } from '@/lib/supabase'
import type { ToastGentStats } from '@/types/app'

const ROLE_LABELS: Record<string, { label: string; icon: typeof Wine }> = {
  lorekeeper: { label: 'Lorekeeper', icon: Camera },
  keys: { label: 'Keys & Cocktails', icon: Wine },
  bass: { label: 'Beard & Bass', icon: MessageCircle },
}

export function ToastStatsSection() {
  const [stats, setStats] = useState<ToastGentStats[]>([])
  const [loading, setLoading] = useState(true)
  const [topGuests, setTopGuests] = useState<Array<{ id: string; name: string; photo_url: string | null }>>([])

  useEffect(() => {
    fetchAllToastStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const guestIds = stats.map(s => (s as any).top_guest_id).filter(Boolean) as string[]
    if (guestIds.length === 0) return
    const unique = [...new Set(guestIds)]
    supabase
      .from('people')
      .select('id, name, photo_url')
      .in('id', unique)
      .then(({ data }) => { if (data) setTopGuests(data) })
  }, [stats])

  if (loading || stats.length === 0) return null

  const totalSessions = stats.reduce((s, r) => s + r.sessions_hosted, 0)
  const totalCocktails = stats.reduce((s, r) => s + r.cocktails_crafted, 0)
  const totalConfessions = stats.reduce((s, r) => s + r.confessions_drawn, 0)

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        The Toast — Service Record
      </p>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="space-y-3"
      >
        {/* Summary */}
        <motion.div
          variants={staggerItem}
          className="bg-slate-mid rounded-xl p-4 shadow-card grid grid-cols-3 gap-3 text-center"
        >
          <div>
            <p className="text-gold font-display text-xl font-bold">{totalSessions}</p>
            <p className="text-ivory-dim text-xs font-body">Sessions</p>
          </div>
          <div>
            <p className="text-gold font-display text-xl font-bold">{totalCocktails}</p>
            <p className="text-ivory-dim text-xs font-body">Cocktails</p>
          </div>
          <div>
            <p className="text-gold font-display text-xl font-bold">{totalConfessions}</p>
            <p className="text-ivory-dim text-xs font-body">Confessions</p>
          </div>
        </motion.div>

        {/* Per-gent role breakdown */}
        {stats.map((s) => {
          const role = ROLE_LABELS[s.role]
          if (!role) return null
          const Icon = role.icon

          return (
            <motion.div
              key={s.id}
              variants={staggerItem}
              className="bg-slate-mid rounded-xl p-4 shadow-card flex items-center gap-3"
            >
              <Icon size={18} className="text-gold shrink-0" />
              <div className="flex-1">
                <p className="text-ivory font-body text-sm font-semibold">{role.label}</p>
                <p className="text-ivory-dim text-xs font-body">
                  {s.sessions_hosted} sessions
                  {s.role === 'keys' && ` · ${s.cocktails_crafted} cocktails · ${s.vibe_shifts_called} vibe shifts`}
                  {s.role === 'bass' && ` · ${s.confessions_drawn} confessions · ${s.spotlights_given} spotlights`}
                  {s.role === 'lorekeeper' && ` · ${s.photos_taken} photos`}
                </p>
              </div>
            </motion.div>
          )
        })}

        {topGuests.length > 0 && (
          <motion.div variants={staggerItem} className="bg-slate-mid rounded-xl p-4 shadow-card">
            <p className="text-ivory font-body text-sm font-semibold mb-2">Frequent Guests</p>
            <div className="flex gap-3">
              {topGuests.map(g => (
                <div key={g.id} className="flex flex-col items-center gap-1">
                  {g.photo_url ? (
                    <img src={g.photo_url} alt={g.name} className="w-10 h-10 rounded-full object-cover border border-gold/30" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
                      {g.name.charAt(0)}
                    </div>
                  )}
                  <p className="text-ivory-dim text-xs font-body text-center line-clamp-1 w-16">{g.name}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>
    </section>
  )
}
