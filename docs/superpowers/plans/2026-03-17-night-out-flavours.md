# Night Out Flavours Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "flavour" system (Live Music, Movie Night) to Night Out entries with flavour-specific form fields, lore directives, and 4 Live Music Studio export templates.

**Architecture:** Flavours are stored in `entry.metadata.flavour` (no migration). NightOutForm gets pill selector + conditional Song field. Lore generation branches on flavour. Studio registers new `LiveMusicCard` templates with a `requiresFlavour` filter. All changes are additive — existing Night Out behaviour is untouched.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Framer Motion, Supabase Edge Functions (Deno), html-to-image export

**Spec:** `docs/superpowers/specs/2026-03-17-night-out-flavours-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/chronicle/forms/NightOutForm.tsx` | Modify | Add flavour pills, song field, extend FormData |
| `src/pages/EntryNew.tsx` | Modify | Pass flavour + song into metadata on submit |
| `supabase/functions/generate-lore/index.ts` | Modify | Branch on flavour for live music lore directive |
| `src/pages/Studio.tsx` | Modify | Register live_music templates, add `requiresFlavour` to TemplateConfig, filter by flavour |
| `src/export/templates/LiveMusicCard.tsx` | Create | 4 variant templates (Marquee, Poster, Setlist, Vinyl) |

---

## Chunk 1: Form + Data Flow

### Task 1: Extend NightOutForm with flavour pills and song field

**Files:**
- Modify: `src/components/chronicle/forms/NightOutForm.tsx`

- [ ] **Step 1: Update NightOutFormData interface**

Add `flavour` and `song` to the interface and the `empty` default:

```typescript
export interface NightOutFormData {
  title: string
  date: string
  location: string
  description: string
  flavour?: string
  song?: string
}

const empty: NightOutFormData = {
  title: '',
  date: '',
  location: '',
  description: '',
  flavour: undefined,
  song: undefined,
}
```

- [ ] **Step 2: Add flavour pill constants**

Above the component function:

```typescript
const FLAVOURS = [
  { value: undefined, label: 'Regular' },
  { value: 'live_music', label: 'Live Music' },
  { value: 'movie_night', label: 'Movie Night' },
] as const
```

- [ ] **Step 3: Add flavour pills UI**

Insert between the title input `</div>` and the Date `<Input>`. Uses the same styling pattern as filter chips in the mindmap/circle pages:

```tsx
{/* Flavour pills */}
<div className="flex gap-2">
  {FLAVOURS.map((f) => (
    <button
      key={f.label}
      type="button"
      onClick={() => {
        const newFlavour = f.value
        setForm((prev) => ({
          ...prev,
          flavour: newFlavour,
          song: newFlavour !== 'live_music' ? undefined : prev.song,
        }))
      }}
      className={cn(
        'px-3 py-1.5 rounded-full text-xs font-body tracking-wide border transition-all',
        form.flavour === f.value || (!form.flavour && !f.value)
          ? 'border-gold/50 bg-gold/10 text-gold'
          : 'border-white/10 bg-white/5 text-ivory-dim hover:border-white/25'
      )}
    >
      {f.label}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Add conditional song field**

Insert after the flavour pills, before the Date input:

```tsx
{form.flavour === 'live_music' && (
  <Input
    label="Song"
    placeholder="What was playing?"
    value={form.song ?? ''}
    onChange={(e) => set('song', e.target.value)}
  />
)}
```

- [ ] **Step 5: Fix the `set` function type**

The `set` function currently takes `keyof NightOutFormData`. With the new optional fields, this still works — no change needed since `song` and `flavour` are now part of the interface.

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean (no errors)

- [ ] **Step 7: Commit**

```bash
git add src/components/chronicle/forms/NightOutForm.tsx
git commit -m "feat(night-out): add flavour pills (Live Music, Movie Night) + song field"
```

### Task 2: Pass flavour + song into metadata on submit

**Files:**
- Modify: `src/pages/EntryNew.tsx:317-324`

- [ ] **Step 1: Update submitNightOut**

Change the existing `submitNightOut` function to include metadata:

```typescript
async function submitNightOut(data: NightOutFormData) {
  const meta: Record<string, unknown> = {}
  if (data.flavour) meta.flavour = data.flavour
  if (data.song) meta.song = data.song
  await handleSubmit({
    title: data.title,
    date: data.date,
    location: data.location,
    description: data.description,
    metadata: Object.keys(meta).length > 0 ? meta : undefined,
  })
}
```

This follows the same pattern as `submitMission` which conditionally passes `metadata: { date_end }`.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 3: Commit**

```bash
git add src/pages/EntryNew.tsx
git commit -m "feat(night-out): pass flavour + song metadata on entry submit"
```

### Task 3: Update lore generation for Live Music flavour

**Files:**
- Modify: `supabase/functions/generate-lore/index.ts:73`

- [ ] **Step 1: Add live music directive constant**

Add after the `entryTypeDirectives` object (after line 27):

```typescript
const liveMusicDirective = `This is a Live Music night — one of the Gents at the keys, performing live at a small venue. The prose should capture his presence at the piano, fingers on the keys, the sound filling a tight room. If photos show the performer, describe his command of the instrument and the stage. If photos show the crowd, describe the atmosphere — drinks in hand, conversations paused, eyes on the piano. Reference the song if provided. This is a night where the music came from one of their own.`
```

- [ ] **Step 2: Branch on flavour before fallback**

Change line 73 from:

```typescript
const typeDirective = entryTypeDirectives[entry.type] || ''
```

To:

```typescript
const flavour = entry.metadata?.flavour as string | undefined
const typeDirective = (entry.type === 'night_out' && flavour === 'live_music')
  ? liveMusicDirective
  : (entryTypeDirectives[entry.type] || '')
