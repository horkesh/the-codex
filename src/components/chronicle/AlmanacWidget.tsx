import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { fetchEntries } from '@/data/entries'
import type { EntryWithParticipants } from '@/types/app'

export function AlmanacWidget() {
  const [entry, setEntry] = useState<EntryWithParticipants | null>(null)
  const [yearsAgo, setYearsAgo] = useState(0)

  useEffect(() => {
    fetchEntries().then(entries => {
      const today = new Date()
      const todayMD = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      const thisYear = today.getFullYear()

      const matches = entries.filter(e => {
        const d = new Date(e.date)
        const md = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        return md === todayMD && d.getFullYear() < thisYear
      })

      if (matches.length === 0) return

      // Pick the oldest matching entry (the deepest anniversary)
      const oldest = matches.sort((a, b) => a.date.localeCompare(b.date))[0]
      const years = thisYear - new Date(oldest.date).getFullYear()
      setEntry(oldest)
      setYearsAgo(years)
    }).catch(() => {})
  }, [])

  if (!entry) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-4 mb-3"
    >
      <Link to={`/chronicle/${entry.id}`}>
        <div className="bg-slate-dark border-l-2 border-gold rounded-lg px-4 py-3 flex gap-3 items-start">
          <Clock className="w-4 h-4 text-gold mt-0.5 shrink-0" strokeWidth={1.5} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-[0.25em] uppercase text-gold/70 font-body mb-1">
              On This Day · {yearsAgo} Year{yearsAgo !== 1 ? 's' : ''} Ago
            </p>
            <p className="text-sm font-display text-ivory truncate">{entry.title}</p>
            {entry.city && (
              <p className="text-xs text-ivory-dim mt-0.5 font-body">
                {[entry.city, entry.country].filter(Boolean).join(', ')}
              </p>
            )}
            {entry.lore && (
              <p className="text-xs text-ivory-muted/70 mt-1.5 font-body italic leading-relaxed line-clamp-2">
                {entry.lore}
              </p>
            )}
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
