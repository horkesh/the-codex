import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react'
import { useNavigate } from 'react-router'
import { TopBar, SectionNav } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { TimelineEntryNode } from '@/components/timeline/TimelineEntryNode'
import { TimelineMonthNode } from '@/components/timeline/TimelineMonthNode'
import { computeTimelineGraph } from '@/lib/timelineLayout'
import { fetchEntries } from '@/data/entries'
import type { EntryWithParticipants } from '@/types/app'
import '@xyflow/react/dist/style.css'

const nodeTypes = {
  timelineEntry: TimelineEntryNode,
  timelineMonth: TimelineMonthNode,
}

const CANVAS_HEIGHT = 'calc(100dvh - 96px)'

function TimelineCanvas() {
  const navigate = useNavigate()
  const { fitView } = useReactFlow()
  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEntries({})
      .then((data) => {
        setEntries(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const { nodes, edges } = useMemo(() => {
    if (entries.length === 0) return { nodes: [], edges: [] }
    return computeTimelineGraph(entries)
  }, [entries])

  // Fit view after nodes render
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(() => fitView({ padding: 0.3, duration: 600 }), 100)
    }
  }, [nodes.length, fitView])

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
      if (node.type === 'timelineEntry') {
        const data = node.data as unknown as { entry: EntryWithParticipants }
        navigate(`/chronicle/${data.entry.id}`)
      }
    },
    [navigate],
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center" style={{ height: CANVAS_HEIGHT }}>
        <Spinner size="md" />
      </div>
    )
  }

  return (
    <div style={{ height: CANVAS_HEIGHT }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ type: 'smoothstep' }}
      >
        <Background color="#C9A84C" gap={40} size={0.5} style={{ opacity: 0.05 }} />
      </ReactFlow>
    </div>
  )
}

export default function Timeline() {
  return (
    <>
      <TopBar title="Timeline" back />
      <SectionNav />
      <ReactFlowProvider>
        <TimelineCanvas />
      </ReactFlowProvider>
    </>
  )
}
