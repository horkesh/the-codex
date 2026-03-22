import { memo } from 'react'
import type { NodeProps } from '@xyflow/react'
import type { TimelineMonthData } from '@/lib/timelineLayout'

export const TimelineMonthNode = memo(function TimelineMonthNode({ data }: NodeProps) {
  const { label } = data as unknown as TimelineMonthData
  return (
    <div className="px-3 py-1 rounded-full bg-white/5 border border-gold/20">
      <p className="text-[10px] font-body text-gold/70 uppercase tracking-widest whitespace-nowrap">
        {label}
      </p>
    </div>
  )
})
