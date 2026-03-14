import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router'
import { ReactFlow, Background, type NodeMouseHandler } from '@xyflow/react'
import { ArrowLeft } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { GentNode } from '@/components/mindmap/GentNode'
import { PersonNode } from '@/components/mindmap/PersonNode'
import { NodeDetailSheet } from '@/components/mindmap/NodeDetailSheet'
import { useMindMap } from '@/hooks/useMindMap'
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

export default function MindMap() {
  const navigate = useNavigate()
  const {
    loading, nodes, edges, filters,
    toggleGentFocus, setTierFilter, setGentFilter, updatePersonTier,
  } = useMindMap()

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

  const handleTierChange = useCallback(async (personId: string, tier: PersonTier) => {
    await updatePersonTier(personId, tier)
    // Update the local selected person so sheet reflects change
    setSelectedPerson(prev => prev && prev.id === personId ? { ...prev, tier } : prev)
  }, [updatePersonTier])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-obsidian">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate('/circle')}
        className="absolute top-4 left-4 z-10 flex items-center justify-center w-9 h-9 rounded-full bg-slate-dark/80 backdrop-blur-sm text-ivory hover:bg-slate-dark transition-colors"
        aria-label="Back to Circle"
      >
        <ArrowLeft size={18} />
      </button>

      {/* Filter chips */}
      <div className="absolute top-4 left-14 right-4 z-10 flex flex-col gap-2">
        {/* Tier filter */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {TIER_CHIPS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setTierFilter(c.value)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-body tracking-wide transition-colors ${
                filters.tier === c.value
                  ? 'bg-gold/20 text-gold border border-gold/40'
                  : 'bg-slate-dark/60 text-ivory-dim border border-white/10 backdrop-blur-sm'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Gent filter */}
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {GENT_CHIPS.map(c => (
            <button
              key={c.value}
              type="button"
              onClick={() => setGentFilter(c.value)}
              className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-body tracking-wide transition-colors ${
                filters.gent === c.value
                  ? 'bg-gold/20 text-gold border border-gold/40'
                  : 'bg-slate-dark/60 text-ivory-dim border border-white/10 backdrop-blur-sm'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* React Flow canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={3}
        proOptions={{ hideAttribution: true }}
        className="touch-none"
      >
        <Background color="rgba(201,168,76,0.04)" gap={40} />
      </ReactFlow>

      {/* Person detail sheet */}
      <NodeDetailSheet
        person={selectedPerson}
        isOpen={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onTierChange={handleTierChange}
      />
    </div>
  )
}
