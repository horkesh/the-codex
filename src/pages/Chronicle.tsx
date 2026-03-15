import { useNavigate } from 'react-router'
import { Plus, Globe } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useChronicle, useUpcomingGatherings } from '@/hooks/useChronicle'
import { EntryCard } from '@/components/chronicle/EntryCard'
import { AlmanacWidget } from '@/components/chronicle/AlmanacWidget'
import { WhereaboutsWidget } from '@/components/whereabouts/WhereaboutsWidget'
import { ChronicleFilters } from '@/components/chronicle/ChronicleFilters'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { Spinner, Button, EmptyStateImage, OnboardingTip } from '@/components/ui'
import { staggerContainer, fadeIn } from '@/lib/animations'
import { daysUntil, formatDate } from '@/lib/utils'
import type { EntryWithParticipants } from '@/types/app'

export default function Chronicle() {
  const navigate = useNavigate()
  const { entries, loading, filters, setFilters } = useChronicle()
  const { upcoming } = useUpcomingGatherings()

  return (
    <>
      <TopBar
        title="Chronicle"
        right={
          <button
            type="button"
            onClick={() => navigate('/dossier')}
            className="flex items-center justify-center w-8 h-8 text-ivory-muted hover:text-ivory transition-colors"
            aria-label="Dossier map"
          >
            <Globe size={18} strokeWidth={1.75} />
          </button>
        }
      />
      <SectionNav />

      <PageWrapper padded={false} className="flex flex-col">
        <OnboardingTip
          tipKey="chronicle"
          title="The Chronicle"
          body="Your shared logbook. Tap the gold + button to log a new entry — Mission, Night Out, The Table, PS5, Gathering, or Interlude."
        />
        <AlmanacWidget />
        <WhereaboutsWidget />

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
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onClick={() => navigate(`/chronicle/${entry.id}`)}
              />
            ))}
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
