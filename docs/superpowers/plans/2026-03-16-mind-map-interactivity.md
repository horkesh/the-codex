# Mind Map Interactivity Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the mind map from a static ring diagram into an interactive canvas with draggable nodes, connection-strength edges, activity pulse, and search.

**Architecture:** All changes are client-side. Layout computation in `mindMapLayout.ts` gains new parameters (saved positions, search query, recent person IDs, appearance counts for edge thickness). The hook `useMindMap.ts` manages localStorage persistence for positions and new state (search, recently-active). The page `MindMap.tsx` wires XYFlow drag events, adds search UI and reset chip. `PersonNode.tsx` gains a pulse animation.

**Tech Stack:** React 19, XYFlow/React v12, Zustand (for toasts), Tailwind v4, localStorage.

**Spec:** `docs/superpowers/specs/2026-03-16-mind-map-interactivity-design.md`

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/lib/mindMapLayout.ts` | Modify | Accept saved positions, search query, recent IDs; compute edge thickness from appearance counts |
| `src/hooks/useMindMap.ts` | Modify | localStorage position persistence, search state, recently-active set, drag handlers, reset |
| `src/pages/MindMap.tsx` | Modify | Wire `onNodeDragStop`, add Reset chip, add search UI, import `useReactFlow` for fitView + snap-back |
| `src/components/mindmap/PersonNode.tsx` | Modify | Add pulse animation ring for `recentlyActive` nodes |
| `src/data/entries.ts` | Modify | Add `fetchRecentEntryIds(days)` query |

---

## Task 1: Connection Strength (Edge Thickness)

Pure computation change in layout — no UI, no state, no side effects.

**Files:**
- Modify: `src/lib/mindMapLayout.ts`

- [ ] **Step 1: Build gent→person appearance count map**

In `computeGraphData`, after building `personNoters` (line 114), build a count map. Add this after the existing appearance index block:

```typescript
// Count gent→person connection strength: appearances + added_by
const gentPersonCount = new Map<string, number>() // key: `${gentId}-${personId}`
for (const a of appearances) {
  const key = `${a.noted_by}-${a.person_id}`
  gentPersonCount.set(key, (gentPersonCount.get(key) ?? 0) + 1)
}
```

- [ ] **Step 2: Update `gentPersonEdgeStyle` to accept count**

Change the function signature and use count-based width:

```typescript
function gentPersonEdgeStyle(alias: GentAlias, dimmed: boolean, count: number) {
  const strokeWidth = count >= 4 ? 3.5 : count >= 2 ? 2.5 : 1.5
  return { stroke: GENT_EDGE_COLOR[alias], strokeWidth, opacity: dimmed ? 0.15 : 1 }
}
```

- [ ] **Step 3: Pass count to edge style calls**

Update the two places `gentPersonEdgeStyle` is called (added_by edge ~line 192, noted_by edge ~line 208):

For added_by edge:
```typescript
const addedCount = (gentPersonCount.get(`${person.added_by}-${person.id}`) ?? 0) + 1 // +1 for the added_by link itself
edges.push({
  ...
  style: gentPersonEdgeStyle(alias, edgeDimmed, addedCount),
})
```

For noted_by edge:
```typescript
const notedCount = gentPersonCount.get(`${noterId}-${person.id}`) ?? 1
edges.push({
  ...
  style: gentPersonEdgeStyle(alias, edgeDimmed, notedCount),
})
```

- [ ] **Step 4: Scale person↔person edges by shared entry count**

In the person↔person edge section (~line 223), track count per pair and use it for strokeWidth:

```typescript
const personPairCount = new Map<string, number>()
for (const [, pIds] of entryPeople) {
  for (let i = 0; i < pIds.length; i++) {
    for (let j = i + 1; j < pIds.length; j++) {
      const key = [pIds[i], pIds[j]].sort().join('-')
      personPairCount.set(key, (personPairCount.get(key) ?? 0) + 1)
    }
  }
}

