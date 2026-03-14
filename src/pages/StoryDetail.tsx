import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import { MapPin, BarChart3, RefreshCw, Camera } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner } from '@/components/ui'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { fetchStory, updateStory } from '@/data/stories'
import { fetchEntries } from '@/data/entries'
import { generateStoryArc } from '@/ai/storyArc'
import { useUIStore } from '@/store/ui'
import { cn, formatDate } from '@/lib/utils'
import type { Story, Entry } from '@/types/app'

// ─── Type config ──────────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  mission: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  night_out: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  steak: 'bg-red-500/20 text-red-300 border-red-500/30',
  playstation: 'bg-green-500/20 text-green-300 border-green-500/30',
  toast: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  gathering: 'bg-gold/20 text-gold border-gold/30',
  interlude: 'bg-slate-light text-ivory-dim border-white/10',
}

const TYPE_LABELS: Record<string, string> = {
  mission: 'Mission',
  night_out: 'Night Out',
  steak: 'Steak',
  playstation: 'PlayStation',
  toast: 'Toast',
  gathering: 'Gathering',
  interlude: 'Interlude',
}

// ─── Section divider ──────────────────────────────────────────────────────────

function SectionLabel({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 my-5">
      <div className="flex-1 h-px bg-white/8" />
      <div className="flex items-center gap-1.5 shrink-0">
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-ivory-dim font-body">{label}</span>
      </div>
      <div className="flex-1 h-px bg-white/8" />
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StoryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useUIStore()

  const [story, setStory] = useState<Story | null>(null)
  const [linkedEntries, setLinkedEntries] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  // Load story + linked entries
  useEffect(() => {
    if (!id) return
    let cancelled = false

    const load = async () => {
      try {
        const s = await fetchStory(id)
        if (!s) { setNotFound(true); return }
        if (cancelled) return
        setStory(s)

        if (s.entry_ids.length > 0) {
          const all = await fetchEntries()
          if (!cancelled) {
            const linked = all
              .filter((e) => s.entry_ids.includes(e.id))
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            setLinkedEntries(linked)
          }
        }
      } catch {
        if (!cancelled) addToast('Failed to load story', 'error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [id])

  // ── Derived stats ──
  const dates = linkedEntries.map((e) => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime())
  const earliest = dates[0]
  const latest = dates[dates.length - 1]
  const spanDays = earliest && latest
    ? Math.round((latest.getTime() - earliest.getTime()) / (1000 * 60 * 60 * 24))
    : 0

  const uniquePlaces = Array.from(
    new Set(
      linkedEntries.flatMap((e) => {
        const parts = [e.city, e.country].filter(Boolean)
        return parts.length ? [`${e.city ?? ''}${e.country ? `, ${e.country}` : ''}`] : []
      })
    )
  )

  const uniqueCities = Array.from(new Set(linkedEntries.map((e) => e.city).filter(Boolean))) as string[]

  // ── Regenerate arc ──
  const handleRegenerate = async () => {
    if (!story || linkedEntries.length === 0) return
    setRegenerating(true)
    try {
      const lore = await generateStoryArc(story.title, linkedEntries, [])
      await updateStory(story.id, { lore })
      setStory({ ...story, lore })
      addToast('Arc regenerated', 'success')
    } catch {
      addToast('Failed to regenerate arc', 'error')
    } finally {
      setRegenerating(false)
    }
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Story" back />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      </div>
    )
  }

  // ── Not found ──
  if (notFound || !story) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Not Found" back />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="text-ivory-dim text-sm font-body">This story could not be found.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Go back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar title={story.title} back />

      <PageWrapper padded={false} scrollable>
        {/* ── Hero ── */}
        <div className="relative">
          {story.cover_url ? (
            <div className="h-56 overflow-hidden relative">
              <img
                src={story.cover_url}
                alt={story.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/30 to-transparent" />
              {/* Title overlay */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-5">
                <h1 className="font-display text-2xl text-ivory leading-tight">{story.title}</h1>
                {story.subtitle && (
                  <p className="text-sm text-ivory-dim italic font-body mt-1">{story.subtitle}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-40 bg-gradient-to-br from-slate-mid to-obsidian flex flex-col items-center justify-center px-4 gap-3">
              <div className="w-16 h-px bg-gold/40" />
              <h1 className="font-display text-2xl text-ivory text-center leading-tight">{story.title}</h1>
              {story.subtitle && (
                <p className="text-sm text-ivory-dim italic font-body text-center">{story.subtitle}</p>
              )}
              <div className="w-16 h-px bg-gold/40" />
            </div>
          )}

          {/* Date range */}
          {earliest && latest && (
            <div className="flex justify-center pt-3">
              <span className="text-xs text-ivory-dim font-body">
                {formatDate(earliest.toISOString())}
                {spanDays > 0 && ` — ${formatDate(latest.toISOString())}`}
              </span>
            </div>
          )}
        </div>

        {/* ── Padded content ── */}
        <div className="px-4">
          {/* ── The Arc ── */}
          {(story.lore || regenerating) && (
            <>
              <SectionLabel label="The Arc" />
              <div className="relative">
                {story.lore && (
                  <motion.div
                    variants={fadeUp}
                    initial="initial"
                    animate="animate"
                    className="border-l-2 border-gold/40 pl-4 py-1"
                  >
                    <p className="font-display italic text-ivory-muted text-sm leading-relaxed whitespace-pre-wrap">
                      {story.lore}
                    </p>
                  </motion.div>
                )}
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    loading={regenerating}
                    onClick={handleRegenerate}
                    className="gap-1.5 text-ivory-dim"
                  >
                    <RefreshCw size={13} />
                    Regenerate Arc
                  </Button>
                </div>
              </div>
            </>
          )}

          {!story.lore && !regenerating && linkedEntries.length > 0 && (
            <>
              <SectionLabel label="The Arc" />
              <div className="flex flex-col items-center gap-3 py-2">
                <p className="text-xs text-ivory-dim font-body text-center">
                  No arc generated yet
                </p>
                <Button variant="outline" size="sm" onClick={handleRegenerate} loading={regenerating}>
                  Generate Arc
                </Button>
              </div>
            </>
          )}

          {/* ── The Places ── */}
          {uniquePlaces.length > 0 && (
            <>
              <SectionLabel label="The Places" icon={<MapPin size={11} className="text-gold-muted" />} />
              <div className="flex flex-wrap gap-2">
                {uniquePlaces.map((place) => (
                  <span
                    key={place}
                    className="text-xs px-3 py-1.5 rounded-full border border-gold/30 text-gold font-body"
                  >
                    {place}
                  </span>
                ))}
              </div>
            </>
          )}

          {/* ── The Numbers ── */}
          <SectionLabel label="The Numbers" icon={<BarChart3 size={11} className="text-gold-muted" />} />
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Moments', value: linkedEntries.length },
              { label: 'Places', value: uniqueCities.length },
              { label: spanDays === 1 ? 'Day' : 'Days', value: spanDays },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="bg-slate-mid border border-white/8 rounded-xl p-3 flex flex-col items-center gap-1"
              >
                <span className="font-display text-2xl text-ivory">{value}</span>
                <span className="text-[10px] uppercase tracking-widest text-ivory-dim font-body">{label}</span>
              </div>
            ))}
          </div>

          {/* ── Moments Timeline ── */}
          {linkedEntries.length > 0 && (
            <>
              <SectionLabel label="Moments" />
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="flex flex-col gap-2"
              >
                {linkedEntries.map((entry) => {
                  const typeColor = TYPE_COLORS[entry.type] ?? TYPE_COLORS.interlude
                  const typeLabel = TYPE_LABELS[entry.type] ?? entry.type

                  return (
                    <motion.button
                      key={entry.id}
                      type="button"
                      variants={staggerItem}
                      onClick={() => navigate(`/chronicle/${entry.id}`)}
                      className="w-full text-left bg-slate-dark border border-white/6 rounded-xl p-3 hover:border-gold/20 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <span className={cn(
                          'shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md border font-body mt-0.5',
                          typeColor
                        )}>
                          {typeLabel}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-ivory font-body leading-tight truncate">
                            {entry.title}
                          </p>
                          <p className="text-xs text-ivory-dim font-body mt-0.5">
                            {formatDate(entry.date)}
                            {entry.city ? ` · ${entry.city}` : ''}
                          </p>
                          {entry.lore && (
                            <p className="text-xs text-ivory-dim italic font-body mt-1 line-clamp-2 leading-relaxed">
                              {entry.lore}
                            </p>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  )
                })}
              </motion.div>
            </>
          )}

          {/* ── Export ── */}
          <SectionLabel label="Export" icon={<Camera size={11} className="text-gold-muted" />} />
          <Button
            variant="outline"
            fullWidth
            onClick={() => navigate(`/studio?story=${story.id}`)}
          >
            Open in Studio
          </Button>

          <div className="h-4" />
        </div>
      </PageWrapper>
    </div>
  )
}
