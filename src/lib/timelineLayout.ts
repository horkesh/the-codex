import type { Node, Edge } from '@xyflow/react'
import type { EntryWithParticipants } from '@/types/app'

export interface TimelineEntryData {
  type: 'timelineEntry'
  entry: EntryWithParticipants
  [key: string]: unknown
}

export interface TimelineMonthData {
  type: 'timelineMonth'
  label: string
  [key: string]: unknown
}

export type TimelineNodeData = TimelineEntryData | TimelineMonthData

export function computeTimelineGraph(entries: EntryWithParticipants[]): {
  nodes: Node<TimelineNodeData>[]
  edges: Edge[]
} {
  // Sort by date ascending
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  // Group by YYYY-MM
  const groups = new Map<string, EntryWithParticipants[]>()
  for (const e of sorted) {
    const key = e.date.slice(0, 7) // YYYY-MM
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }

  const nodes: Node<TimelineNodeData>[] = []
  const edges: Edge[] = []

  let monthX = 0
  let prevNodeId: string | null = null
  const MONTH_WIDTH = 300
  const ENTRY_VERTICAL_GAP = 100

  for (const [monthKey, monthEntries] of groups) {
    // Month label node
    const [year, month] = monthKey.split('-')
    const monthDate = new Date(+year, +month - 1)
    const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    nodes.push({
      id: `month-${monthKey}`,
      type: 'timelineMonth',
      position: { x: monthX + MONTH_WIDTH / 2 - 60, y: -60 },
      data: { type: 'timelineMonth' as const, label: monthLabel },
      draggable: false,
      selectable: false,
    })

    // Entry nodes within this month
    monthEntries.forEach((entry, i) => {
      const nodeId = `entry-${entry.id}`
      const y = i * ENTRY_VERTICAL_GAP
      const x = monthX + (i % 2 === 0 ? 40 : 160) // zigzag within month

      nodes.push({
        id: nodeId,
        type: 'timelineEntry',
        position: { x, y },
        data: { type: 'timelineEntry' as const, entry },
        draggable: false,
      })

      // Edge from previous entry (golden thread)
      if (prevNodeId) {
        edges.push({
          id: `thread-${prevNodeId}-${nodeId}`,
          source: prevNodeId,
          target: nodeId,
          style: { stroke: '#C9A84C', strokeWidth: 2, opacity: 0.4 },
          type: 'smoothstep',
        })
      }
      prevNodeId = nodeId
    })

    monthX += MONTH_WIDTH
  }

  return { nodes, edges }
}
