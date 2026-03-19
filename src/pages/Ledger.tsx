import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { MapPin } from 'lucide-react'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { Spinner, OnboardingTip } from '@/components/ui'
import { useStats } from '@/hooks/useStats'
import { StatGrid } from '@/components/ledger/StatGrid'
import { PS5Rivalry } from '@/components/ledger/PS5Rivalry'
import { MissionTimeline } from '@/components/ledger/MissionTimeline'
import { WrappedSection } from '@/components/ledger/WrappedSection'
import { VerdictBoard } from '@/components/ledger/VerdictBoard'
import { SommelierSection } from '@/components/ledger/SommelierSection'
import { SteakRatingsChart } from '@/components/ledger/SteakRatingsChart'
import { StreaksSection } from '@/components/ledger/StreaksSection'
import { RivalryIndex } from '@/components/ledger/RivalryIndex'
import { PS5StreaksSection } from '@/components/ledger/PS5StreaksSection'
import { ToastStatsSection } from '@/components/ledger/ToastStatsSection'
import { GentComparison } from '@/components/ledger/GentComparison'
import { fadeIn } from '@/lib/animations'

// Years available for selection — from the Gents' first year to current
const CURRENT_YEAR = new Date().getFullYear()
const FIRST_YEAR = 2022
const YEARS: number[] = Array.from(
  { length: CURRENT_YEAR - FIRST_YEAR + 1 },
  (_, i) => FIRST_YEAR + i,
).reverse()

export default function Ledger() {
  const { stats, ps5H2H, missionsByYear, selectedYear, setSelectedYear, loading } = useStats()

  return (
    <>
      <TopBar title="Ledger" />
      <SectionNav />

      <PageWrapper scrollable>
        <OnboardingTip
          tipKey="ledger"
          title="The Ledger"
          body="Stats update automatically as you log entries. Check Streaks for consecutive-month runs, and the 👑 crown in the stats table for this month's most active gent."
        />
        {/* Year selector */}
        <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
          <div
            className="flex gap-2 pb-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* All Time chip */}
            <YearChip
              label="All Time"
              active={selectedYear === null}
              onSelect={() => setSelectedYear(null)}
            />

            {YEARS.map((year) => (
              <YearChip
                key={year}
                label={String(year)}
                active={selectedYear === year}
                onSelect={() => setSelectedYear(selectedYear === year ? null : year)}
              />
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : (
          <motion.div
            variants={fadeIn}
            initial="initial"
            animate="animate"
            className="flex flex-col"
          >
            {/* Our Places card */}
            <Link
              to="/places"
              className="flex items-center gap-4 rounded-xl border border-white/8 bg-slate-mid px-4 py-3.5 mb-2 hover:border-gold/30 transition-colors active:scale-[0.98]"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gold/10 shrink-0">
                <MapPin size={18} className="text-gold" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-base text-ivory leading-tight">Our Places</p>
                <p className="font-body text-xs text-ivory-dim mt-0.5">Saved venues & locations</p>
              </div>
              <span className="text-ivory-dim text-xs font-body">›</span>
            </Link>

            <StatGrid stats={stats} />
            <GentComparison stats={stats} />
            <VerdictBoard />
            <PS5Rivalry h2h={ps5H2H} />
            <PS5StreaksSection />
            <RivalryIndex />
            <MissionTimeline missionsByYear={missionsByYear} />
            <StreaksSection />
            <SommelierSection />
            <SteakRatingsChart />
            <ToastStatsSection />
            <WrappedSection stats={stats} selectedYear={selectedYear} />
          </motion.div>
        )}
      </PageWrapper>
    </>
  )
}

// ─── Year chip ───────────────────────────────────────────────────────────────

interface YearChipProps {
  label: string
  active: boolean
  onSelect: () => void
}

function YearChip({ label, active, onSelect }: YearChipProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        'shrink-0 h-8 px-4 rounded-full text-xs font-body font-semibold tracking-wide transition-all duration-200 active:scale-95',
        active
          ? 'bg-gold text-obsidian shadow-[0_0_16px_rgba(201,168,76,0.25)]'
          : 'bg-slate-mid text-ivory-muted hover:text-ivory hover:bg-slate-light border border-white/5',
      ].join(' ')}
    >
      {label}
    </button>
  )
}
