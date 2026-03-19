import { motion } from 'framer-motion'
import { Clock, Users, Zap, Wine, MessageCircle } from 'lucide-react'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations'
import { formatDate } from '@/lib/utils'
import { PhotoGrid } from '@/components/chronicle/PhotoGrid'
import type { EntryWithParticipants, Gent, ToastSessionFull } from '@/types/app'

interface ToastLayoutProps {
  entry: EntryWithParticipants
  session: ToastSessionFull | null
  people: Array<{ id: string; name: string; photo_url: string | null }>
  photos: Array<{ id: string; url: string; sort_order: number }>
  isCreator: boolean
  loreSlot?: React.ReactNode
  controlsSlot?: React.ReactNode
}

function formatDuration(seconds: number): string {
  const mins = Math.round(seconds / 60)
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  const rem = mins % 60
  return rem ? `${hrs}h ${rem}m` : `${hrs}h`
}

const VIBE_COLORS: Record<string, string> = {
  intimate: '#C9A84C',
  electric: '#FFD700',
  chaotic: '#FF6B35',
  chill: '#6B8E9B',
  wild: '#FF4757',
}

function VibeTimeline({ timeline }: { timeline: Array<{ act: number; vibe: string }> }) {
  if (!timeline.length) return null
  return (
    <div className="flex rounded-full overflow-hidden h-2 w-full">
      {timeline.map((v, i) => (
        <div
          key={i}
          className="flex-1"
          style={{ backgroundColor: VIBE_COLORS[v.vibe.toLowerCase()] || VIBE_COLORS.intimate }}
          title={`Act ${v.act}: ${v.vibe}`}
        />
      ))}
    </div>
  )
}

