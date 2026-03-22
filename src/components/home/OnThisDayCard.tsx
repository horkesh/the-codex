import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router'
import { Clock, ChevronRight } from 'lucide-react'
import { fetchOnThisDay } from '@/data/entries'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import type { EntryWithParticipants } from '@/types/app'

export function OnThisDayCard() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOnThisDay()
      .then(setEntries)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading || entries.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="mb-4"
    >
      <div className="bg-gradient-to-br from-gold/8 to-transparent border border-gold/20 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <Clock size={14} className="text-gold" />
          <p className="text-[10px] font-body text-gold uppercase tracking-[0.2em]">On This Day</p>
        </div>

        {/* Entries */}
        <div className="flex flex-col">
          {entries.slice(0, 3).map((entry) => {
            const yearsAgo = new Date().getFullYear() - new Date(entry.date).getFullYear()
            const meta = ENTRY_TYPE_META[entry.type]
            const Icon = meta?.Icon

            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => navigate(`/chronicle/${entry.id}`)}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-white/3 transition-colors text-left"
              >
                {/* Cover thumbnail */}
                <div className="relative shrink-0">
                  {entry.cover_image_url ? (
                    <img
                      src={entry.cover_image_url}
                      alt=""
                      className="w-11 h-11 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-lg bg-white/5 flex items-center justify-center">
                      {Icon && <Icon size={16} className="text-ivory-dim/50" />}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-display text-ivory truncate">{entry.title}</p>
                  <p className="text-[10px] font-body text-ivory-dim/50 mt-0.5">
                    {yearsAgo} {yearsAgo === 1 ? 'year' : 'years'} ago
                    {entry.city ? ` \u00b7 ${entry.city}` : ''}
                  </p>
                </div>

                <ChevronRight size={12} className="text-ivory-dim/30 shrink-0" />
              </button>
            )
          })}
        </div>

        {entries.length > 3 && (
          <p className="text-[9px] text-ivory-dim/40 font-body text-center py-2">
            +{entries.length - 3} more
          </p>
        )}
      </div>
    </motion.div>
  )
}
