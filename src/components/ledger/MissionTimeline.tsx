import { useRef } from 'react'
import { motion } from 'framer-motion'
import { fadeIn } from '@/lib/animations'

interface MissionTimelineProps {
  missionsByYear: Array<{ year: number; count: number }>
}

export function MissionTimeline({ missionsByYear }: MissionTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (missionsByYear.length === 0) return null

  const maxCount = Math.max(...missionsByYear.map((m) => m.count), 1)
  const peakYear = missionsByYear.reduce(
    (best, m) => (m.count > best.count ? m : best),
    missionsByYear[0],
  ).year

  return (
    <section className="mb-10">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-4">
        Missions Through Time
      </p>

      {/* Horizontal scroll container */}
      <motion.div
        variants={fadeIn}
        initial="initial"
        animate="animate"
        className="bg-slate-mid rounded-xl p-5 shadow-card overflow-hidden"
      >
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {missionsByYear.map((item, i) => {
            const isPeak = item.year === peakYear
            const barHeightPct = (item.count / maxCount) * 100
            // Bar height in px, between 24px and 80px
            const barHeight = 24 + (barHeightPct / 100) * 56

            return (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="flex flex-col items-center gap-2 shrink-0"
              >
                {/* Count */}
                <span className={`font-mono text-sm font-bold leading-none ${isPeak ? 'text-gold' : 'text-ivory'}`}>
                  {item.count}
                </span>

                {/* Bar */}
                <div className="flex items-end h-[80px]">
                  <motion.div
                    className={`w-8 rounded-t-md ${isPeak ? 'bg-gold' : 'bg-white/20'}`}
                    style={{ height: barHeight }}
                    initial={{ height: 0 }}
                    animate={{ height: barHeight }}
                    transition={{ delay: i * 0.05 + 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  />
                </div>

                {/* Year label */}
                <span className={`font-body text-xs font-semibold ${isPeak ? 'text-gold' : 'text-ivory-dim'}`}>
                  {item.year}
                </span>

                {/* Peak indicator */}
                {isPeak && (
                  <span className="text-[9px] text-gold uppercase tracking-widest font-body font-bold -mt-1">
                    Peak
                  </span>
                )}
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}
