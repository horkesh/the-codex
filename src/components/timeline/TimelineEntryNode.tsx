import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { ENTRY_TYPE_META, ENTRY_TYPE_IMAGES } from '@/lib/entryTypes'
import { formatDate } from '@/lib/utils'
import type { TimelineEntryData } from '@/lib/timelineLayout'

export const TimelineEntryNode = memo(function TimelineEntryNode({ data }: NodeProps) {
  const { entry } = data as unknown as TimelineEntryData
  const coverSrc = entry.cover_image_url || ENTRY_TYPE_IMAGES[entry.type]
  const meta = ENTRY_TYPE_META[entry.type]
  const Icon = meta.Icon

  return (
    <div className="flex flex-col items-center gap-1 cursor-pointer group">
      <Handle type="target" position={Position.Left} className="!bg-gold/40 !w-1.5 !h-1.5 !border-0" />
      <div className="relative">
        <img
          src={coverSrc}
          alt=""
          className="w-14 h-14 rounded-lg object-cover border-2 border-white/10 group-hover:border-gold/50 transition-colors shadow-lg"
        />
        <div
          className="absolute -top-1.5 -left-1.5 w-5 h-5 rounded-full flex items-center justify-center border border-gold/30"
          style={{ backgroundColor: meta.borderColor }}
        >
          <Icon size={10} className="text-ivory/80" />
        </div>
      </div>
      <p className="text-[9px] font-display text-ivory text-center max-w-[100px] truncate leading-tight">
        {entry.title}
      </p>
      <p className="text-[8px] font-body text-ivory/40">
        {formatDate(entry.date)}
      </p>
      <Handle type="source" position={Position.Right} className="!bg-gold/40 !w-1.5 !h-1.5 !border-0" />
    </div>
  )
})
