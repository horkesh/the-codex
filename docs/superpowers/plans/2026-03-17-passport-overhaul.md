# Passport Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the passport from a basic stamp grid into a rich travel document with visa pages, aged paper texture, achievements, AI mission debriefs from photos, and travel intel.

**Architecture:** 5 independent phases. Phase 1 creates a new VisaPage route for mission stamps. Phase 2 adds CSS textures. Phase 3 renders achievements. Phase 4 adds a new edge function for AI debriefs from photos, displayed on VisaPage. Phase 5 adds AI travel intel to the cover. Each phase commits independently.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Framer Motion, Claude Sonnet (debriefs) + Claude Haiku (travel intel), Supabase Edge Functions (Deno).

**Spec:** `docs/superpowers/specs/2026-03-17-passport-overhaul-design.md`

---

## File Structure

| File | Action | Phase | Responsibility |
|---|---|---|---|
| `src/pages/VisaPage.tsx` | Create | 1 | Full visa page for mission stamps |
| `src/App.tsx` | Modify | 1 | Add `/passport/visa/:stampId` route |
| `src/pages/Passport.tsx` | Modify | 1 | Navigate to visa page on mission stamp tap |
| `src/components/passport/StampGrid.tsx` | Modify | 2 | Paper texture background |
| `src/components/passport/StampDetail.tsx` | Modify | 2 | Paper bg + larger stamp for non-mission |
| `src/components/passport/PassportCover.tsx` | Modify | 2,5 | Leather texture + travel intel section |
| `src/components/passport/AchievementList.tsx` | Create | 3 | Earned + locked achievements rendering |
| `src/pages/Passport.tsx` | Modify | 3 | Render AchievementList in achievements tab |
| `supabase/functions/generate-mission-debrief/index.ts` | Create | 4 | Claude Sonnet debrief from photos |
| `src/ai/debrief.ts` | Create | 4 | Client wrapper for debrief edge function |
| `src/pages/VisaPage.tsx` | Modify | 4 | Add debrief section + generate button |
| `src/ai/travelIntel.ts` | Create | 5 | Client function for travel intel |

---

## Task 1: Visa Page (Phase 1)

**Files:**
- Create: `src/pages/VisaPage.tsx`
- Modify: `src/App.tsx` — add route
- Modify: `src/pages/Passport.tsx` — navigate to visa page for mission stamps

- [ ] **Step 1: Create VisaPage component**

Create `src/pages/VisaPage.tsx`. The page:
- Reads `stampId` from URL params via `useParams`
- Fetches stamp via `fetchStamp(stampId)` from `src/data/stamps.ts`
- If stamp has `entry_id`, fetches entry via `fetchEntry(entry_id)` and photos via `fetchEntryPhotos(entry_id)`
- Renders:
  - TopBar with title "Mission Dossier" and back button
  - PageWrapper with aged paper background: `bg-gradient-to-br from-[#1a1610] via-[#0f0d0a] to-[#1a1610]`
  - "MISSION DOSSIER" header in `font-mono tracking-[0.3em] text-gold-muted text-[10px] uppercase`
  - Stamp image (120px, rotated -8deg) positioned absolute top-right
  - Entry title in `font-display text-2xl text-ivory`
  - Date in `font-mono text-[11px] text-ivory-dim` using `formatDate`
  - City, country with `flagEmoji(country_code)` in `font-mono`
  - Participant avatars row (from `entry.participants`)
  - Lore in italic if available
  - Mission debrief section — placeholder for Phase 4: show `entry.metadata.mission_debrief` if exists, otherwise nothing yet
  - Photo strip: horizontal scroll of up to 6 photos from `fetchEntryPhotos`
  - Landmarks pills if `entry.metadata.landmarks` exists
  - "View Full Entry" button at bottom navigating to `/chronicle/${entry.id}`

Loading state: Spinner centered. Not found state: "Stamp not found" with back button.

- [ ] **Step 2: Add route to App.tsx**

Add before the `/passport` route:
```tsx
<Route path="/passport/visa/:stampId" element={<ProtectedRoute><VisaPage /></ProtectedRoute>} />
```

