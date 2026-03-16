import { useCallback, useMemo, useState } from 'react'
import { ReactFlow, ReactFlowProvider, Background, useReactFlow, type NodeMouseHandler, type NodeDragHandler } from '@xyflow/react'
import { Spinner } from '@/components/ui'
import { TopBar, SectionNav } from '@/components/layout'
import { GentNode } from '@/components/mindmap/GentNode'
import { PersonNode } from '@/components/mindmap/PersonNode'
import { NodeDetailSheet } from '@/components/mindmap/NodeDetailSheet'
import { useMindMap } from '@/hooks/useMindMap'
import { useUIStore } from '@/store/ui'
import type { Person, PersonTier, GentAlias } from '@/types/app'
import type { GentNodeData, PersonNodeData } from '@/lib/mindMapLayout'
import '@xyflow/react/dist/style.css'

const TIER_CHIPS: Array<{ value: 'all' | PersonTier | 'person_of_interest'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'inner_circle', label: 'Inner' },
  { value: 'outer_circle', label: 'Outer' },
  { value: 'acquaintance', label: 'Acquaint.' },
  { value: 'person_of_interest', label: 'POI' },
]

const GENT_CHIPS: Array<{ value: 'all' | GentAlias; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'keys', label: 'Keys' },
  { value: 'bass', label: 'Bass' },
  { value: 'lorekeeper', label: 'Lorekeeper' },
]

const GENT_POSITIONS = [{ x: 0, y: -80 }, { x: -69, y: 40 }, { x: 69, y: 40 }]

// TopBar h-14 = 56px, SectionNav h-10 = 40px → 96px total
const CANVAS_HEIGHT = 'calc(100dvh - 96px)'

function MindMapCanvas() {
  const {
    loading, nodes, edges, filters, gents, savedPositions,
    toggleGentFocus, setTierFilter, setGentFilter, updatePersonTier,
    handleNodeDragStop, resetLayout,
  } = useMindMap()

  const { setNodes } = useReactFlow()
  const addToast = useUIStore(s => s.addToast)

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)

  const nodeTypes = useMemo(() => ({
    gentNode: GentNode,
    personNode: PersonNode,
  }), [])

  const onNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const data = node.data as unknown as GentNodeData | PersonNodeData
    if (data.type === 'gent') {
      toggleGentFocus(data.gent.id)
    } else if (data.type === 'person') {
      setSelectedPerson(data.person)
      setSheetOpen(true)
    }
  }, [toggleGentFocus])

  const onDragStop: NodeDragHandler = useCallback((_event, node) => {
    const data = node.data as Record<string, unknown>
    if (data.type === 'gent') {
      // Snap back to original triangle position
      const gent = data.gent as { id: string }
      const idx = gents.findIndex(g => g.id === gent.id)
      const originalPos = GENT_POSITIONS[idx]
      if (originalPos) {
        setNodes(nds => nds.map(n => n.id === node.id ? { ...n, position: originalPos } : n))
      }
    } else {
      handleNodeDragStop(_event, node)
    }
  }, [gents, handleNodeDragStop, setNodes])

  const handleTierChange = useCallback(async (personId: string, tier: PersonTier) => {
    await updatePersonTier(personId, tier)
    setSelectedPerson(prev => prev && prev.id === personId ? { ...prev, tier } : prev)
  }, [updatePersonTier])

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-obsidian" style={{ height: CANVAS_HEIGHT }}>
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="relative bg-obsidian" style={{ height: CANVAS_HEIGHT }}>
      {/* Filter chips — float over canvas */}
      <div className="absolute top-3 left-3 right-3 z-10 flex flex-col gap-2">
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TIER_CHIPS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setTierFilter(c.value)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-body tracking-wide transition-colors ${
                filters.tier === c.value
                  ? 'bg-gold/20 text-gold border border-gold/40'
                  : 'bg-slate-dark/70 text-ivory-dim border border-white/10 backdrop-blur-sm'
              }`}
            >
              {c.label}
            </button>
          ))}
          {Object.keys(savedPositions).length > 0 && (
            <button
              type="button"
              onClick={() => { resetLayout(); addToast('Layout reset.', 'info') }}
              className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-body tracking-wide border border-white/20 text-ivory-dim hover:text-ivory hover:border-white/40 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {GENT_CHIPS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setGentFilter(c.value)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-body tracking-wide transition-colors ${
                filters.gent === c.value
                  ? 'bg-gold/20 text-gold border border-gold/40'
                  : 'bg-slate-dark/70 text-ivory-dim border border-white/10 backdrop-blur-sm'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onNodeDragStop={onDragStop}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        style={{ width: '100%', height: '100%' }}
      >
        <Background color="rgba(201,168,76,0.04)" gap={40} />
      </ReactFlow>

      <NodeDetailSheet
        person={selectedPerson}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onTierChange={handleTierChange}
      />
    </div>
  )
}

export default function MindMap() {
  return (
    <>
      <TopBar title="Mind Map" back />
      <SectionNav />
      <ReactFlowProvider>
        <MindMapCanvas />
      </ReactFlowProvider>
    </>
  )
}
