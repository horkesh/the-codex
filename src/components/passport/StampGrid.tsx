import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { StampCard } from './StampCard'
import { staggerContainer, staggerItem, fadeIn } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { PassportStamp } from '@/types/app'

type TabKey = 'all' | 'mission' | 'achievement' | 'diplomatic'

interface Tab {
  key: TabKey
  label: string
  emptyText: string
}

const TABS: Tab[] = [
  { key: 'all', label: 'All', emptyText: 'No stamps yet' },
  { key: 'mission', label: 'Missions', emptyText: 'No mission stamps yet' },
  { key: 'achievement', label: 'Achievements', emptyText: 'No achievement stamps yet' },
  { key: 'diplomatic', label: 'Diplomatic', emptyText: 'No diplomatic stamps yet' },
]

interface StampGridProps {
  stamps: PassportStamp[]
  onStampPress: (stamp: PassportStamp) => void
}

export function StampGrid({ stamps, onStampPress }: StampGridProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const filteredStamps =
    activeTab === 'all' ? stamps : stamps.filter(s => s.type === activeTab)

  const currentTab = TABS.find(t => t.key === activeTab)!

  return (
    <div className="flex flex-col gap-4">
      {/* Tab bar */}
      <div
        className={cn(
          'flex items-center gap-0 bg-slate-mid/60 rounded-xl p-1',
          'border border-white/5',
        )}
        role="tablist"
        aria-label="Stamp filter"
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 relative py-2 text-xs font-body font-medium rounded-lg transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold',
              activeTab === tab.key
                ? 'text-gold'
                : 'text-ivory-dim hover:text-ivory-muted',
            )}
          >
            {tab.label}
            {/* Active underline indicator */}
            {activeTab === tab.key && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-gold"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Stamp grid */}
      <AnimatePresence mode="wait">
        {filteredStamps.length === 0 ? (
          <motion.div
            key={`empty-${activeTab}`}
            variants={fadeIn}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex items-center justify-center py-16"
          >
            <p className="text-ivory-dim text-sm text-center">
              {currentTab.emptyText}
            </p>
          </motion.div>
        ) : (
          <motion.div
            key={`grid-${activeTab}`}
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-3 gap-3"
          >
            {filteredStamps.map(stamp => (
              <motion.div key={stamp.id} variants={staggerItem}>
                <StampCard stamp={stamp} onPress={() => onStampPress(stamp)} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