Import `VisaPage` with lazy loading matching existing pattern.

- [ ] **Step 3: Navigate to visa page for mission stamps**

In `src/pages/Passport.tsx`, change `onStampPress` behavior. When a mission stamp is tapped, navigate to `/passport/visa/${stamp.id}` instead of opening StampDetail modal. Non-mission stamps still open StampDetail.

```tsx
const handleStampPress = useCallback((stamp: PassportStamp) => {
  if (stamp.type === 'mission') {
    navigate(`/passport/visa/${stamp.id}`)
  } else {
    setSelectedStamp(stamp)
  }
}, [navigate])
```

Pass `handleStampPress` to StampGrid instead of `setSelectedStamp`.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```
git add src/pages/VisaPage.tsx src/App.tsx src/pages/Passport.tsx
git commit -m "feat(passport): visa page — full mission dossier on stamp tap"
```

---

## Task 2: Passport Texture & Feel (Phase 2)

**Files:**
- Modify: `src/components/passport/StampGrid.tsx`
- Modify: `src/components/passport/StampDetail.tsx`
- Modify: `src/components/passport/PassportCover.tsx`

- [ ] **Step 1: Add paper texture to StampGrid**

Wrap the stamp grid container in a div with:
```tsx
className="bg-gradient-to-br from-[#1a1610] via-[#0f0d0a] to-[#1a1610] border border-gold/8 rounded-xl p-4"
style={{ boxShadow: 'inset 0 0 40px rgba(201,168,76,0.03)' }}
```

- [ ] **Step 2: Add paper texture to StampDetail**

Add the same gradient background to the StampDetail modal content div. Make the stamp image 160px instead of 192px (48 → 40 in className `w-40 h-40`).

- [ ] **Step 3: Add leather texture to PassportCover**

Add to the outermost cover container:
```tsx
style={{
  backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(201,168,76,0.02) 2px, rgba(201,168,76,0.02) 4px)',
  boxShadow: 'inset 0 0 60px rgba(201,168,76,0.05)',
}}
```

- [ ] **Step 4: Verify build + commit**

```
npx tsc --noEmit
git add src/components/passport/StampGrid.tsx src/components/passport/StampDetail.tsx src/components/passport/PassportCover.tsx
git commit -m "feat(passport): aged paper texture on stamps + leather cover"
```

---

## Task 3: Achievements Tab (Phase 3)

**Files:**
- Create: `src/components/passport/AchievementList.tsx`
- Modify: `src/pages/Passport.tsx`

- [ ] **Step 1: Create AchievementList component**

Create `src/components/passport/AchievementList.tsx`:
- Props: none (fetches its own data)
- On mount: call `fetchEarnedAchievements(gent.id)` from `src/data/achievements.ts`
- Import `ACHIEVEMENT_DEFINITIONS` for the full list, `useAuthStore` for gent
- Compare earned vs all definitions to determine locked/unlocked
- Render earned achievements first (gold), then locked (greyed):

Earned item:
```tsx
<div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gold/20 bg-gold/5">
  <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center shrink-0">
    <Trophy size={18} className="text-gold" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm text-ivory font-body font-medium">{name}</p>
    <p className="text-xs text-ivory-dim font-body">{description}</p>
  </div>
  <span className="text-[10px] font-mono text-gold-muted shrink-0">{formatDate(earned_at)}</span>
</div>
```

Locked item:
```tsx
<div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-white/5 opacity-40">
  <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
    <Lock size={18} className="text-ivory-dim" />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm text-ivory-dim font-body font-medium">{name}</p>
    <p className="text-xs text-ivory-dim/50 font-body">???</p>
  </div>
</div>
```

- [ ] **Step 2: Wire into Passport.tsx achievements tab**

Replace the empty `<div className="px-4 pb-6" />` in the achievements tab with `<AchievementList />`.

- [ ] **Step 3: Verify build + commit**

```
npx tsc --noEmit
git add src/components/passport/AchievementList.tsx src/pages/Passport.tsx
git commit -m "feat(passport): achievements tab — earned + locked achievements"
```

---

## Task 4: AI Mission Debrief (Phase 4)

