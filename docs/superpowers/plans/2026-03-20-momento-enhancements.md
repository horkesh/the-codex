# Momento Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add swipe-to-switch templates, gallery photo import, self-timer countdown, and publish-to-chronicle to Momento.

**Architecture:** All 4 features modify `src/pages/Momento.tsx` and share the same state model. Swipe uses touch events on the camera preview area. Gallery import reuses the existing capture flow but with a file input instead of camera. Self-timer adds a countdown overlay before triggering the existing capture. Publish-to-chronicle creates an interlude entry from the exported image via existing `createEntry` + `uploadEntryPhoto`.

**Tech Stack:** React 19, TypeScript, Framer Motion (for swipe gestures), Supabase (for entry creation), existing `useCamera` hook, existing `createEntry`/`uploadEntryPhoto` data layer.

---

## Chunk 1: Swipe Gestures + Gallery Import

### Task 1: Swipe to switch templates

**Files:**
- Modify: `src/pages/Momento.tsx` (camera preview area + template selector)

The camera preview `<div className="relative flex-1 overflow-hidden">` (line 269) needs horizontal swipe detection. On swipe left → next overlay, swipe right → previous overlay. Keep the chevron buttons as fallback but the primary interaction is swipe.

- [ ] **Step 1: Add touch tracking refs and handlers**

Add state/refs at the top of the component (after line 92):

```tsx
const touchStartX = useRef<number | null>(null)
const touchStartY = useRef<number | null>(null)
```

Add swipe handlers:

```tsx
const handleTouchStart = useCallback((e: React.TouchEvent) => {
  touchStartX.current = e.touches[0].clientX
  touchStartY.current = e.touches[0].clientY
}, [])

const handleTouchEnd = useCallback((e: React.TouchEvent) => {
  if (touchStartX.current === null || touchStartY.current === null) return
  const dx = e.changedTouches[0].clientX - touchStartX.current
  const dy = e.changedTouches[0].clientY - touchStartY.current
  touchStartX.current = null
  touchStartY.current = null
  // Only trigger if horizontal swipe > 50px and more horizontal than vertical
  if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
    cycleOverlay(dx < 0 ? 1 : -1)
  }
}, [cycleOverlay])
```

- [ ] **Step 2: Attach handlers to camera preview area**

Update the camera preview container div (line 269):

```tsx
<div
  className="relative flex-1 overflow-hidden"
  onTouchStart={handleTouchStart}
  onTouchEnd={handleTouchEnd}
>
```

- [ ] **Step 3: Verify and commit**

Test: open Momento on phone, swipe left/right on camera preview — template should cycle. Chevron buttons still work.

```bash
git add src/pages/Momento.tsx
git commit -m "feat(momento): swipe left/right to cycle overlay templates"
```

---

### Task 2: Gallery import

**Files:**
- Modify: `src/pages/Momento.tsx` (add gallery button + file input handler)

Add a gallery/photo picker button next to the shutter. When a photo is picked from gallery, it enters the same "captured" state as a camera capture — shows the photo with overlay, filter, share/retake/log buttons.

- [ ] **Step 1: Add file input ref and import icon**

Add import at the top:

```tsx
import { ArrowLeft, RefreshCw, Camera, Share2, ChevronLeft, ChevronRight, MapPin, Image as ImageIcon, Timer } from 'lucide-react'
```

Add ref (after compositeRef):

```tsx
const galleryInputRef = useRef<HTMLInputElement>(null)
```

- [ ] **Step 2: Add gallery handler**

```tsx
const handleGalleryPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  // Read image dimensions for aspect ratio
  const img = new Image()
  const url = URL.createObjectURL(file)
  img.onload = () => {
    setCapturedAspect(img.naturalWidth / img.naturalHeight)
    setCapturedTime(timeNow())
    setCapturedUrl(url)
    camera.stop()
  }
  img.src = url
  // Reset input so same file can be re-picked
  e.target.value = ''
}, [camera])
```

- [ ] **Step 3: Add hidden file input and gallery button in UI**

Add the hidden input before the closing `</div>` of the root container (before the location picker modal):

```tsx
<input
  ref={galleryInputRef}
  type="file"
  accept="image/*"
  className="hidden"
  onChange={handleGalleryPick}
/>
```

In the action buttons area, when `!capturedUrl` (live camera mode), add a gallery button to the left of the shutter. The current layout is: Back (left) — Shutter (center) — Flip (right).

New layout: Back (left) — Gallery + Shutter + Flip (center group) — timer (right). Actually, keep the existing 3-button layout but replace the Back button area with the gallery button, and move Back up or repurpose it.

