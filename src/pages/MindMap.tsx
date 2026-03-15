import { useCallback, useMemo, useState } from 'react'
import { ReactFlow, Background, type NodeMouseHandler } from '@xyflow/react'
import { Spinner } from '@/components/ui'
import { TopBar, SectionNav } from '@/components/layout'
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
    setSelectedPerson(prev => prev && prev.id === personId ? { ...prev, tier } : prev)
  }, [updatePersonTier])

  return (
    <>
      <TopBar title="Mind Map" back />
      <SectionNav />

      {loading ? (
        <div className="flex items-center justify-center flex-1 bg-obsidian">
          <Spinner size="lg" />
        </div>
      ) : (
        /* Canvas wrapper — fills all remaining space after TopBar + SectionNav */
        <div className="relative bg-obsidian" style={{ flex: '1 1 0%', minHeight: 0 }}>
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
      )}
    </>
  )
}
