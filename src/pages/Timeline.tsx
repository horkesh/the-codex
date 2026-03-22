import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { ENTRY_TYPE_META, ENTRY_TYPE_IMAGES } from '@/lib/entryTypes'
import { fetchTimelineEntries } from '@/data/entries'
import { formatDate } from '@/lib/utils'
import { staggerContainer, staggerItem } from '@/lib/animations'
import type { EntryType } from '@/types/app'

export default function Timeline() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<Array<{ id: string; type: string; title: string; date: string; cover_image_url: string | null }>>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchTimelineEntries()
      .then(data => { if (!cancelled) setEntries(data) })
      .catch(err => console.error('Timeline:', err))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  // Group by month, newest first
  const groups = useMemo(() => {
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
    const map = new Map<string, typeof entries>()
    for (const e of sorted) {
      const key = e.date.slice(0, 7)
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return [...map.entries()].map(([key, items]) => {
      const [year, month] = key.split('-')
      const label = new Date(+year, +month - 1).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      return { key, label, items }
    })
  }, [entries])

  return (
    <>
      <TopBar title="Timeline" back />
      <SectionNav />

      <PageWrapper padded scrollable>
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center py-20 gap-2">
            <p className="text-sm text-ivory-dim/50 font-body">No entries yet</p>
          </div>
        ) : (
          <div className="relative pb-8 pt-2">
            {/* Golden thread — vertical line */}
            <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-gold/40 via-gold/20 to-transparent" />

            {groups.map((group) => (
              <div key={group.key} className="mb-6">
                {/* Month label */}
                <div className="relative flex items-center gap-3 mb-3">
                  <div className="w-[47px] flex justify-center shrink-0">
                    <div className="w-3 h-3 rounded-full bg-gold/60 border-2 border-obsidian" />
                  </div>
                  <p className="text-[10px] font-body text-gold uppercase tracking-[0.2em]">{group.label}</p>
                </div>

                {/* Entries */}
                <motion.div
                  variants={staggerContainer}
                  initial={false}
                  whileInView="animate"
                  viewport={{ once: true }}
                  className="flex flex-col gap-2"
                >
                  {group.items.map((entry) => {
                    const meta = ENTRY_TYPE_META[entry.type as EntryType]
                    const Icon = meta?.Icon
                    const coverSrc = entry.cover_image_url || ENTRY_TYPE_IMAGES[entry.type as EntryType]

                    return (
                      <motion.button
                        key={entry.id}
                        variants={staggerItem}
                        type="button"
                        onClick={() => navigate(`/chronicle/${entry.id}`)}
                        className="relative flex items-center gap-3 pl-[47px] pr-2 py-2 text-left hover:bg-white/3 rounded-lg transition-colors group"
                      >
                        {/* Thread dot */}
                        <div className="absolute left-[20px] w-[7px] h-[7px] rounded-full bg-white/20 group-hover:bg-gold/50 transition-colors" />

                        {/* Cover thumbnail */}
                        <div className="relative shrink-0">
                          <img
                            src={coverSrc}
                            alt=""
                            className="w-11 h-11 rounded-lg object-cover border border-white/10 group-hover:border-gold/30 transition-colors"
                          />
                          {Icon && (
                            <div
                              className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center border border-white/20"
                              style={{ backgroundColor: meta.borderColor }}
                            >
                              <Icon size={8} className="text-ivory/80" />
                            </div>
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-display text-ivory truncate">{entry.title}</p>
                          <p className="text-[10px] font-body text-ivory-dim/40 mt-0.5">{formatDate(entry.date)}</p>
                        </div>
                      </motion.button>
                    )
                  })}
                </motion.div>
              </div>
            ))}
          </div>
        )}
      </PageWrapper>
    </>
  )
}