for (const [key, count] of personPairCount) {
  const [idA, idB] = key.split('-')
  const sw = count >= 4 ? 1.5 : count >= 2 ? 1 : 0.5
  edges.push({
    id: `pp-${key}`,
    source: `person-${idA}`,
    target: `person-${idB}`,
    style: { stroke: 'rgba(255,255,255,0.12)', strokeWidth: sw },
    className: 'person-person-edge',
  })
}
```

Remove the old person↔person edge loop that this replaces.

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```
git add src/lib/mindMapLayout.ts
git commit -m "feat(mind-map): connection strength — edge thickness scales with appearance count"
```

---

## Task 2: Draggable Nodes with Position Persistence

**Files:**
- Modify: `src/lib/mindMapLayout.ts` — accept `savedPositions` param, use for person node placement
- Modify: `src/hooks/useMindMap.ts` — load/save positions, expose drag handler, reset function
- Modify: `src/pages/MindMap.tsx` — wire `onNodeDragStop`, add Reset chip, import `useReactFlow` for gent snap-back

- [ ] **Step 1: Add savedPositions parameter to computeGraphData**

In `src/lib/mindMapLayout.ts`, update the function signature:

```typescript
export function computeGraphData(
  gents: Gent[],
  people: Person[],
  appearances: PersonAppearance[],
  filters: MindMapFilters,
  focusedGentId: string | null,
  savedPositions?: Record<string, { x: number; y: number }>,
): { nodes: Node[]; edges: Edge[] } {
```

- [ ] **Step 2: Use saved positions for person nodes**

In the person node placement loop (~line 170), replace the fixed position with a saved position lookup:

```typescript
const savedPos = savedPositions?.[person.id]
const position = savedPos ?? { x, y }

nodes.push({
  id: `person-${person.id}`,
  type: 'personNode',
  position,
  data: { ... } satisfies PersonNodeData,
  draggable: true,  // Changed from false
})
```

- [ ] **Step 3: Make gent nodes draggable**

Change `draggable: false` to `draggable: true` on gent nodes (~line 86).

- [ ] **Step 4: Add position persistence to useMindMap**

In `src/hooks/useMindMap.ts`, add localStorage management:

```typescript
const POSITIONS_KEY = 'codex_mindmap_positions'

function loadPositions(): Record<string, { x: number; y: number }> {
  try { return JSON.parse(localStorage.getItem(POSITIONS_KEY) ?? '{}') }
  catch { return {} }
}

function savePosition(personId: string, pos: { x: number; y: number }) {
  const all = loadPositions()
  all[personId] = pos
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(all))
}

function clearPositions() {
  localStorage.removeItem(POSITIONS_KEY)
}
```

- [ ] **Step 5: Wire positions into hook state and graph computation**

Add state and pass to `computeGraphData`:

```typescript
const [savedPositions, setSavedPositions] = useState<Record<string, { x: number; y: number }>>(loadPositions)

const graphData = useMemo(
  () => computeGraphData(gents, people, appearances, filters, focusedGentId, savedPositions),
  [gents, people, appearances, filters, focusedGentId, savedPositions]
)
```

- [ ] **Step 6: Add drag stop handler and reset to hook**

```typescript
const handleNodeDragStop = useCallback((_event: React.MouseEvent, node: Node) => {
  const data = node.data as unknown as GentNodeData | PersonNodeData
  if (data.type === 'person') {
    savePosition(data.person.id, node.position)
    setSavedPositions(prev => ({ ...prev, [data.person.id]: node.position }))
  }
  // Gent snap-back is handled in MindMap.tsx via useReactFlow
}, [])

const resetLayout = useCallback(() => {
  clearPositions()
  setSavedPositions({})
}, [])
```

Export `handleNodeDragStop` and `resetLayout` from the hook return.

- [ ] **Step 7: Wire drag events and gent snap-back in MindMap.tsx**

Import `useReactFlow` and `type NodeDragHandler` from `@xyflow/react`. Add `ReactFlowProvider` wrapper.

Add gent snap-back logic:

```typescript
const { setNodes, fitView } = useReactFlow()

