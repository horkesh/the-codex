import { memo } from 'react'
import { Handle, Position, useStore, type NodeProps } from '@xyflow/react'
import { Avatar } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { PersonNodeData } from '@/lib/mindMapLayout'

const TIER_CONFIG: Record<string, {
  size: number
  avatarSize: 'xs' | 'sm' | 'md'
  borderClass: string
  showLabelMinZoom: number
}> = {
  inner_circle: {
    size: 48,
    avatarSize: 'md',
    borderClass: 'ring-1 ring-ivory/40',
    showLabelMinZoom: 0,
  },
  outer_circle: {
    size: 40,
    avatarSize: 'sm',
    borderClass: 'ring-1 ring-ivory/20',
    showLabelMinZoom: 0,
  },
  acquaintance: {
    size: 32,
    avatarSize: 'xs',
    borderClass: 'ring-1 ring-white/10',
    showLabelMinZoom: 0.8,
  },
  person_of_interest: {
    size: 36,
    avatarSize: 'sm',
    borderClass: 'ring-1 ring-white/10 border border-dashed border-white/20',
    showLabelMinZoom: 0,
  },
}

function PersonNodeInner({ data }: NodeProps) {
  const { person, tier, dimmed } = data as unknown as PersonNodeData
  const zoom = useStore(s => s.transform[2])
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.acquaintance

  const showLabel = zoom >= config.showLabelMinZoom
  const isPOI = tier === 'person_of_interest'

  return (
    <div
      className="flex flex-col items-center gap-0.5 transition-opacity duration-300"
      style={{ opacity: dimmed ? 0.15 : 1 }}
    >
      <div className={cn(config.borderClass, 'rounded-full')}>
        <Avatar
          src={person.portrait_url ?? person.photo_url}
          name={person.name}
          size={config.avatarSize}
        />
      </div>
      {showLabel && (
        <span
          className={`text-[9px] font-body whitespace-nowrap max-w-[70px] truncate text-center ${
            isPOI ? 'text-ivory-dim/60' : 'text-ivory-dim'
          }`}
        >
          {person.name}
        </span>
      )}
      <Handle type="source" position={Position.Top} className="!bg-transparent !border-0 !w-0 !h-0" />
      <Handle type="target" position={Position.Bottom} className="!bg-transparent !border-0 !w-0 !h-0" />
    </div>
  )
}

export const PersonNode = memo(PersonNodeInner)
