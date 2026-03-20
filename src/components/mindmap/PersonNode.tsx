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

/** Recency → ring color: warm gold for recent, fading to grey for dormant */
function recencyRingColor(days: number | null): string {
  if (days === null) return 'rgba(255,255,255,0.08)' // never seen
  if (days <= 7) return 'rgba(201,168,76,0.6)'       // last week — warm gold
  if (days <= 30) return 'rgba(201,168,76,0.35)'     // last month — fading gold
  if (days <= 90) return 'rgba(201,168,76,0.15)'     // last quarter — dim gold
  return 'rgba(255,255,255,0.08)'                     // dormant
}

function PersonNodeInner({ data }: NodeProps) {
  const { person, tier, dimmed, recentlyActive, recencyDays, focused } = data as unknown as PersonNodeData
  const zoom = useStore(s => s.transform[2])
  const config = TIER_CONFIG[tier] ?? TIER_CONFIG.acquaintance

  const showLabel = zoom >= config.showLabelMinZoom
  const isPOI = tier === 'person_of_interest'
  const ringColor = recencyRingColor(recencyDays)

  return (
    <div
      className="flex flex-col items-center gap-0.5 transition-opacity duration-300"
      style={{ opacity: dimmed ? 0.15 : 1 }}
    >
      <div className="relative">
        {recentlyActive && !dimmed && (
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: 'rgba(201,168,76,0.3)',
              animation: 'pulse-ring 2s ease-out infinite',
            }}
          />
        )}
        {/* Focus ring */}
        {focused && (
          <div
            className="absolute rounded-full"
            style={{
              inset: '-4px',
              border: '2px solid rgba(201,168,76,0.7)',
              boxShadow: '0 0 12px rgba(201,168,76,0.4)',
            }}
          />
        )}
        <div
          className="rounded-full relative"
          style={{
            boxShadow: `0 0 0 1.5px ${ringColor}`,
          }}
        >
          <Avatar
            src={person.portrait_url ?? person.photo_url}
            name={person.name}
            size={config.avatarSize}
          />
        </div>
      </div>
      {showLabel && (
        <span
          className={cn(
            'text-[9px] font-body whitespace-nowrap max-w-[70px] truncate text-center',
            focused ? 'text-gold' : isPOI ? 'text-ivory-dim/60' : 'text-ivory-dim'
          )}
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
