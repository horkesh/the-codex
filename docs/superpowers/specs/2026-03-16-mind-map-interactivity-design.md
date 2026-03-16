# Mind Map Interactivity — Design Spec

## Overview

Transform the mind map from a static ring visualization into an interactive, living canvas. Four features: draggable nodes, connection strength edges, activity pulse, and search.

## Current State

- XYFlow (`@xyflow/react` v12) canvas at `/circle/map`
- 3 gent nodes (fixed triangle) + person nodes on 4 concentric rings by tier
- Filter chips (tier + gent), focus mode (click gent to highlight connections)
- `NodeDetailSheet` modal on person click for tier editing
- Layout computed in `src/lib/mindMapLayout.ts`, data fetched in `src/hooks/useMindMap.ts`

---

## Feature 1: Draggable Nodes

### Person nodes
- `draggable: true` on all person nodes.
- On drag end (`onNodeDragStop`), save `{ [personId]: { x, y } }` to `localStorage` key `codex_mindmap_positions`.
- In `computeGraphData`, if a saved position exists for a person, use it instead of the computed ring position.
- Distinguish between "has custom position" and "computed position" so reset works.

### Gent nodes
- `draggable: true` with snap-back behavior.
- On drag end, animate back to the original triangle position (use XYFlow's `setNodes` to restore position).
- Purpose: temporarily pull a gent out to visually inspect their connections, then release.

### Tier change on drop
- After a person node drag ends, compute distance from canvas center (0,0).
- Map distance to ring zones:
  - 0–300px → inner_circle
  - 300–450px → outer_circle
  - 450–580px → acquaintance
  - 580px+ → person_of_interest (contacts only stay contact; POI stays POI)
- If the detected tier differs from current tier, show a toast: `"Move [Name] to Inner Circle?"` with Accept/Cancel.
- On accept: call `updatePerson(id, { tier })`, update local state, recompute ring position for non-dragged nodes.
- POI nodes cannot change tier via drag (they're a different category).

### Reset Layout
- A "Reset" chip at the end of the tier filter row, styled as outline (no fill, `border-white/20 text-ivory-dim`).
- On click: clear `codex_mindmap_positions` from localStorage, recompute all positions from ring layout.
- Confirm with a brief toast: "Layout reset."

---

## Feature 2: Connection Strength (Edge Thickness)

### Gent → Person edges
- Count appearances where `noted_by = gentId` for each person.
- Add the `added_by` link as +1.
- Map count to stroke width:
  - 1 → 1.5px (current default)
  - 2–3 → 2.5px
  - 4+ → 3.5px

### Person ↔ Person edges
- Count shared entries between each person pair.
- Map to stroke width:
  - 1 → 0.5px (current)
  - 2–3 → 1px
  - 4+ → 1.5px

### Implementation
- Compute counts in `computeGraphData` using the existing `appearances` data.
- Pass count-derived `strokeWidth` in the edge `style` object. No new data fetching needed.

---

## Feature 3: Animated Pulse (Recent Activity)

### Behavior
- Person nodes that appeared in an entry created within the last 7 days get a pulse animation.
- The pulse is a CSS ring that expands outward and fades — a soft "breathing" glow, not a blink.

### Data
- Need `created_at` from entries linked via `person_appearances`.
- In `useMindMap`, derive a `Set<personId>` of recently active people by checking `appearances` against entries within 7 days.
- Pass `recentlyActive: boolean` in `PersonNodeData`.

### Rendering
- In `PersonNode.tsx`, when `recentlyActive` is true, render an extra `<div>` behind the avatar with a CSS keyframe animation:
  ```css
  @keyframes pulse-ring {
    0% { transform: scale(1); opacity: 0.4; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  ```
- Color: gold (`rgba(201,168,76,0.3)`), duration ~2s, infinite loop.

### Data gap
- `appearances` has `person_id` and `entry_id` but not the entry's `created_at`.
- Two options:
  - **A)** Fetch entry dates separately: `fetchRecentEntryIds(7days)` → filter appearances.
  - **B)** Join in the `fetchAllAppearances` query to include entry date.
- Recommend **A** — a small additional query, keeps the appearances query simple.

---

## Feature 4: Search on Map

### UI
- A search icon button (magnifying glass) in the filter chip area, right-aligned.
- On tap, expands into a text input that overlays the filter chips.
- Typing filters in real-time (debounced 200ms).

### Behavior
- Match against person `name` (case-insensitive substring).
- Non-matching nodes dim to `opacity: 0.1`. Matching nodes stay full opacity.
- Edges to/from non-matching nodes also dim.
- If 1–3 matches, auto-fit view to center on them (`fitView` with node IDs).
- Clear button (X) dismisses search and restores normal view.
- Empty search = show all (same as no search).

### Implementation
- Add `searchQuery` state to `useMindMap`.
- Pass search match status as `searchDimmed: boolean` in node data (separate from focus dimming).
- Final dimmed state = `focusDimmed || searchDimmed`.

---

## Files to Modify

| File | Changes |
|---|---|
| `src/lib/mindMapLayout.ts` | Accept saved positions, compute edge thickness, accept search query for dimming |
| `src/hooks/useMindMap.ts` | Manage saved positions (load/save localStorage), search state, recently-active set, expose `onNodeDragStop` handler |
| `src/pages/MindMap.tsx` | Wire drag events, add Reset chip, add search UI, pass new props |
| `src/components/mindmap/PersonNode.tsx` | Add pulse animation ring, accept `recentlyActive` prop |
| `src/components/mindmap/GentNode.tsx` | No changes (snap-back handled via `onNodeDragStop` in parent) |
| `src/data/entries.ts` or new util | `fetchRecentEntryIds(days)` for pulse feature |

## Future (Wishlist)

- **Tap edge to see shared history** — tap a connection line between any two nodes to see which entries they share. Opens a small modal listing entry titles + dates with links. Needs `onEdgeClick` handler + query for shared entries between two people/gents.

---

## Non-goals

- No database persistence for positions (localStorage only)
- No clustering/alternative layouts
- No adding people from the map
- No inline editing (use existing NodeDetailSheet)