```

- [ ] **Step 3: Include song in prompt context**

After the `Description:` line in the prompt (around line 84), add:

```typescript
${entry.metadata?.song ? `\nSong: ${entry.metadata.song}` : ''}
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/generate-lore/index.ts
git commit -m "feat(lore): live music directive + song context for night_out flavour"
```

---

## Chunk 2: Studio Templates

### Task 4: Create LiveMusicCard template (4 variants)

**Files:**
- Create: `src/export/templates/LiveMusicCard.tsx`

- [ ] **Step 1: Create the file with shared constants and helpers**

```typescript
import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BackgroundLayer, getOneliner } from '@/export/templates/shared'

interface LiveMusicCardProps {
  entry: Entry
  backgroundUrl?: string
  variant?: 1 | 2 | 3 | 4
}

const ROOT: React.CSSProperties = {
  width: '1080px',
  height: '1350px',
  backgroundColor: '#0D0B0F',
  fontFamily: 'var(--font-body)',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}

const INNER: React.CSSProperties = {
  width: '100%', height: '100%',
  display: 'flex', flexDirection: 'column',
  position: 'relative',
}

const Z2: React.CSSProperties = { position: 'relative', zIndex: 2 }

function getMeta(entry: Entry) {
  const m = entry.metadata as Record<string, unknown>
  return {
    song: (m?.song as string) ?? null,
    flavour: (m?.flavour as string) ?? null,
  }
}
```

Note: Uses `INNER` locally rather than `VARIANT_INNER` from shared — follows the same pattern but this template has unique ROOT values and doesn't import BrandMark (per spec: no BrandMark on Live Music templates).

- [ ] **Step 2: Write V1 "Marquee" — Jazz club elegant**

```tsx
function V1({ entry, backgroundUrl }: LiveMusicCardProps) {
  const { song } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Venue top */}
      <div style={{ paddingTop: 80, ...Z2 }}>
        {entry.location && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
            letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C',
          }}>
            {entry.location}
          </span>
        )}
        <div style={{ height: 1, width: 64, backgroundColor: '#C9A84C', margin: '16px auto 0', opacity: 0.5 }} />
      </div>
      {/* Song hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px', ...Z2 }}>
        {song && (
          <h1 style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 72,
            fontWeight: 700, color: '#F0EDE8', textAlign: 'center', lineHeight: 1.1,
            letterSpacing: '-0.02em', margin: '0 0 32px',
          }}>
            {song}
          </h1>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: song ? 36 : 64,
          fontWeight: 700, color: song ? '#C8C0B0' : '#F0EDE8', textAlign: 'center',
          lineHeight: 1.1, margin: '0 0 24px',
        }}>
          {entry.title}
        </h2>
        {oneliner && (
          <p style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22,
            color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center',
            lineHeight: 1.6, maxWidth: 800,
          }}>
            {oneliner}
          </p>
        )}
      </div>
      {/* Bottom: date + badge */}
      <div style={{ paddingBottom: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, ...Z2 }}>
        <div style={{
          border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4,
          padding: '5px 14px',
        }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.3em',
            textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600,
          }}>
            Live Session
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 15, color: '#8C8680',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {formatDate(entry.date)}
        </span>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Write V2 "Poster" — Gritty concert poster**

