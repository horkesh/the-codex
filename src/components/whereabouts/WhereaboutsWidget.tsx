import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Radio, X } from 'lucide-react'
import { useWhereaboutsStore } from '@/store/whereabouts'
import { useWhereabouts } from '@/hooks/useWhereabouts'
import { useAuthStore } from '@/store/auth'
import type { GentWhereabouts } from '@/types/app'

function timeAgo(ms: number): string {
  const secs = Math.floor((Date.now() - ms) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  return `${Math.floor(mins / 60)}h ago`
}

export function WhereaboutsWidget() {
  const gent = useAuthStore(s => s.gent)
  const { locations, sharing, shareExpiresAt } = useWhereaboutsStore()
  const { startSharing, stopSharing } = useWhereabouts()
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const activeLocations = Object.values(locations)
  const hasActivity = activeLocations.length > 0 || sharing

  const handleShare = async (hours: 1 | 4 | 24) => {
    setLoading(true)
    setError('')
    setShowShareMenu(false)
    try {
      await startSharing(hours)
    } catch {
      setError('Location access denied.')
    } finally {
      setLoading(false)
    }
  }

  const expiresInHours = shareExpiresAt
    ? Math.max(0, Math.round((shareExpiresAt - Date.now()) / 3_600_000))
    : 0

  return (
    <div className="mx-4 mb-3">
      <div className="bg-slate-dark border border-white/5 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gold" strokeWidth={1.5} />
            <span className="text-xs tracking-[0.2em] uppercase text-ivory-dim font-body">Whereabouts</span>
            {hasActivity && (
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            )}
          </div>
          <div className="flex items-center gap-2">
            {sharing ? (
              <button
                onClick={stopSharing}
                className="flex items-center gap-1.5 text-xs text-gold/70 hover:text-gold transition-colors font-body"
              >
                <X size={12} /> Stop sharing
              </button>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(v => !v)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-ivory-dim hover:text-ivory transition-colors font-body"
                >
                  <Radio size={12} />
                  {loading ? 'Getting location...' : 'Share mine'}
                </button>
                <AnimatePresence>
                  {showShareMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute right-0 top-6 bg-slate-mid border border-white/10 rounded-lg overflow-hidden z-20 shadow-lg"
                    >
                      {([1, 4, 24] as const).map(h => (
                        <button
                          key={h}
                          onClick={() => handleShare(h)}
                          className="block w-full text-left px-4 py-2.5 text-xs text-ivory-muted hover:text-ivory hover:bg-white/5 transition-colors font-body whitespace-nowrap"
                        >
                          Share for {h === 24 ? '24h' : `${h}h`}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {error && <p className="px-4 pb-2 text-xs text-red-400 font-body">{error}</p>}

        {/* My own sharing status */}
        <AnimatePresence>
          {sharing && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 flex items-center gap-3 border-t border-white/5 pt-3">
                <span className="w-2 h-2 rounded-full bg-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ivory font-body">{gent?.display_name}</p>
                  <p className="text-[10px] text-ivory-dim font-body mt-0.5">
                    Sharing · expires in {expiresInHours}h
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Other gents */}
        <AnimatePresence>
          {activeLocations.map((loc: GentWhereabouts) => (
            <motion.div
              key={loc.gent_id}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-3 flex items-center gap-3 border-t border-white/5 pt-3">
                <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ivory font-body">{loc.gent_id}</p>
                  <p className="text-[10px] text-ivory-dim font-body mt-0.5">
                    {loc.neighborhood} · {timeAgo(loc.shared_at)}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