Simpler: add the gallery icon as a small button above the flip camera button, or replace the `ArrowLeft` back button position with a gallery icon when in live mode, and keep the back arrow in the top bar area.

Actually the cleanest approach: put gallery icon to the **left** of the shutter (where Back currently is), and move Back to the top-left of the screen as an overlay button. This is how Instagram/Snapchat cameras work.

Update the render — add a top-left back button overlay on the camera preview:

```tsx
{/* Top-left back button overlay */}
<button
  onClick={handleBack}
  className="absolute top-4 left-4 z-20 p-2 rounded-full bg-black/40 text-ivory/80 active:text-ivory transition-colors"
  style={{ top: 'env(safe-area-inset-top, 16px)' }}
>
  <ArrowLeft size={20} />
</button>
```

Place this inside the camera preview area div (after the opening tag), before the video element.

Then update the action buttons row for `!capturedUrl`:

```tsx
{!capturedUrl ? (
  <>
    {/* Gallery */}
    <button
      onClick={() => galleryInputRef.current?.click()}
      className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors"
    >
      <ImageIcon size={22} />
    </button>

    {/* Shutter */}
    <button
      onClick={handleCapture}
      disabled={!camera.stream}
      className="w-16 h-16 rounded-full border-[3px] border-gold/80 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
    >
      <div className="w-12 h-12 rounded-full bg-ivory" />
    </button>

    {/* Flip camera */}
    <button
      onClick={camera.flip}
      className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors"
    >
      <RefreshCw size={22} />
    </button>
  </>
) : (
```

