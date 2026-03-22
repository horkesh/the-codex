import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Avatar } from '@/components/ui'
import type { GentNodeData } from '@/lib/mindMapLayout'

function GentNodeInner({ data }: NodeProps) {
  const { gent, dimmed, ghosted } = data as unknown as GentNodeData

  return (
    <div
      className="flex flex-col items-center gap-1 transition-opacity duration-300"
      style={{ opacity: dimmed ? 0.15 : 1 }}
    >
      <div
        className="rounded-full"
        style={{
          boxShadow: ghosted
            ? '0 0 12px rgba(107,114,128,0.3)'
            : '0 0 16px rgba(201,168,76,0.4)',
          filter: ghosted ? 'saturate(0.3) brightness(0.85)' : undefined,
        }}
      >
        <Avatar
          src={gent.avatar_url}
          name={gent.display_name}
          size="lg"
          active={!ghosted}
        />
      </div>
      <span
        className={`text-[10px] font-body font-medium whitespace-nowrap max-w-[80px] truncate text-center ${ghosted ? '' : 'text-gold'}`}
        style={ghosted ? { color: 'rgba(107,114,128,0.7)' } : undefined}
      >
        {ghosted ? `${gent.display_name} (ret.)` : gent.display_name}
      </span>
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  )
}

export const GentNode = memo(GentNodeInner)
