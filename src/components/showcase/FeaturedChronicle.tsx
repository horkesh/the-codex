import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'
import { formatDate } from '@/lib/utils'
import { getOneliner } from '@/export/templates/shared/utils'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import type { EntryWithParticipants } from '@/types/app'

interface FeaturedChronicleProps {
  entries: EntryWithParticipants[]
}

export function FeaturedChronicle({ entries }: FeaturedChronicleProps) {
  if (entries.length === 0) return null

  return (
    <section className="px-6 py-16" style={{ backgroundColor: '#F5F0E1' }}>
      <p className="text-[10px] font-body tracking-[0.3em] uppercase text-[#8B7355] text-center mb-8">
        From the Chronicle
      </p>

      <div className="flex flex-col gap-5 max-w-lg mx-auto">
        {entries.map(entry => {
          const typeMeta = ENTRY_TYPE_META[entry.type]
          const oneliner = getOneliner(entry)
          const location = [entry.city, entry.country].filter(Boolean).join(', ') || entry.location

          return (
            <motion.article
              key={entry.id}
              variants={fadeUp}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true }}
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: '#FDFBF6',
                border: '1px solid rgba(139,115,85,0.15)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
              }}
            >
              {/* Cover photo — polaroid style */}
              {entry.cover_image_url && (
                <div className="px-4 pt-4">
                  <div
                    style={{
                      background: '#fff',
                      padding: '8px 8px 28px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                      transform: 'rotate(-0.5deg)',
                    }}
                  >
                    <img
                      src={entry.cover_image_url}
                      alt=""
                      className="w-full aspect-[16/10] object-cover block"
                      draggable={false}
                    />
                  </div>
                </div>
              )}

              {/* Card body */}
              <div className="px-5 py-4">
                {/* Type badge */}
                {typeMeta && (
                  <span
                    className="text-[9px] font-body tracking-[0.25em] uppercase font-semibold"
                    style={{ color: '#8B7355' }}
                  >
                    {typeMeta.label}
                  </span>
                )}

                {/* Title */}
                <h3
                  className="font-display text-xl font-bold mt-1 leading-tight"
                  style={{ color: '#1B3A5C' }}
                >
                  {entry.title}
                </h3>

                {/* Location + date */}
                <div className="flex items-center gap-2 mt-1.5">
                  {location && (
                    <span className="text-xs font-body" style={{ color: '#5A6B7A' }}>{location}</span>
                  )}
                  <span className="text-xs font-body" style={{ color: '#8B7355' }}>{formatDate(entry.date)}</span>
                </div>

                {/* Oneliner */}
                {oneliner && (
                  <p
                    className="mt-3 font-display italic text-sm leading-relaxed"
                    style={{ color: '#5A6B7A' }}
                  >
                    &ldquo;{oneliner}&rdquo;
                  </p>
                )}

                {/* Participants */}
                {entry.participants.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {entry.participants.map(p => (
                      <div key={p.id} className="w-7 h-7 rounded-full overflow-hidden border border-[#d4cfc4]">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt={p.display_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold" style={{ color: '#1B3A5C', backgroundColor: '#d4cfc4' }}>
                            {p.display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.article>
          )
        })}
      </div>
    </section>
  )
}
