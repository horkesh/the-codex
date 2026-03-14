import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { fetchAllGents } from '@/data/gents'
import type { Gent } from '@/types/app'

interface ParticipantSelectorProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

export function ParticipantSelector({ selectedIds, onChange }: ParticipantSelectorProps) {
  const [gents, setGents] = useState<Gent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchAllGents().then((data) => {
      if (!cancelled) {
        setGents(data)
        setLoading(false)
      }
    })
    return () => { cancelled = true }
  }, [])

  function toggleGent(id: string) {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id))
    } else {
      onChange([...selectedIds, id])
    }
  }

  if (loading) {
    return (
      <div className="flex gap-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-2 flex-1 animate-pulse"
          >
            <div className="w-12 h-12 rounded-full bg-slate-light" />
            <div className="h-3 w-14 rounded bg-slate-light" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-ivory-muted text-xs uppercase tracking-widest font-body">Who was there?</p>
      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex gap-3"
      >
        {gents.map((gent) => {
          const isSelected = selectedIds.includes(gent.id)
          return (
            <motion.button
              key={gent.id}
              type="button"
              variants={staggerItem}
              onClick={() => toggleGent(gent.id)}
              className={cn(
                'flex flex-col items-center gap-2 flex-1 rounded-lg py-3 px-2 transition-all duration-200 border',
                isSelected
                  ? 'border-gold/60 bg-gold/8'
                  : 'border-white/10 bg-white/5 opacity-60 hover:opacity-80',
              )}
            >
              <Avatar
                src={gent.avatar_url}
                name={gent.display_name}
                size="md"
                active={isSelected}
              />
              <div className="text-center">
                <p
                  className={cn(
                    'font-body text-xs font-medium leading-tight',
                    isSelected ? 'text-gold' : 'text-ivory-muted',
                  )}
                >
                  {gent.display_name}
                </p>
                <p className="text-ivory-dim text-[10px] font-mono leading-tight capitalize">
                  {gent.alias}
                </p>
              </div>
            </motion.button>
          )
        })}
      </motion.div>
    </div>
  )
}