**Files:**
- Create: `supabase/functions/generate-mission-debrief/index.ts`
- Create: `src/ai/debrief.ts`
- Modify: `src/pages/VisaPage.tsx`

- [ ] **Step 1: Create edge function**

Create `supabase/functions/generate-mission-debrief/index.ts`:
- Model: `claude-sonnet-4-6` with vision
- Input: `{ entry, photoUrls }` (same pattern as generate-lore)
- Import `GENT_VISUAL_ID` from `../_shared/gent-identities.ts`
- Prompt instructs Claude to:
  - Analyze all photos as chapters of a mission
  - Identify locations, landmarks, food, activities, people (using gent identities)
  - Write a 2-3 paragraph "CLASSIFIED MISSION DEBRIEF" in diplomatic language
  - Extract landmarks as a list
  - Extract 3-5 highlights
  - Write a tongue-in-cheek 1-sentence risk assessment
- Response format:
  ```
  <debrief>The 2-3 paragraph narrative.</debrief>
  <landmarks>Landmark 1, Landmark 2, Landmark 3</landmarks>
  <highlights>Highlight 1|Highlight 2|Highlight 3</highlights>
  <risk>One sentence risk assessment.</risk>
  ```
- Parse structured response, return JSON: `{ debrief, landmarks, highlights, risk_assessment }`
- CORS headers, error handling matching existing edge function patterns
- AbortController with 25s timeout (Supabase free tier limit)

- [ ] **Step 2: Create client wrapper**

Create `src/ai/debrief.ts`:
```typescript
import { supabase } from '@/lib/supabase'
import type { EntryWithParticipants } from '@/types/app'

export interface MissionDebrief {
  debrief: string
  landmarks: string[]
  highlights: string[]
  risk_assessment: string
}

export async function generateMissionDebrief(
  entry: EntryWithParticipants,
  photoUrls: string[],
): Promise<MissionDebrief | null> {
  try {
    const { data, error } = await supabase.functions.invoke('generate-mission-debrief', {
      body: { entry, photoUrls },
    })
    if (error) throw error
    if (!data?.debrief) return null
    return data as MissionDebrief
  } catch (err) {
    console.error('generate-mission-debrief failed:', err)
    return null
  }
}
```

- [ ] **Step 3: Add debrief section to VisaPage**

In `src/pages/VisaPage.tsx`, after the lore section:
- If `entry.metadata.mission_debrief` exists, render it:
  - "CLASSIFIED" header in monospace gold
  - Debrief text in body font, leading-relaxed
  - Landmarks as gold-bordered pills in a flex-wrap row
  - Highlights as a numbered list
  - Risk assessment in a bordered box with "RISK ASSESSMENT" header
- If no debrief exists, show a "Generate Mission Debrief" button (gold outline, Sparkles icon)
- On click: call `generateMissionDebrief(entry, photoUrls)`, show spinner
- On success: save to metadata via `updateEntry(entry.id, { metadata: { ...meta, mission_debrief, landmarks, debrief_highlights, risk_assessment } })`
- Update local state to display immediately
- "Regenerate" button appears after first generation

- [ ] **Step 4: Deploy edge function**

```
npx supabase functions deploy generate-mission-debrief --project-ref biioztjlsrkgwjyfegey
```

- [ ] **Step 5: Verify build + commit**

```
npx tsc --noEmit
git add supabase/functions/generate-mission-debrief/index.ts src/ai/debrief.ts src/pages/VisaPage.tsx
git commit -m "feat(passport): AI mission debrief from photos — classified narrative on visa page"
```

---

## Task 5: Travel Intel Summary (Phase 5)

**Files:**
- Create: `src/ai/travelIntel.ts`
- Modify: `src/components/passport/PassportCover.tsx`

- [ ] **Step 1: Create travel intel client function**