const onNodeDragStop: NodeDragHandler = useCallback((_event, node) => {
  const data = node.data as unknown as GentNodeData | PersonNodeData
  if (data.type === 'gent') {
    // Snap back to original position
    const idx = gents.findIndex(g => g.id === data.gent.id)
    const originalPos = [{ x: 0, y: -80 }, { x: -69, y: 40 }, { x: 69, y: 40 }][idx]
    if (originalPos) {
      setNodes(nds => nds.map(n => n.id === node.id ? { ...n, position: originalPos } : n))
    }
  } else {
    handleNodeDragStop(_event, node)
  }
}, [handleNodeDragStop, setNodes])
```

Note: `useReactFlow` must be called inside `<ReactFlowProvider>`. Wrap the component or extract the ReactFlow portion into a child component.

- [ ] **Step 8: Add Reset chip to filter area**

After the tier chips row in MindMap.tsx, add the Reset button at the end:

```tsx
{Object.keys(savedPositions).length > 0 && (
  <button
    type="button"
    onClick={() => { resetLayout(); addToast('Layout reset.', 'info') }}
    className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-body tracking-wide border border-white/20 text-ivory-dim hover:text-ivory hover:border-white/40 transition-colors"
  >
    Reset
  </button>
)}
```

Import `useUIStore` for `addToast`.

- [ ] **Step 9: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 10: Commit**

```
git add src/lib/mindMapLayout.ts src/hooks/useMindMap.ts src/pages/MindMap.tsx
git commit -m "feat(mind-map): draggable nodes with localStorage persistence + gent snap-back + reset"
```

---

## Task 3: Tier Change on Drop

**Files:**
- Modify: `src/pages/MindMap.tsx` — tier detection logic in drag stop handler
- Modify: `src/hooks/useMindMap.ts` — expose `people` for category check

- [ ] **Step 1: Add tier detection to drag stop handler**

In MindMap.tsx, enhance the `onNodeDragStop` handler. After saving the position for person nodes, check if the drop position maps to a different tier:

```typescript
// Tier zone detection
const TIER_ZONES: Array<{ maxRadius: number; tier: PersonTier }> = [
  { maxRadius: 300, tier: 'inner_circle' },
  { maxRadius: 450, tier: 'outer_circle' },
  { maxRadius: 580, tier: 'acquaintance' },
]

if (data.type === 'person') {
  handleNodeDragStop(_event, node)

  // Only contacts can change tier (not POI)
  if (data.person.category !== 'contact') return

  const dist = Math.sqrt(node.position.x ** 2 + node.position.y ** 2)
  const detectedTier = TIER_ZONES.find(z => dist <= z.maxRadius)?.tier ?? 'acquaintance'
  const currentTier = data.person.tier ?? 'acquaintance'

  if (detectedTier !== currentTier) {
    const tierLabel = detectedTier.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())
    addToast(`Move ${data.person.name} to ${tierLabel}?`, 'info')
    // Store pending tier change for confirmation
    setPendingTierChange({ personId: data.person.id, tier: detectedTier, name: data.person.name })
  }
}
```

- [ ] **Step 2: Add tier change confirmation UI**

Add a confirmation banner (similar to the title suggestion banner pattern) that appears when `pendingTierChange` is set:

```tsx
const [pendingTierChange, setPendingTierChange] = useState<{
  personId: string; tier: PersonTier; name: string
} | null>(null)

