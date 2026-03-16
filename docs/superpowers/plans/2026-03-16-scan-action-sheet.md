# Scan Action Sheet — Split POI Modal Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single POI modal with a FAB action sheet that lets the user choose between "Research" (Instagram) and "Scan" (Camera/Photo), each opening the same modal locked to that mode.

**Architecture:** Add a `ScanActionSheet` overlay component triggered by the FAB. It presents two options that set the mode and open `POIModal`. `POIModal` receives a `mode` prop, removing its internal toggle. The hook's `mode` state is initialised from the prop. No changes to `useVerdictIntake` internals.

**Tech Stack:** React, Framer Motion (animations), Lucide icons, Tailwind v4, existing design system tokens.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/components/circle/ScanActionSheet.tsx` | Create | Action sheet overlay with two options |
| `src/components/circle/POIModal.tsx` | Modify | Accept `mode` prop, remove toggle UI |
| `src/pages/Circle.tsx` | Modify | FAB opens action sheet; action sheet opens modal with mode |

---

## Chunk 1: Implementation

### Task 1: Create `ScanActionSheet` component

**Files:**
- Create: `src/components/circle/ScanActionSheet.tsx`

- [ ] **Step 1: Create the component file**

```tsx
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Camera, X } from 'lucide-react'

interface ScanActionSheetProps {
  open: boolean
  onClose: () => void
  onSelect: (mode: 'research' | 'scan') => void
}

export function ScanActionSheet({ open, onClose, onSelect }: ScanActionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            key="sheet"
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 32 }}
            transition={{ type: 'spring', damping: 28, stiffness: 350 }}
            className="fixed bottom-0 inset-x-0 z-50 px-4 pb-6"
          >
            <div className="rounded-2xl bg-[#141418] border border-white/8 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <h3 className="text-sm font-display text-ivory">Scout Someone</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-ivory-dim hover:text-ivory transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Options */}
              <button
                type="button"
                onClick={() => onSelect('research')}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <Search size={16} className="text-gold" />
                </div>
                <div>
                  <p className="text-sm text-ivory font-body">Research</p>
                  <p className="text-xs text-ivory-dim font-body">Instagram screenshot or handle lookup</p>
                </div>
              </button>

              <div className="h-px bg-white/5 mx-4" />

              <button
                type="button"
                onClick={() => onSelect('scan')}
                className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-white/5 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-full bg-gold/10 flex items-center justify-center shrink-0">
                  <Camera size={16} className="text-gold" />
                </div>
                <div>
                  <p className="text-sm text-ivory font-body">Scan</p>
                  <p className="text-xs text-ivory-dim font-body">Camera or photo from gallery</p>
                </div>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

### Task 2: Modify `POIModal` — accept `mode` prop, remove toggle

**Files:**
- Modify: `src/components/circle/POIModal.tsx`

Changes:
1. Add `mode: 'research' | 'scan'` to props interface
2. Pass `mode` into `useVerdictIntake` reset (so it resets to the correct mode)
3. Remove the mode toggle `<div>` (lines 56-79)
4. `useEffect` to sync hook mode when prop changes

- [ ] **Step 1: Update props interface**

Change `ProspectIntakeModalProps` to include `mode`:

```tsx
interface ProspectIntakeModalProps {
  open: boolean
  mode: 'research' | 'scan'
  onClose: () => void
  onSaved: (personId: string) => void
}
```

- [ ] **Step 2: Destructure `mode` from props and sync to hook**

In the component signature, destructure `mode` from props:

```tsx
export function POIModal({ open, mode, onClose, onSaved }: ProspectIntakeModalProps) {
```

Remove `mode, setMode,` from the `useVerdictIntake` destructure (the hook still exposes them but the modal no longer needs to toggle).

Add a `useEffect` after the hook call to sync the prop into the hook when the modal opens:

```tsx
import { useRef, useState, useEffect } from 'react'

// After the useVerdictIntake destructure:
useEffect(() => {
  if (open) setMode(mode)
}, [open, mode, setMode])
```

Keep `setMode` in the destructure for this sync effect.

- [ ] **Step 3: Remove the mode toggle UI**

Delete the entire mode toggle block (the `<div className="flex rounded-lg overflow-hidden border border-white/10">` with Research/Scan buttons — lines 56-79 of the original file).

- [ ] **Step 4: Verify no TypeScript errors**

Run: `npx tsc --noEmit`

### Task 3: Modify `Circle.tsx` — FAB opens action sheet

**Files:**
- Modify: `src/pages/Circle.tsx`

Changes:
1. Import `ScanActionSheet`
2. Add `showActionSheet` and `poiMode` state
3. FAB always opens action sheet (on both tabs, when not on contacts-add flow)
4. Action sheet selection sets mode + opens POIModal
5. Pass `mode` to `POIModal`

- [ ] **Step 1: Add imports and state**

Add import:
```tsx
import { ScanActionSheet } from '@/components/circle/ScanActionSheet'
```

Add state after existing state declarations:
```tsx
const [showActionSheet, setShowActionSheet] = useState(false)
const [poiMode, setPOIMode] = useState<'research' | 'scan'>('research')
```

- [ ] **Step 2: Update `handleFABPress`**

Replace the existing handler:
```tsx
const handleFABPress = () => {
  if (activeTab === 'contacts') {
    setShowAddForm(true)
  } else {
    setShowActionSheet(true)
  }
}
```

- [ ] **Step 3: Add action sheet selection handler**

```tsx
const handleActionSelect = (mode: 'research' | 'scan') => {
  setPOIMode(mode)
  setShowActionSheet(false)
  setShowPOIModal(true)
}
```

- [ ] **Step 4: Add `ScanActionSheet` and update `POIModal` in JSX**

After the existing `<POIModal>`, add the action sheet:
```tsx
<ScanActionSheet
  open={showActionSheet}
  onClose={() => setShowActionSheet(false)}
  onSelect={handleActionSelect}
/>
```

Update `POIModal` to pass mode:
```tsx
<POIModal
  open={showPOIModal}
  mode={poiMode}
  onClose={() => setShowPOIModal(false)}
  onSaved={() => { /* existing callback unchanged */ }}
/>
```

- [ ] **Step 5: Update the POI empty state "Scout Someone" button**

Change the empty-state button to open the action sheet instead of the modal directly:
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => setShowActionSheet(true)}
>
  Scout Someone
</Button>
```

- [ ] **Step 6: Build and verify**

Run: `pnpm build`
Expected: Build succeeds with no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/circle/ScanActionSheet.tsx src/components/circle/POIModal.tsx src/pages/Circle.tsx
git commit -m "feat: split POI scan into action sheet + mode-locked modal"
```
