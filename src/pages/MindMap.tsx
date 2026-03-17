import { useCallback, useEffect, useMemo, useState } from 'react'
import { ReactFlow, ReactFlowProvider, Background, useReactFlow, applyNodeChanges, type NodeMouseHandler, type NodeChange } from '@xyflow/react'
import { Spinner } from '@/components/ui'
import { TopBar, SectionNav } from '@/components/layout'
import { GentNode } from '@/components/mindmap/GentNode'
import { PersonNode } from '@/components/mindmap/PersonNode'
import { NodeDetailSheet } from '@/components/mindmap/NodeDetailSheet'
import { RingGuides } from '@/components/mindmap/RingGuides'
import { useMindMap } from '@/hooks/useMindMap'
import { useUIStore } from '@/store/ui'
import type { Person, PersonTier, GentAlias } from '@/types/app'
import type { GentNodeData, PersonNodeData } from '@/lib/mindMapLayout'
import { Search, X as XIcon } from 'lucide-react'
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

const TIER_ZONES: Array<{ maxRadius: number; tier: PersonTier }> = [
  { maxRadius: 300, tier: 'inner_circle' },
  { maxRadius: 450, tier: 'outer_circle' },
  { maxRadius: 580, tier: 'acquaintance' },
]

// TopBar h-14 = 56px, SectionNav h-10 = 40px → 96px total
const CANVAS_HEIGHT = 'calc(100dvh - 96px)'

function MindMapCanvas() {
  const {
    loading, nodes, edges, filters, gents, savedPositions,
    toggleGentFocus, setTierFilter, setGentFilter, updatePersonTier,
    handleNodeDragStop, resetLayout, searchQuery, setSearchQuery,
    searchMatchNodeIds,
  } = useMindMap()

  const { setNodes, fitView } = useReactFlow()
  const [liveNodes, setLiveNodes] = useState(nodes)
  // Sync live nodes when computed nodes change (filter, focus, data reload)
  useEffect(() => { setLiveNodes(nodes) }, [nodes])

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setLiveNodes(nds => applyNodeChanges(changes, nds))
  }, [])

  const [searchOpen, setSearchOpen] = useState(false)
  const addToast = useUIStore(s => s.addToast)

  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [pendingTierChange, setPendingTierChange] = useState<{
    personId: string; tier: PersonTier; fromTier: PersonTier; name: string
  } | null>(null)

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

  const onDragStop = useCallback((_event: React.MouseEvent, node: { id: string; data: Record<string, unknown>; position: { x: number; y: number } }) => {
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

      // Check for tier change (contacts only, not POI)
      const person = data.person as Person
      if (person.category === 'contact') {
        const dist = Math.sqrt(node.position.x ** 2 + node.position.y ** 2)
        const detectedTier = TIER_ZONES.find(z => dist <= z.maxRadius)?.tier ?? 'acquaintance'
        const currentTier = person.tier ?? 'acquaintance'

        if (detectedTier !== currentTier) {
          setPendingTierChange({ personId: person.id, tier: detectedTier, fromTier: currentTier, name: person.name })
        }
      }
    }
  }, [gents, handleNodeDragStop, setNodes])

  const handleTierChange = useCallback(async (personId: string, tier: PersonTier) => {
    await updatePersonTier(personId, tier)
    setSelectedPerson(prev => prev && prev.id === personId ? { ...prev, tier } : prev)
  }, [updatePersonTier])

  useEffect(() => {
    if (searchMatchNodeIds.length > 0 && searchMatchNodeIds.length <= 3) {
      fitView({ nodes: searchMatchNodeIds.map(id => ({ id })), padding: 0.5, duration: 300 })
    }
  }, [searchMatchNodeIds, fitView])

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
        {searchOpen ? (
          <div className="flex items-center gap-2 bg-slate-dark/80 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
            <Search size={14} className="text-ivory-dim shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search people..."
              className="flex-1 bg-transparent text-sm text-ivory font-body placeholder:text-ivory-dim/50 outline-none min-w-0"
            />
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
              className="text-ivory-dim hover:text-ivory transition-colors shrink-0"
            >
              <XIcon size={14} />
            </button>
          </div>
        ) : (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-dark/70 border border-white/10 backdrop-blur-sm text-ivory-dim hover:text-ivory transition-colors"
            >
              <Search size={12} />
            </button>
          </div>
        )}
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

      {pendingTierChange && (() => {
        const TIER_ORDER: Record<PersonTier, number> = { inner_circle: 0, outer_circle: 1, acquaintance: 2 }
        const tierLabel = (t: PersonTier) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        const isPromotion = TIER_ORDER[pendingTierChange.tier] < TIER_ORDER[pendingTierChange.fromTier]
        const name = pendingTierChange.name.split(' ')[0]

        const message = isPromotion
          ? <>You sure <span className="text-gold font-semibold">{name}</span> deserves to be closer to you?</>
          : <>You decided <span className="text-gold font-semibold">{name}</span> is not worthy enough of the <span className="text-gold font-semibold">{tierLabel(pendingTierChange.fromTier)}</span>?</>

        return (
          <div className="absolute bottom-20 left-3 right-3 z-10 flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 backdrop-blur-sm">
            <p className="flex-1 text-xs text-ivory font-body leading-relaxed">
              {message}
            </p>
            <button
              type="button"
              onClick={async () => {
                await updatePersonTier(pendingTierChange.personId, pendingTierChange.tier)
                setPendingTierChange(null)
                addToast(
                  isPromotion
                    ? `${name} promoted to ${tierLabel(pendingTierChange.tier)}.`
                    : `${name} moved to ${tierLabel(pendingTierChange.tier)}.`,
                  'success'
                )
              }}
              className="text-xs text-gold border border-gold/30 rounded-full px-3 py-1 hover:border-gold/60 transition-colors font-body whitespace-nowrap"
            >
              {isPromotion ? 'Promote' : 'Demote'}
            </button>
            <button
              type="button"
              onClick={() => setPendingTierChange(null)}
              className="text-xs text-ivory-dim hover:text-ivory transition-colors font-body"
            >
              Cancel
            </button>
          </div>
        )
      })()}

      <ReactFlow
        nodes={liveNodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
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
        <RingGuides />
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
