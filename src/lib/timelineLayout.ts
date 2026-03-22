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

/**
 * Vertical timeline layout — latest entries on top.
 * Y axis = time (each month = MONTH_HEIGHT), X axis = zigzag within months.
 */
export function computeTimelineGraph(entries: TimelineEntry[]): {
  nodes: Node<TimelineNodeData>[]
  edges: Edge[]
} {
  // Sort by date DESCENDING (newest first = top)
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  const groups = new Map<string, TimelineEntry[]>()
  for (const e of sorted) {
    const key = e.date.slice(0, 7)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(e)
  }

  const nodes: Node<TimelineNodeData>[] = []
  const edges: Edge[] = []

  let monthY = 0
  let prevNodeId: string | null = null
  const MONTH_HEIGHT = 200
  const ENTRY_GAP = 120

  for (const [monthKey, monthEntries] of groups) {
    const [year, month] = monthKey.split('-')
    const monthDate = new Date(+year, +month - 1)
    const monthLabel = monthDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

    // Month label on the left
    nodes.push({
      id: `month-${monthKey}`,
      type: 'timelineMonth',
      position: { x: -140, y: monthY },
      data: { type: 'timelineMonth' as const, label: monthLabel },
      draggable: false,
      selectable: false,
    })

    // Entries zigzag left/right of centre
    monthEntries.forEach((entry, i) => {
      const nodeId = `entry-${entry.id}`
      const x = i % 2 === 0 ? 20 : 160
      const y = monthY + i * ENTRY_GAP

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

    monthY += Math.max(MONTH_HEIGHT, monthEntries.length * ENTRY_GAP + 40)
  }

  return { nodes, edges }
}
