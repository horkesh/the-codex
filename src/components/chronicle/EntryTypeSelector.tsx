import { useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { staggerContainer, staggerItem } from '@/lib/animations'
import type { EntryType } from '@/types/app'

interface EntryTypeSelectorProps {
  onSelect: (type: EntryType) => void
}

const ENTRY_TYPES: EntryType[] = [
  'mission',
  'night_out',
  'steak',
  'playstation',
  'toast',
  'gathering',
  'interlude',
]

const TYPE_DESCRIPTIONS: Record<EntryType, string> = {
  mission: 'A trip or adventure',
  night_out: 'A night in the city',
  steak: 'The Table — a proper meal',
  playstation: 'The Pitch — match day',
  toast: 'A cocktail session',
  gathering: 'A hosted event',
  interlude: 'A moment worth noting',
}

export function EntryTypeSelector({ onSelect }: EntryTypeSelectorProps) {
  const [selected, setSelected] = useState<EntryType | null>(null)

  function handleSelect(type: EntryType) {
    setSelected(type)
    onSelect(type)
  }

  // Split into pairs for 2-column grid, last item centered if odd
  const pairs = ENTRY_TYPES.slice(0, 6)
  const lastItem = ENTRY_TYPES[6]

  return (
    <div className="pt-2 pb-6">
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-3"
      >
        {/* Heading */}
        <motion.div variants={staggerItem} className="mb-2">
          <h2 className="font-display text-2xl text-ivory leading-tight">New Entry</h2>
          <p className="text-ivory-dim text-sm font-body mt-1">What are we logging?</p>
        </motion.div>

        {/* 2-column grid for first 6 */}
        <div className="grid grid-cols-2 gap-3">
          {pairs.map((type) => {
            const meta = ENTRY_TYPE_META[type]
            const isSelected = selected === type
            return (
              <motion.div key={type} variants={staggerItem}>
                <button
                  type="button"
                  onClick={() => handleSelect(type)}
                  className={cn(
                    'w-full text-left rounded-lg transition-all duration-200 overflow-hidden',
                    'bg-white/5 backdrop-blur-md border',
                    isSelected
                      ? 'border-gold bg-gold/10 shadow-gold'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/[0.07]',
                  )}
                >
                  <div className="p-4 flex flex-col gap-2">
                    {/* Icon with colored background dot */}
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        meta.bg,
                      )}
                    >
                      <meta.Icon size={20} aria-hidden="true" />
                    </div>
                    {/* Label + description */}
                    <div>
                      <p
                        className={cn(
                          'font-display text-sm font-semibold leading-tight',
                          isSelected ? 'text-gold' : 'text-ivory',
                        )}
                      >
                        {meta.label}
                      </p>
                      <p className="text-ivory-dim text-xs font-body mt-0.5 leading-snug">
                        {TYPE_DESCRIPTIONS[type]}
                      </p>
                    </div>
                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gold" />
                    )}
                  </div>
                </button>
              </motion.div>
            )
          })}
        </div>

        {/* Last item — centered / full width */}
        {lastItem && (
          <motion.div variants={staggerItem}>
            {(() => {
              const type = lastItem
              const meta = ENTRY_TYPE_META[type]
              const isSelected = selected === type
              return (
                <button
                  type="button"
                  onClick={() => handleSelect(type)}
                  className={cn(
                    'w-full text-left rounded-lg transition-all duration-200 overflow-hidden',
                    'bg-white/5 backdrop-blur-md border',
                    isSelected
                      ? 'border-gold bg-gold/10 shadow-gold'
                      : 'border-white/10 hover:border-white/20 hover:bg-white/[0.07]',
                  )}
                >
                  <div className="p-4 flex flex-row items-center gap-4">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                        meta.bg,
                      )}
                    >
                      <meta.Icon size={20} aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <p
                        className={cn(
                          'font-display text-sm font-semibold',
                          isSelected ? 'text-gold' : 'text-ivory',
                        )}
                      >
                        {meta.label}
                      </p>
                      <p className="text-ivory-dim text-xs font-body mt-0.5">
                        {TYPE_DESCRIPTIONS[type]}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-gold shrink-0" />
                    )}
                  </div>
                </button>
              )
            })()}
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