// In the JSX, above the ReactFlow:
{pendingTierChange && (
  <div className="absolute bottom-20 left-3 right-3 z-10 flex items-center gap-3 bg-gold/10 border border-gold/30 rounded-xl px-4 py-3 backdrop-blur-sm">
    <p className="flex-1 text-xs text-ivory font-body">
      Move <span className="text-gold font-medium">{pendingTierChange.name}</span> to{' '}
      <span className="text-gold font-medium">
        {pendingTierChange.tier.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
      </span>?
    </p>
    <button
      type="button"
      onClick={async () => {
        await updatePersonTier(pendingTierChange.personId, pendingTierChange.tier)
        setPendingTierChange(null)
        addToast('Tier updated.', 'success')
      }}
      className="text-xs text-gold border border-gold/30 rounded-full px-3 py-1 hover:border-gold/60 transition-colors font-body"
    >
      Accept
    </button>
    <button
      type="button"
      onClick={() => setPendingTierChange(null)}
      className="text-xs text-ivory-dim hover:text-ivory transition-colors font-body"
    >
      Cancel
    </button>
  </div>
)}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```
git add src/pages/MindMap.tsx
git commit -m "feat(mind-map): tier change on drop with confirmation banner"
```

---

## Task 4: Activity Pulse Animation

**Files:**
- Modify: `src/data/entries.ts` — add `fetchRecentEntryIds`
- Modify: `src/hooks/useMindMap.ts` — fetch recent IDs, derive active person set
- Modify: `src/lib/mindMapLayout.ts` — accept `recentlyActiveIds` and pass to PersonNodeData
- Modify: `src/components/mindmap/PersonNode.tsx` — render pulse ring

- [ ] **Step 1: Add fetchRecentEntryIds to entries.ts**

```typescript
export async function fetchRecentEntryIds(days: number): Promise<string[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)
  const { data, error } = await supabase
    .from('entries')
    .select('id')
    .gte('created_at', since.toISOString())
    .in('status', ['published', 'gathering_post'])

  if (error) throw error
  return (data ?? []).map(e => e.id)
}
```

- [ ] **Step 2: Fetch recent entry IDs in useMindMap**

Add to the initial data fetch:

```typescript
import { fetchRecentEntryIds } from '@/data/entries'

const [recentEntryIds, setRecentEntryIds] = useState<Set<string>>(new Set())

// In the useEffect, add alongside other fetches:
const r = fetchRecentEntryIds(7).then(ids => setRecentEntryIds(new Set(ids))).catch(() => {})
Promise.all([g, p, a, r]).finally(() => setLoading(false))
```

- [ ] **Step 3: Derive recentlyActivePersonIds**

```typescript
const recentlyActivePersonIds = useMemo(() => {
  const active = new Set<string>()
  for (const a of appearances) {
    if (recentEntryIds.has(a.entry_id)) active.add(a.person_id)
  }
  return active
}, [appearances, recentEntryIds])
```

Pass to `computeGraphData` as a new parameter.

- [ ] **Step 4: Update computeGraphData to accept and use recentlyActiveIds**

Add parameter:
```typescript
export function computeGraphData(
  gents: Gent[],
  people: Person[],
  appearances: PersonAppearance[],
  filters: MindMapFilters,
  focusedGentId: string | null,
  savedPositions?: Record<string, { x: number; y: number }>,
  recentlyActiveIds?: Set<string>,
): ...
```

Update `PersonNodeData` interface:
```typescript
export interface PersonNodeData {
  type: 'person'
  person: Person
  tier: string
  dimmed: boolean
  recentlyActive: boolean
  [key: string]: unknown
}
```

In the person node data block:
```typescript
data: {
  type: 'person',
  person,
  tier: ring,
  dimmed,
  recentlyActive: recentlyActiveIds?.has(person.id) ?? false,
} satisfies PersonNodeData,
```

- [ ] **Step 5: Add pulse animation to PersonNode**

In `src/components/mindmap/PersonNode.tsx`, add the pulse ring behind the avatar:

```tsx
const { person, tier, dimmed, recentlyActive } = data as unknown as PersonNodeData

// Inside the JSX, wrap the Avatar div:
<div className="relative">
  {recentlyActive && (
    <div
      className="absolute inset-0 rounded-full animate-[pulse-ring_2s_ease-out_infinite]"
      style={{
        background: 'rgba(201,168,76,0.3)',
      }}
    />
  )}
  <div className={cn(config.borderClass, 'rounded-full relative')}>
    <Avatar ... />
  </div>
</div>
```

Add the keyframe to `src/index.css` (or inline via Tailwind arbitrary values):

```css
@keyframes pulse-ring {
  0% { transform: scale(1); opacity: 0.4; }
  100% { transform: scale(1.8); opacity: 0; }
}
```

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 7: Commit**

```
git add src/data/entries.ts src/hooks/useMindMap.ts src/lib/mindMapLayout.ts src/components/mindmap/PersonNode.tsx src/index.css
git commit -m "feat(mind-map): activity pulse — nodes glow when person appeared in recent entries"
```

---

## Task 5: Search on Map

**Files:**
- Modify: `src/hooks/useMindMap.ts` — add `searchQuery` state, pass to layout
- Modify: `src/lib/mindMapLayout.ts` — accept search query, set `searchDimmed` on nodes/edges
- Modify: `src/pages/MindMap.tsx` — add search UI (icon → input), call `fitView` on matches

- [ ] **Step 1: Add search query to useMindMap**

```typescript
const [searchQuery, setSearchQuery] = useState('')
```

Pass to `computeGraphData` as a new parameter. Export `searchQuery` and `setSearchQuery`.

- [ ] **Step 2: Update computeGraphData for search dimming**

Add `searchQuery?: string` parameter. After filtering people, if `searchQuery` is non-empty, compute a `searchMatchIds` set:

```typescript
const searchMatchIds = new Set<string>()
if (searchQuery) {
  const q = searchQuery.toLowerCase()
  for (const p of filtered) {
    if (p.name.toLowerCase().includes(q)) searchMatchIds.add(p.id)
  }
}
```

Update person node dimmed logic:
```typescript
const searchDimmed = searchQuery ? !searchMatchIds.has(person.id) : false
const dimmed = (focusedGentId !== null && !connectedToFocused.has(person.id)) || searchDimmed
```

Update gent node dimmed logic to also dim gents during search:
```typescript
const dimmed = (focusedGentId !== null && focusedGentId !== g.id) || (!!searchQuery && searchMatchIds.size > 0)
```

Update edge dimming similarly — edges to/from non-matching nodes get `opacity: 0.05`.

Return `searchMatchIds` array alongside nodes/edges for fitView:
```typescript
return { nodes, edges, searchMatchNodeIds: [...searchMatchIds].map(id => `person-${id}`) }
```

- [ ] **Step 3: Add search UI to MindMap.tsx**

Add a search icon button and expandable input above the filter chips:

```tsx
import { Search, X as XIcon } from 'lucide-react'

const [searchOpen, setSearchOpen] = useState(false)

// In the filter chips area, add at the top:
{searchOpen ? (
  <div className="flex items-center gap-2 bg-slate-dark/80 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
    <Search size={14} className="text-ivory-dim shrink-0" />
    <input
      autoFocus
      type="text"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      placeholder="Search people..."
      className="flex-1 bg-transparent text-sm text-ivory font-body placeholder:text-ivory-dim/50 outline-none"
    />
    <button
      type="button"
      onClick={() => { setSearchQuery(''); setSearchOpen(false) }}
      className="text-ivory-dim hover:text-ivory transition-colors"
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
```

- [ ] **Step 4: Auto-fit view on search matches**

When `searchMatchNodeIds` has 1–3 entries, call `fitView`:

```typescript
useEffect(() => {
  if (searchMatchNodeIds.length > 0 && searchMatchNodeIds.length <= 3) {
    fitView({ nodes: searchMatchNodeIds.map(id => ({ id })), padding: 0.5, duration: 300 })
  }
}, [searchMatchNodeIds, fitView])
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 6: Commit**

```
git add src/hooks/useMindMap.ts src/lib/mindMapLayout.ts src/pages/MindMap.tsx
git commit -m "feat(mind-map): search — filter and zoom to matching person nodes"
```

---

## Task 6: Final Integration & Push

- [ ] **Step 1: Full build check**

Run: `npx tsc --noEmit && npx vite build`
Expected: clean build, no errors

- [ ] **Step 2: Manual test checklist**

Open `/circle/map` and verify:
- Person nodes are draggable, positions persist on page reload
- Gent nodes are draggable but snap back on release
- Dragging a contact into a different ring zone shows tier change confirmation
- Reset chip appears when positions are saved, clears on click
- Edge thickness varies based on connection count
- Recently active nodes have a gold pulse ring
- Search icon opens input, typing dims non-matches, 1-3 matches auto-zoom
- All existing functionality (filter chips, focus mode, detail sheet) still works

- [ ] **Step 3: Push**

```
git push
```

- [ ] **Step 4: Deploy edge functions (if any changed)**

No edge functions changed — Vercel auto-deploy handles frontend.
