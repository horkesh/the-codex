import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Globe, Images, CalendarCheck, X, GitBranch } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChronicle, useUpcomingGatherings } from '@/hooks/useChronicle'
import { EntryCard } from '@/components/chronicle/EntryCard'
import { AlmanacWidget } from '@/components/chronicle/AlmanacWidget'
import { WhereaboutsWidget } from '@/components/whereabouts/WhereaboutsWidget'
import { ChronicleFilters } from '@/components/chronicle/ChronicleFilters'
import { SearchBar } from '@/components/chronicle/SearchBar'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { Spinner, Button, EmptyStateImage, OnboardingTip, SwipeToDelete } from '@/components/ui'
import { deleteEntry, togglePin } from '@/data/entries'
import { fetchDueProspects, updateProspect } from '@/data/prospects'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { staggerContainer, fadeIn } from '@/lib/animations'
import { daysUntil, formatDate } from '@/lib/utils'
import type { EntryWithParticipants, Prospect } from '@/types/app'

export default function Chronicle() {
  const navigate = useNavigate()
  const { entries, allEntries, loading, filters, setFilters, query, setQuery, removeEntry, reload, updateEntryLocal } = useChronicle()
  const { upcoming } = useUpcomingGatherings()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()
  const [dueProspect, setDueProspect] = useState<Prospect | null>(null)

  useEffect(() => {
    fetchDueProspects()
      .then((prospects) => setDueProspect(prospects.length > 0 ? prospects[0] : null))
      .catch(() => {})
  }, [])

  async function handleDismissProspect(id: string) {
    setDueProspect(null)
    try {
      await updateProspect(id, { status: 'passed' })
    } catch {
      addToast('Failed to dismiss prospect.', 'error')
    }
  }

  async function handleDelete(entryId: string) {
    removeEntry(entryId) // optimistic
    try {
      await deleteEntry(entryId)
      addToast('Entry deleted.', 'success')
    } catch {
      addToast('Failed to delete entry.', 'error')
      reload()
    }
  }

  async function handleTogglePin(entryId: string, pinned: boolean) {
    // Optimistic update
    updateEntryLocal(entryId, { pinned })
    try {
      await togglePin(entryId, pinned)
    } catch {
      updateEntryLocal(entryId, { pinned: !pinned })
      addToast('Failed to update pin.', 'error')
    }
  }

  return (
    <>
      <TopBar title="Chronicle" />
      <SectionNav />

      {/* Sub-menu bar */}
      <nav className="flex items-stretch border-b border-white/6" style={{ background: 'rgba(20, 16, 25, 0.88)' }}>
        {[
          { icon: GitBranch, label: 'Timeline', path: '/chronicle/timeline' },
          { icon: Globe, label: 'Map', path: '/dossier' },
          { icon: Images, label: 'Photos', path: '/chronicle/photos' },
        ].map(s => (
          <button
            key={s.path}
            type="button"
            onClick={() => navigate(s.path)}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-ivory-dim hover:text-gold transition-colors"
          >
            <s.icon size={16} />
            <span className="text-[9px] font-body uppercase tracking-wider">{s.label}</span>
          </button>
        ))}
      </nav>

      <PageWrapper padded={false} className="flex flex-col">
        <OnboardingTip
          tipKey="chronicle"
          title="The Chronicle"
          body="Your shared logbook. Tap the gold + button to log a new entry — Mission, Night Out, The Table, PS5, Gathering, or Interlude."
        />
        <AlmanacWidget />
        <WhereaboutsWidget />

        {/* Prospect nudge banner */}
        <AnimatePresence>
          {dueProspect && (
            <motion.div
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="mx-4 mt-3 rounded-xl border border-gold/30 bg-slate-mid px-4 py-3.5"
            >
              <div className="flex items-start gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gold/10 shrink-0 mt-0.5">
                  <CalendarCheck size={16} className="text-gold" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-xs text-gold-muted tracking-wide uppercase leading-none mb-1">
                    Scouted Event
                  </p>
                  <p className="font-display text-sm text-ivory leading-snug">
                    You scouted{' '}
                    <span className="text-gold">{dueProspect.event_name ?? 'an event'}</span>
                    {' '}&mdash; ready to log it?
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/chronicle/new?from=prospect&id=${dueProspect.id}`,
                        )
                      }
                      className="h-7 px-3 rounded-full bg-gold text-obsidian text-xs font-body font-semibold tracking-wide active:scale-95 transition-transform"
                    >
                      Log Entry
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismissProspect(dueProspect.id)}
                      className="h-7 px-3 rounded-full border border-white/10 text-ivory-muted text-xs font-body font-semibold tracking-wide hover:text-ivory active:scale-95 transition-all"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDueProspect(null)}
                  className="text-ivory-dim hover:text-ivory transition-colors shrink-0"
                  aria-label="Close"
                >
                  <X size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upcoming gatherings strip */}
        <AnimatePresence>
          {upcoming.length > 0 && (
            <motion.div
              variants={fadeIn}
              initial="initial"
              animate="animate"
              exit="exit"
              className="px-4 pt-3 pb-1"
            >
              <p className="text-xs tracking-widest text-gold-muted uppercase mb-2 font-body">
                Upcoming
              </p>
              <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
                {upcoming.map((entry) => (
                  <UpcomingGatheringCard
                    key={entry.id}
                    entry={entry}
                    onClick={() => navigate(`/chronicle/${entry.id}`)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search */}
        {allEntries.length > 0 && (
          <SearchBar value={query} onChange={setQuery} />
        )}

        {/* Filters */}
        <ChronicleFilters filters={filters} onChange={setFilters} />

        {/* Entry list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-8 gap-4 text-center">
            <EmptyStateImage src="/empty-states/chronicle.webp" className="mb-1" />
            <p className="font-body text-ivory-dim text-sm leading-relaxed">
              The Chronicle awaits its first entry.
            </p>
            <Button
              variant="outline"
              size="md"
              onClick={() => navigate('/chronicle/new')}
            >
              Create first entry
            </Button>
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-3 px-4 pt-1 pb-4"
          >
            {entries.map((entry) => {
              const card = (
                <EntryCard
                  entry={entry}
                  onClick={() => navigate(`/chronicle/${entry.id}`)}
                  onTogglePin={(pinned) => handleTogglePin(entry.id, pinned)}
                />
              )
              return gent?.id === entry.created_by ? (
                <SwipeToDelete key={entry.id} onDelete={() => handleDelete(entry.id)}>
                  {card}
                </SwipeToDelete>
              ) : (
                <div key={entry.id}>{card}</div>
              )
            })}
          </motion.div>
        )}
      </PageWrapper>

      {/* FAB */}
      <motion.button
        type="button"
        aria-label="New entry"
        onClick={() => navigate('/chronicle/new')}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
        whileTap={{ scale: 0.92 }}
        className="fixed right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gold text-obsidian font-body font-semibold shadow-[0_0_40px_rgba(201,168,76,0.3)]"
        style={{ bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))' }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>
    </>
  )
}

// ─── Upcoming gathering mini-card ───────────────────────────────────────────

interface UpcomingGatheringCardProps {
  entry: EntryWithParticipants
  onClick: () => void
}

function UpcomingGatheringCard({ entry, onClick }: UpcomingGatheringCardProps) {
  const meta = entry.metadata as Record<string, unknown>
  const eventDate = meta?.event_date as string | undefined

  const days = eventDate ? daysUntil(eventDate) : null
  const countdownLabel =
    days === null
      ? ''
      : days === 0
      ? 'Today'
      : days === 1
      ? 'Tomorrow'
      : days > 0
      ? `In ${days} days`
      : 'Past'

  const displayDate = eventDate ? formatDate(eventDate) : formatDate(entry.date)

  return (
    <button
      type="button"
      onClick={onClick}
      className="shrink-0 w-[140px] flex flex-col gap-1 rounded-lg border border-gold/30 bg-slate-mid px-3 py-2.5 text-left transition-colors duration-150 hover:border-gold/60 active:scale-[0.97]"
    >
      <p className="font-body text-xs text-gold-muted tracking-wide uppercase leading-none">
        {countdownLabel}
      </p>
      <p className="font-display text-sm text-ivory leading-snug line-clamp-2 mt-0.5">
        {entry.title}
      </p>
      <p className="font-body text-[10px] text-ivory-dim mt-auto pt-1">
        {displayDate}
      </p>
    </button>
  )
}