Create `src/ai/travelIntel.ts`:
```typescript
import { supabase } from '@/lib/supabase'

const CACHE_KEY = 'codex_travel_intel'
const CACHE_DAYS = 7

interface CachedIntel { text: string; gentId: string; timestamp: number }

function getCached(gentId: string): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const cached: CachedIntel = JSON.parse(raw)
    if (cached.gentId !== gentId) return null
    if (Date.now() - cached.timestamp > CACHE_DAYS * 86400000) return null
    return cached.text
  } catch { return null }
}

function setCache(gentId: string, text: string) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ text, gentId, timestamp: Date.now() }))
}

export async function generateTravelIntel(
  gentId: string,
  stats: { missions: number; countries: number; cities: string[]; topCity: string; topCityCount: number },
): Promise<string | null> {
  const cached = getCached(gentId)
  if (cached) return cached

  try {
    const { data, error } = await supabase.functions.invoke('generate-title', {
      body: {
        lore: `Travel stats: ${stats.missions} missions across ${stats.countries} countries. Cities visited: ${stats.cities.join(', ')}. Most visited: ${stats.topCity} (${stats.topCityCount} times).`,
        entryType: 'mission',
      },
    })
    // Repurpose the generate-title endpoint with a custom prompt won't work well.
    // Instead, call Claude Haiku directly via the existing pattern:
    const response = await supabase.functions.invoke('generate-lore', {
      body: {
        entry: {
          type: 'mission',
          title: 'Travel Intelligence Summary',
          date: new Date().toISOString().split('T')[0],
          description: `Generate a 2-sentence intelligence briefing about this operative's travel patterns. Stats: ${stats.missions} missions, ${stats.countries} countries. Cities: ${stats.cities.join(', ')}. Most visited: ${stats.topCity} (${stats.topCityCount} visits). Write in formal diplomatic language, third person ("The subject..."). No hashtags, no emojis.`,
          metadata: {},
          city: null,
          country: null,
          location: null,
          participants: [],
        },
      },
    })
    if (response.error) throw response.error
    const text = response.data?.lore
    if (text) {
      setCache(gentId, text)
      return text
    }
    return null
  } catch {
    return null
  }
}
```

Actually, this is hacky — repurposing generate-lore. Simpler approach: just compose the intel text from stats client-side, no AI needed. The stats alone are compelling:

```typescript
export function composeTravelIntel(stats: {
  missions: number
  countries: number
  cities: string[]
  topCity: string
  topCityCount: number
}): string {
  const cityList = stats.cities.slice(0, 5).join(', ')
  const more = stats.cities.length > 5 ? ` and ${stats.cities.length - 5} more` : ''
  return `${stats.missions} missions across ${stats.countries} countries. Primary theatre of operations: ${stats.topCity} (${stats.topCityCount} deployments). Known coordinates: ${cityList}${more}.`
}
```

Use this for now — AI intel can be added later as a separate feature without blocking.

- [ ] **Step 2: Add travel intel section to PassportCover**

In `src/components/passport/PassportCover.tsx`, add a new section below the stats box:

```tsx
{/* Travel Intel */}
<div className="mx-6 mt-4 px-4 py-3 rounded-lg border border-gold/10 bg-gold/3">
  <p className="text-[10px] font-mono tracking-[0.2em] text-gold-muted uppercase mb-1.5">Travel Intelligence</p>
  <p className="text-xs text-ivory-dim font-body leading-relaxed">{intelText}</p>
</div>
```

The `intelText` is computed from the stamp data passed to PassportCover. Add `cities` to the PassportCover props (already has `stampCount` and `countryCount`). Compute top city from mission stamps in Passport.tsx and pass down.

- [ ] **Step 3: Verify build + commit**

```
npx tsc --noEmit
git add src/ai/travelIntel.ts src/components/passport/PassportCover.tsx src/pages/Passport.tsx
git commit -m "feat(passport): travel intel summary on cover page"
```

---

## Task 6: Final Integration + /simplify + Docs

- [ ] **Step 1: Full build**

```
npx tsc --noEmit
```

- [ ] **Step 2: Deploy any new edge functions**

```
npx supabase functions deploy generate-mission-debrief --project-ref biioztjlsrkgwjyfegey
```

- [ ] **Step 3: Update CLAUDE.md**

Document all new features: visa pages, texture, achievements tab, AI debriefs, travel intel.

- [ ] **Step 4: Push**

```
git push
```