Remove the `ArrowLeft` back button from the action buttons row (it's now in the camera overlay).

Also keep the back button visible in captured mode too — add the same overlay back button to work in both states.

- [ ] **Step 4: Verify and commit**

Test: open Momento, tap gallery icon → photo picker opens → select photo → enters captured mode with overlay + filter. Share/retake work. On retake, returns to live camera.

```bash
git add src/pages/Momento.tsx
git commit -m "feat(momento): gallery import — pick existing photo for overlay styling"
```

---

## Chunk 2: Self-Timer + Publish to Chronicle

### Task 3: Self-timer (3s countdown)

**Files:**
- Modify: `src/pages/Momento.tsx` (timer state, countdown overlay, timer button)

- [ ] **Step 1: Add timer state and countdown logic**

```tsx
const [timerActive, setTimerActive] = useState(false)
const [countdown, setCountdown] = useState<number | null>(null)
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
```

Add the timer trigger function:

```tsx
const handleTimerCapture = useCallback(() => {
  if (timerActive) return
  setTimerActive(true)
  setCountdown(3)
  let count = 3
  timerRef.current = setInterval(() => {
    count -= 1
    if (count <= 0) {
      clearInterval(timerRef.current!)
      timerRef.current = null
      setCountdown(null)
      setTimerActive(false)
      handleCapture()
    } else {
      setCountdown(count)
    }
  }, 1000)
}, [timerActive, handleCapture])
```

Add cleanup in the component (with other cleanup effects):

```tsx
useEffect(() => {
  return () => {
    if (timerRef.current) clearInterval(timerRef.current)
  }
}, [])
```

- [ ] **Step 2: Add countdown overlay on camera preview**

Inside the camera preview area, after the template overlay AnimatePresence block and before the export composite:

```tsx
{/* Timer countdown overlay */}
{countdown !== null && (
  <div className="absolute inset-0 z-30 flex items-center justify-center">
    <motion.span
      key={countdown}
      initial={{ scale: 2, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="text-ivory font-display text-[120px] font-bold"
      style={{ textShadow: '0 0 40px rgba(0,0,0,0.8)' }}
    >
      {countdown}
    </motion.span>
  </div>
)}
```

- [ ] **Step 3: Add timer button**

In the action buttons row, add a timer toggle between the shutter and the flip camera button. When `!capturedUrl`:

Replace the flip camera button section to include both timer and flip:

```tsx
{/* Timer + Flip */}
<div className="flex flex-col items-center gap-2">
  <button
    onClick={handleTimerCapture}
    disabled={!camera.stream || timerActive}
    className="p-2 rounded-full text-ivory/70 active:text-ivory transition-colors disabled:opacity-40"
  >
    <Timer size={18} />
  </button>
  <button
    onClick={camera.flip}
    className="p-2 rounded-full text-ivory/70 active:text-ivory transition-colors"
  >
    <RefreshCw size={18} />
  </button>
</div>
```

Note: reduce icon sizes slightly (22→18) to fit both buttons vertically in the right column.

- [ ] **Step 4: Verify and commit**

Test: tap timer icon → countdown 3...2...1 → auto-capture. During countdown, timer button is disabled. Retake resets everything.

```bash
git add src/pages/Momento.tsx
git commit -m "feat(momento): 3-second self-timer with countdown overlay"
```

---

### Task 4: Publish to Chronicle

**Files:**
- Modify: `src/pages/Momento.tsx` (add Log button, import data functions, publish handler)

After capturing a photo, add a "Log" button alongside "Share" that creates an interlude entry with the styled photo as cover.

- [ ] **Step 1: Add imports and auth store**

```tsx
import { useAuthStore } from '@/store/auth'
import { createEntry, uploadEntryPhoto, updateEntry } from '@/data/entries'
```

Inside the component:

```tsx
const gent = useAuthStore((s) => s.gent)
const [publishing, setPublishing] = useState(false)
```

- [ ] **Step 2: Add publish handler**

```tsx
const handlePublish = useCallback(async () => {
  if (!compositeRef.current || !gent) return
  setPublishing(true)
  try {
    const blob = await exportToPng(compositeRef.current)
    const file = new File([blob], `momento-${Date.now()}.webp`, { type: 'image/webp' })
    const dateStr = new Date().toISOString().slice(0, 10)
    const entry = await createEntry({
      type: 'interlude',
      title: venue || city || 'Momento',
      date: dateStr,
      location: venue ?? undefined,
      city: city ?? undefined,
      country: country ?? undefined,
      created_by: gent.id,
    })
    // Upload as entry photo + set as cover
    const photoUrl = await uploadEntryPhoto(entry.id, file, 0)
    await updateEntry(entry.id, { cover_image_url: photoUrl })
    addToast('Logged to Chronicle', 'success')
    navigate(`/chronicle/${entry.id}`)
  } catch (e) {
    console.error('Publish failed:', e)
    addToast('Failed to log', 'error')
  } finally {
    setPublishing(false)
  }
}, [gent, venue, city, country, addToast, navigate])
```

- [ ] **Step 3: Add Log button in captured mode UI**

In the captured mode section (the `else` branch where Share + Retake are), update to show both Share and Log buttons side by side:

```tsx
) : (
  <>
    {/* Log to Chronicle */}
    <button
      onClick={handlePublish}
      disabled={publishing || exporting}
      className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors disabled:opacity-40"
    >
      {publishing ? <Spinner size="sm" /> : <BookOpen size={22} />}
    </button>

    {/* Export / Share */}
    <button
      onClick={handleExport}
      disabled={exporting || publishing}
      className="px-6 py-3 rounded-full bg-gold text-obsidian font-body text-sm font-semibold flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
    >
      {exporting ? (
        <Spinner size="sm" />
      ) : (
        <>
          <Share2 size={16} />
          <span>Share</span>
        </>
      )}
    </button>

    {/* Retake */}
    <button
      onClick={handleRetake}
      className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors"
    >
      <Camera size={22} />
    </button>
  </>
)}
```

Add `BookOpen` to the lucide imports:

```tsx
import { ArrowLeft, RefreshCw, Camera, Share2, ChevronLeft, ChevronRight, MapPin, Image as ImageIcon, Timer, BookOpen } from 'lucide-react'
```

Layout in captured mode: Log (left) — Share (center, gold) — Retake (right).

- [ ] **Step 4: Verify and commit**

Test: capture photo → tap Log → creates interlude entry → navigates to entry detail. Cover image is the styled Momento with overlay + filter.

```bash
git add src/pages/Momento.tsx
git commit -m "feat(momento): publish captured photo as chronicle interlude entry"
```

---

## Chunk 3: Final Polish

### Task 5: Update CLAUDE.md documentation

**Files:**
- Modify: `CLAUDE.md` (Momento section)

- [ ] **Step 1: Update the Momento section**

Add to the existing Momento documentation:

- Swipe gestures: horizontal swipe on camera preview to cycle templates (50px threshold, must be more horizontal than vertical). Chevrons kept as fallback.
- Gallery import: `ImageIcon` button left of shutter opens native file picker (`accept="image/*"`). Selected photo enters captured mode with same overlay/filter/export pipeline.
- Self-timer: `Timer` button right of shutter. 3s countdown with animated number overlay (120px, Framer Motion scale+fade). Auto-captures when countdown hits 0.
- Publish to Chronicle: `BookOpen` button in captured mode (left position). Creates `interlude` entry via `createEntry`, uploads styled export as cover via `uploadEntryPhoto`, navigates to entry detail.
- Back button: moved from action bar to floating overlay on camera preview (top-left, safe area aware).

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update Momento section with new features"
```

- [ ] **Step 3: Push and verify deploy**

```bash
git push
```

Check GitHub Actions for successful deploy.