```tsx
function V2({ entry, backgroundUrl }: LiveMusicCardProps) {
  const { song } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.08,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
      }} />
      {/* Rough border */}
      <div style={{
        position: 'absolute', inset: 16, zIndex: 1, pointerEvents: 'none',
        border: '2px solid rgba(201,168,76,0.2)',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)',
      }} />
      {/* Content bottom-aligned */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 80, ...Z2 }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, color: '#C9A84C',
          letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16,
        }}>
          Live
        </p>
        {song && (
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 700,
            color: '#F0EDE8', lineHeight: 0.95, letterSpacing: '-0.03em',
            textTransform: 'uppercase', margin: '0 0 24px',
          }}>
            {song}
          </h1>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: song ? 32 : 72,
          fontWeight: 700, color: song ? '#C8C0B0' : '#F0EDE8',
          lineHeight: 1, margin: '0 0 32px',
        }}>
          {entry.title}
        </h2>
        {oneliner && (
          <p style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20,
            color: '#C8C0B0', lineHeight: 1.5, maxWidth: 800, marginBottom: 32,
          }}>
            {oneliner}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {entry.location && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: '#C9A84C', letterSpacing: '0.05em' }}>
              {entry.location}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {formatDate(entry.date)}
          </span>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write V3 "Setlist" — Paper setlist card**

```tsx
function V3({ entry, backgroundUrl }: LiveMusicCardProps) {
  const { song } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{
      ...INNER,
      backgroundColor: '#F5F0E1',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {backgroundUrl && <BackgroundLayer url={backgroundUrl} gradient="strong" />}
      {/* Ruled lines */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.12,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(27,58,92,0.3) 39px, rgba(27,58,92,0.3) 40px)',
      }} />
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 32, padding: 80, ...Z2,
      }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.35em', textTransform: 'uppercase',
          color: '#8B7355',
        }}>
          Setlist
        </span>
        {song && (
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 700,
            color: '#1B3A5C', textAlign: 'center', lineHeight: 1.1, margin: 0,
          }}>
            {song}
          </h1>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: song ? 28 : 56,
          fontWeight: 700, color: song ? '#5A6B7A' : '#1B3A5C',
          textAlign: 'center', lineHeight: 1.1, margin: 0,
        }}>
          {entry.title}
        </h2>
        {entry.location && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 18, color: '#8B7355',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {entry.location}
          </span>
        )}
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 15, color: '#8B7355',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {formatDate(entry.date)}
        </span>
        {oneliner && (
          <p style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22,
            color: '#5A6B7A', textAlign: 'center', lineHeight: 1.6, maxWidth: 700,
            marginTop: 16,
          }}>
            &ldquo;{oneliner}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Write V4 "Vinyl" — Record sleeve**

```tsx
function V4({ entry, backgroundUrl }: LiveMusicCardProps) {
  const { song } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...INNER, alignItems: 'center', justifyContent: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Vinyl grooves — concentric rings */}
      <svg
        width={500} height={500}
        viewBox="0 0 500 500"
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, opacity: 0.08 }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <circle
            key={i}
            cx={250} cy={250}
            r={60 + i * 18}
            fill="none"
            stroke="#C9A84C"
            strokeWidth={0.8}
          />
        ))}
        <circle cx={250} cy={250} r={40} fill="none" stroke="#C9A84C" strokeWidth={2} />
        <circle cx={250} cy={250} r={8} fill="#C9A84C" opacity={0.3} />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 80, ...Z2 }}>
        {song && (
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 700,
            color: '#F0EDE8', textAlign: 'center', lineHeight: 1.1, margin: 0,
          }}>
            {song}
          </h1>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: song ? 28 : 56,
          fontWeight: 700, color: song ? '#C8C0B0' : '#F0EDE8',
          textAlign: 'center', lineHeight: 1.1, margin: 0,
        }}>
          {entry.title}
        </h2>
        {entry.location && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: '#C9A84C', letterSpacing: '0.1em' }}>
            {entry.location}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {formatDate(entry.date)}
        </span>
        {oneliner && (
          <p style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22,
            color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center',
            lineHeight: 1.6, maxWidth: 700, marginTop: 16,
          }}>
            {oneliner}
          </p>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Add forwardRef export with variant switch**

```tsx
export const LiveMusicCard = React.forwardRef<HTMLDivElement, LiveMusicCardProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) {
        case 2: return <V2 {...props} />
        case 3: return <V3 {...props} />
        case 4: return <V4 {...props} />
        default: return <V1 {...props} />
      }
    })()
    return <div ref={ref} style={ROOT}>{inner}</div>
  }
)
LiveMusicCard.displayName = 'LiveMusicCard'
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: Clean