export function ToastLayout({ entry, session, people, photos, isCreator: _isCreator, loreSlot, controlsSlot }: ToastLayoutProps) {
  if (!session) return null

  const { cocktails, confessions, wrapped } = session
  const topConfessions = confessions.slice(0, 3)
  const meta = entry.metadata as Record<string, unknown>

  // Map photos to PhotoGrid format (needs caption field)
  const gridPhotos = photos.map(p => ({ id: p.id, url: p.url, caption: null }))

  return (
    <motion.div variants={fadeIn} initial="initial" animate="animate" className="space-y-6 pb-20">
      {/* Session Header */}
      <section className="bg-slate-dark rounded-2xl p-5 border border-white/5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-display text-ivory font-bold">{entry.title}</h1>
            <p className="text-ivory-dim text-sm font-body mt-1">
              {entry.location && `${entry.location} · `}{formatDate(entry.date)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-gold text-xs font-body">
            <span className="flex items-center gap-1">
              <Clock size={14} />
              {formatDuration(session.session.duration_seconds)}
            </span>
            <span className="flex items-center gap-1">
              <Users size={14} />
              {session.session.guest_count + (entry.participants?.length || 0)}
            </span>
          </div>
        </div>

        {/* Participant avatars */}
        <div className="flex items-center gap-2 mt-3">
          {entry.participants?.map((g: Gent) => (
            <div key={g.id}>
              {g.avatar_url ? (
                <img src={g.avatar_url} alt={g.alias || g.display_name} className="w-8 h-8 rounded-full object-cover border border-gold/30" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-xs font-bold">
                  {(g.alias || g.display_name).charAt(0)}
                </div>
              )}
            </div>
          ))}
          {people.map((p) => (
            <div key={p.id}>
              {p.photo_url ? (
                <img src={p.photo_url} alt={p.name} className="w-8 h-8 rounded-full object-cover border border-white/10" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-ivory-dim text-xs font-bold">
                  {p.name.charAt(0)}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Vibe timeline */}
        <div className="mt-4">
          <VibeTimeline timeline={session.session.vibe_timeline} />
          {meta.vibe_summary ? (
            <p className="text-ivory-dim text-xs font-body mt-1.5 tracking-wide">
              {String(meta.vibe_summary)}
            </p>
          ) : null}
        </div>
      </section>

      {/* Act Carousel */}
      {session.session.vibe_timeline.length > 0 && (
        <section>
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
            Acts
          </p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory">
            {session.session.vibe_timeline.map((v, i) => {
              const actCocktail = cocktails.find(c => c.act === v.act)
              const actConfession = confessions.find(c => c.act === v.act)

              return (
                <div key={i} className="snap-start shrink-0 w-64 bg-slate-dark rounded-xl p-4 border border-white/5">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-ivory font-display font-bold text-sm">Act {v.act}</p>
                    <span
                      className="text-xs font-body px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: (VIBE_COLORS[v.vibe.toLowerCase()] || VIBE_COLORS.intimate) + '30',
                        color: VIBE_COLORS[v.vibe.toLowerCase()] || VIBE_COLORS.intimate,
                      }}
                    >
                      {v.vibe}
                    </span>
                  </div>
                  {actCocktail && (
                    <p className="text-ivory-dim text-xs font-body line-clamp-2">
                      Cocktail: {actCocktail.name}
                    </p>
                  )}
                  {actConfession && !actCocktail && (
                    <p className="text-ivory-dim text-xs font-body italic line-clamp-2">
                      &ldquo;{actConfession.prompt}&rdquo;
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Cocktail Gallery */}
      {cocktails.length > 0 && (
        <section>
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3 flex items-center gap-2">
            <Wine size={14} /> Cocktails
          </p>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
          >
            {cocktails.map((c) => (
              <motion.div
                key={c.id}
                variants={staggerItem}
                className="snap-start shrink-0 w-56 bg-slate-dark rounded-xl border border-gold/20 overflow-hidden"
              >
                {c.image_url && (
                  <img src={c.image_url} alt={c.name} className="w-full h-32 object-cover" />
                )}
                <div className="p-3">
                  <p className="text-ivory font-display font-bold text-sm">{c.name}</p>
                  {c.story && (
                    <p className="text-ivory-dim text-xs font-body mt-1 line-clamp-3">{c.story}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* The Confessions */}
      {topConfessions.length > 0 && (
        <section>
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3 flex items-center gap-2">
            <MessageCircle size={14} /> Confessions
          </p>
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
            {topConfessions.map((c) => (
              <motion.div
                key={c.id}
                variants={staggerItem}
                className="bg-slate-dark rounded-xl p-4 border border-white/5"
              >
                <p className="text-ivory font-display italic text-sm leading-relaxed">&ldquo;{c.prompt}&rdquo;</p>
                {c.ai_commentary && (
                  <p className="text-ivory-dim text-xs font-body mt-2 pl-3 border-l-2 border-gold/30">
                    {c.ai_commentary}
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Wrapped Strip */}
      {wrapped.length > 0 && (
        <section>
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3 flex items-center gap-2">
            <Zap size={14} /> Session Wrapped
          </p>
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory"
          >
            {wrapped.map((w) => (
              <motion.div
                key={w.id}
                variants={staggerItem}
                className="snap-start shrink-0 w-44 bg-slate-dark rounded-xl p-4 border border-gold/20 text-center"
              >
                {w.ai_title && (
                  <p className="text-gold font-display font-bold text-sm">{w.ai_title}</p>
                )}
                {w.ai_note && (
                  <p className="text-ivory-dim text-xs font-body mt-2 line-clamp-3">{w.ai_note}</p>
                )}
                <div className="mt-2 text-ivory text-xs font-body">
                  {Object.entries(w.stats).slice(0, 2).map(([k, v]) => (
                    <p key={k} className="text-ivory-dim">
                      {k.replace(/_/g, ' ')}: <span className="text-ivory">{String(v)}</span>
                    </p>
                  ))}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      )}

      {/* Group Snaps */}
      {gridPhotos.length > 0 && (
        <section>
          <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-3">
            Group Snaps
          </p>
          <PhotoGrid photos={gridPhotos} />
        </section>
      )}

      {/* Lore (optional) */}
      {loreSlot}

      {/* Controls */}
      {controlsSlot}
    </motion.div>
  )
}
