import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { formatDate, daysUntil } from '@/lib/utils'
import { MapPin, Calendar } from 'lucide-react'
import type { Entry, GatheringMetadata } from '@/types/app'

interface UpcomingItem {
  id: string
  type: 'gathering' | 'event'
  title: string
  venue: string | null
  city: string | null
  date: string
}

interface UpcomingShowcaseProps {
  gatherings: Entry[]
  prospects: Array<{ id: string; event_name: string | null; venue_name: string | null; city: string | null; event_date: string | null }>
}

export function UpcomingShowcase({ gatherings, prospects }: UpcomingShowcaseProps) {
  const items: UpcomingItem[] = []

  for (const g of gatherings) {
    const meta = (g.metadata ?? {}) as unknown as GatheringMetadata
    items.push({
      id: `g-${g.id}`,
      type: 'gathering',
      title: g.title,
      venue: meta.venue || meta.location || null,
      city: g.city || null,
      date: meta.event_date || g.date,
    })
  }

  for (const p of prospects) {
    if (!p.event_date) continue
    items.push({
      id: `p-${p.id}`,
      type: 'event',
      title: p.event_name || p.venue_name || 'Upcoming Event',
      venue: p.venue_name && p.event_name ? p.venue_name : null,
      city: p.city,
      date: p.event_date,
    })
  }

  items.sort((a, b) => a.date.localeCompare(b.date))
  const upcoming = items.filter(i => daysUntil(i.date) >= 0)

  if (upcoming.length === 0) return null

  return (
    <section className="px-6 py-16" style={{ backgroundColor: '#0D0B0F' }}>
      <p className="text-[10px] font-body tracking-[0.3em] uppercase text-center mb-2" style={{ color: '#C9A84C' }}>
        What's Next
      </p>
      <p className="text-xs font-body text-center mb-10" style={{ color: '#8C8680' }}>
        Upcoming gatherings and events
      </p>

      <div className="flex flex-col gap-4 max-w-lg mx-auto">
        {upcoming.map((item, i) => {
          const days = daysUntil(item.date)
          const countdownLabel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`

          return (
            <motion.div
              key={item.id}
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="rounded-xl px-5 py-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(201,168,76,0.15)',
              }}
            >
              <p className="text-[9px] font-body uppercase tracking-widest mb-2" style={{ color: '#C9A84C' }}>
                {item.type === 'gathering' ? 'Gathering' : 'Scouting'}
              </p>

              <p className="text-lg font-display mb-1" style={{ color: '#F0EDE8' }}>
                {item.title}
              </p>

              {(item.venue || item.city) && (
                <p className="text-xs font-body flex items-center gap-1 mb-2" style={{ color: '#8C8680' }}>
                  <MapPin size={10} />
                  {[item.venue, item.city].filter(Boolean).join(' · ')}
                </p>
              )}

              <div className="flex items-center justify-between">
                <p className="text-xs font-body flex items-center gap-1" style={{ color: '#6E6860' }}>
                  <Calendar size={10} />
                  {formatDate(item.date)}
                </p>
                <span className="text-xs font-body font-medium" style={{ color: '#C9A84C' }}>
                  {countdownLabel}
                </span>
              </div>
            </motion.div>
          )
        })}
      </div>
    </section>
  )
}