- [ ] **Step 8: Commit**

```bash
git add src/export/templates/LiveMusicCard.tsx
git commit -m "feat(export): add LiveMusicCard template — 4 variants (Marquee, Poster, Setlist, Vinyl)"
```

### Task 5: Register templates in Studio + flavour filtering

**Files:**
- Modify: `src/pages/Studio.tsx`

- [ ] **Step 1: Add import**

Add with the other template imports (around line 31):

```typescript
import { LiveMusicCard } from '@/export/templates/LiveMusicCard'
```

- [ ] **Step 2: Extend TemplateId union**

Add to the `TemplateId` type (around line 48):

```typescript
  | 'live_music_v1' | 'live_music_v2' | 'live_music_v3' | 'live_music_v4'
```

- [ ] **Step 3: Add requiresFlavour to TemplateConfig**

```typescript
interface TemplateConfig {
  id: TemplateId
  label: string
  dims: string
  bgAspect?: '1:1' | '3:4' | '9:16'
  requiresFlavour?: string
}
```

- [ ] **Step 4: Register live music templates**

Add to `TEMPLATES_BY_TYPE.night_out` array (after the existing 4):

```typescript
  { id: 'live_music_v1', label: 'Marquee',  dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'live_music' },
  { id: 'live_music_v2', label: 'Poster',   dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'live_music' },
  { id: 'live_music_v3', label: 'Setlist',  dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'live_music' },
  { id: 'live_music_v4', label: 'Vinyl',    dims: '1080×1350', bgAspect: '3:4', requiresFlavour: 'live_music' },
```

- [ ] **Step 5: Filter availableTemplates by flavour**

Change the `availableTemplates` computed value (around line 614) from:

```typescript
const availableTemplates = selectedAchievement
  ? (TEMPLATES_BY_TYPE['achievement'] ?? [])
  : selectedEntry
    ? (TEMPLATES_BY_TYPE[selectedEntry.type] ?? [])
    : []
```

To:

```typescript
const availableTemplates = selectedAchievement
  ? (TEMPLATES_BY_TYPE['achievement'] ?? [])
  : selectedEntry
    ? (TEMPLATES_BY_TYPE[selectedEntry.type] ?? []).filter(t => {
        if (!t.requiresFlavour) return true
        const meta = selectedEntry.metadata as Record<string, unknown> | undefined
        return meta?.flavour === t.requiresFlavour
      })
    : []
```

- [ ] **Step 6: Add cases to TemplateRenderer switch**

In the `TemplateRenderer` function (around line 297), add after the night_out cases:

```typescript
    case 'live_music_v1':
      return <LiveMusicCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={1} />
    case 'live_music_v2':
      return <LiveMusicCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={2} />
    case 'live_music_v3':
      return <LiveMusicCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={3} />
    case 'live_music_v4':
      return <LiveMusicCard ref={innerRef} entry={entry} backgroundUrl={backgroundUrl} variant={4} />
```

- [ ] **Step 7: Type-check and build**

Run: `npx tsc --noEmit && npx vite build`
Expected: Clean build

- [ ] **Step 8: Commit**

```bash
git add src/pages/Studio.tsx
git commit -m "feat(studio): register Live Music templates + flavour-based filtering"
```

---

## Chunk 3: Documentation + Deploy

### Task 6: Update CLAUDE.md and push

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add Night Out flavours section to CLAUDE.md**

Add after the existing Night Out / Studio sections:

```markdown
## Night Out flavours
- `metadata.flavour`: optional tag — `'live_music'` or `'movie_night'` (undefined = regular).
- `metadata.song`: optional, only for `live_music` flavour.
- NightOutForm shows flavour pills (Regular / Live Music / Movie Night) below title. Song field appears when Live Music selected.
- Lore generation: `live_music` gets a piano-focused directive; other flavours and undefined fall back to standard Night Out directive.
- Studio: `LiveMusicCard` (4 variants: Marquee, Poster, Setlist, Vinyl) — no BrandMark, registered with `requiresFlavour: 'live_music'`. Only shown when entry has matching flavour. Regular Night Out V1-V4 always shown.
```

- [ ] **Step 2: Commit and push**

```bash
git add CLAUDE.md
git commit -m "docs: add Night Out flavours to CLAUDE.md"
git push
```

- [ ] **Step 3: Verify deploy**

Run: `gh run list --limit 1`
Expected: Deploy running or completed
