import type { Node, Edge } from '@xyflow/react'

/** Minimal entry shape needed for the timeline */
export interface TimelineEntry {
  id: string
  type: string
  title: string
  date: string
  cover_image_url: string | null
}

export interface TimelineEntryData {
  type: 'timelineEntry'
  entry: TimelineEntry
  [key: string]: unknown
}

export interface TimelineMonthData {
  type: 'timelineMonth'
  label: string
  [key: string]: unknown
}

export type TimelineNodeData = TimelineEntryData | TimelineMonthData

export function computeTimelineGraph(entries: TimelineEntry[]): {
  nodes: Node<TimelineNodeData>[]
  edges: Edge[]
} {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))

  const groups = new Map<string, TimelineEntry[]>()
  for (const e of sorted) {
    const key = e.date.slice(0, 7)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }

  const nodes: Node<TimelineNodeData>[] = []
  const edges: Edge[] = []

  let monthX = 0
  let prevNodeId: string | null = null
  const MONTH_WIDTH = 300
  const ENTRY_GAP = 100

  for (const [monthKey, monthEntries] of groups) {
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

    monthEntries.forEach((entry, i) => {
      const nodeId = `entry-${entry.id}`
      const y = i * ENTRY_GAP
      const x = monthX + (i % 2 === 0 ? 40 : 160)

      nodes.push({
        id: nodeId,
        type: 'timelineEntry',
        position: { x, y },
        data: { type: 'timelineEntry' as const, entry },
        draggable: false,
      })

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
