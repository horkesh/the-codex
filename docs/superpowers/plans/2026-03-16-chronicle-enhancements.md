# Chronicle Enhancements Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 12 features across search, favourites, photo views, stats visualisation, automation, privacy, social tagging, and achievement sharing to elevate the Chronicle experience.

**Architecture:** Features are grouped into 4 independent bundles. Each bundle produces working, testable software and ends with a `/simplify` pass + commit. All features follow existing patterns: Supabase for data, Zustand for client state, Tailwind + Framer Motion for UI, Edge Functions for AI/automation.

**Tech Stack:** React 19, TypeScript, Supabase (Postgres + Edge Functions), Tailwind v4, Framer Motion, Zustand, Claude API, Lucide icons.

**Codebase patterns:**
- Data functions in `src/data/*.ts` (thin Supabase client wrappers)
- Hooks in `src/hooks/*.ts` (state + async loading)
- Pages in `src/pages/*.tsx` (route-level components)
- Components in `src/components/<section>/*.tsx`
- Edge Functions in `supabase/functions/<name>/index.ts`
- Types in `src/types/app.ts`
- No test framework configured — verify via `npx tsc --noEmit` + manual testing
- Design system: obsidian `#0a0a0f`, gold `#c9a84c`, ivory `#f5f0e8`, fonts Playfair Display + Instrument Sans
- No emojis in UI

---

## Bundle 1: Search + Pin/Favourite

### Task 1.1: Add `pinned` column to entries

**Files:**
- Modify: `src/types/app.ts` — add `pinned` field to Entry interface
- Modify: `src/types/database.ts` — add `pinned` to entries Row/Insert/Update types
- Modify: `src/data/entries.ts` — add `togglePin(entryId, pinned)` function; update `fetchEntries` to order pinned first

**DB migration** (run in Supabase SQL editor):
```sql
ALTER TABLE entries ADD COLUMN pinned boolean NOT NULL DEFAULT false;
```

- [ ] **Step 1:** Add `pinned: boolean` to the `Entry` interface in `src/types/app.ts` (after `status` field)
- [ ] **Step 2:** Add `pinned` to entries Row, Insert, and Update types in `src/types/database.ts`
- [ ] **Step 3:** Add `togglePin` function in `src/data/entries.ts`:
```typescript
export async function togglePin(entryId: string, pinned: boolean): Promise<void> {
  const { error } = await supabase.from('entries').update({ pinned }).eq('id', entryId)
  if (error) throw error
}
```
- [ ] **Step 4:** Update `fetchEntries` ordering to: `pinned DESC, date DESC`
- [ ] **Step 5:** Run `npx tsc --noEmit` to verify types

### Task 1.2: Pin button on EntryCard + EntryDetail

**Files:**
- Modify: `src/components/chronicle/EntryCard.tsx` — add pin icon toggle
- Modify: `src/pages/EntryDetail.tsx` — add pin option to overflow menu

- [ ] **Step 1:** Read `EntryCard.tsx` to understand the card layout and existing actions
- [ ] **Step 2:** Add a small `Pin` icon (from lucide-react) in the top-right of EntryCard. When pinned, show filled gold pin; when unpinned, show outline pin on hover only. Call `togglePin` on click, optimistically update local state.
- [ ] **Step 3:** In `EntryDetail.tsx`, add "Pin Entry" / "Unpin Entry" to the OptionsMenu (similar pattern to existing menu items). Use `Pin` icon from lucide-react.
- [ ] **Step 4:** In `Chronicle.tsx`, pinned entries should render first with a subtle gold left-border accent (like the Studio entry selector pattern: `borderLeftWidth: '3px', borderLeftColor: '#C9A84C'`)
- [ ] **Step 5:** Run `npx tsc --noEmit`

### Task 1.3: Search bar on Chronicle

**Files:**
- Create: `src/components/chronicle/SearchBar.tsx` — search input component
- Modify: `src/hooks/useChronicle.ts` — add `query` to filters, filter entries client-side
- Modify: `src/pages/Chronicle.tsx` — render SearchBar above filters

- [ ] **Step 1:** Read `useChronicle.ts` and `Chronicle.tsx` to understand current filter flow
- [ ] **Step 2:** Create `SearchBar.tsx`:
  - Sticky search input with `Search` icon (lucide-react)
  - Debounced (300ms) text input
  - Matches against: `entry.title`, `entry.description`, `entry.location`, `entry.city`, `entry.lore`
  - Style: `bg-slate-mid border border-white/10 rounded-lg` matching existing form inputs
  - Clear button (X icon) when query is non-empty
- [ ] **Step 3:** Add `query?: string` to the filters in `useChronicle.ts`. Filter entries client-side using case-insensitive substring matching across title, description, location, city, and lore fields.
- [ ] **Step 4:** Render `SearchBar` in `Chronicle.tsx` above `ChronicleFilters`, only when entries exist
- [ ] **Step 5:** Run `npx tsc --noEmit`
- [ ] **Step 6:** Commit Bundle 1, run `/simplify`

---

## Bundle 2: Photo Timeline + Steak Ratings Chart

### Task 2.1: Photo Timeline page

**Files:**
- Create: `src/pages/PhotoTimeline.tsx` — full-screen photo gallery grouped by month
- Create: `src/data/photos.ts` — fetch all photos across entries
- Modify: `src/App.tsx` — add route `/chronicle/photos`
- Modify: `src/pages/Chronicle.tsx` — add "Photos" link/button near the top

- [ ] **Step 1:** Create `src/data/photos.ts`:
```typescript
export interface TimelinePhoto {
  id: string
  url: string
  entry_id: string
  entry_title: string
  entry_type: EntryType
  entry_date: string
  sort_order: number
}

export async function fetchAllPhotos(): Promise<TimelinePhoto[]> {
  // Join entry_photos with entries, ordered by entry.date DESC, sort_order ASC
  // Select: photo.id, photo.url, photo.sort_order, entry.id, entry.title, entry.type, entry.date
}
```
- [ ] **Step 2:** Create `PhotoTimeline.tsx`:
  - TopBar with "Photos" title + back button
  - Group photos by month (e.g. "March 2026", "February 2026")
  - Render as a masonry-style grid (3 columns) with month headers
  - Each photo is tappable → navigates to `/chronicle/{entry_id}`
  - Show entry type icon overlay in bottom-left corner of each photo
  - Use `staggerContainer`/`staggerItem` for entrance animation
- [ ] **Step 3:** Add route in `App.tsx`: `<Route path="/chronicle/photos" element={<PhotoTimeline />} />`
- [ ] **Step 4:** Add a small `ImageIcon` button/link in Chronicle.tsx header area that navigates to `/chronicle/photos`
- [ ] **Step 5:** Run `npx tsc --noEmit`

### Task 2.2: Steak Ratings Chart in Ledger

**Files:**
- Create: `src/components/ledger/SteakRatingsChart.tsx` — visual chart of steak scores over time
- Modify: `src/pages/Ledger.tsx` — add SteakRatingsChart after SommelierSection
- Modify: `src/data/stats.ts` — add `fetchSteakRatings()` function

- [ ] **Step 1:** Add to `src/data/stats.ts`:
```typescript
export interface SteakRating {
  entry_id: string
  title: string
  location: string | null
  date: string
  score: number
  cut: string | null
}

export async function fetchSteakRatings(): Promise<SteakRating[]> {
  // Fetch all steak entries, extract metadata.score and metadata.cut
  // Order by date ASC for chart display
}
```
- [ ] **Step 2:** Create `SteakRatingsChart.tsx`:
  - Pure CSS/HTML chart (no chart library — keep it lightweight)
  - Horizontal bar chart: each steak entry is a row
  - Row: date (left), bar filled to score/10 width in gold, score number (right)
  - Cut label shown if available
  - Location shown as subtitle
  - Average line shown as a dashed vertical indicator
  - Style: dark bg, gold bars, ivory text, matching Ledger aesthetic
- [ ] **Step 3:** Add `<SteakRatingsChart />` to `Ledger.tsx` after the existing `SommelierSection`, wrapped in the same section pattern (label + content)
- [ ] **Step 4:** Run `npx tsc --noEmit`
- [ ] **Step 5:** Commit Bundle 2, run `/simplify`

---

## Bundle 3: PS5 Streaks + Weekly Digest Cron + Prospect Auto-nudge

### Task 3.1: PS5 Win Streak Tracker

**Files:**
- Create: `src/components/ledger/PS5StreaksSection.tsx` — streak visualisation
- Modify: `src/data/stats.ts` — add `fetchPS5Streaks()` function
- Modify: `src/pages/Ledger.tsx` — add PS5StreaksSection after PS5Rivalry

- [ ] **Step 1:** Add to `src/data/stats.ts`:
```typescript
export interface PS5Streak {
  alias: GentAlias
  currentStreak: number
  longestStreak: number
  lastResult: 'win' | 'loss' | 'draw' | null
}

export async function fetchPS5Streaks(): Promise<PS5Streak[]> {
  // Fetch all PS5 entries ordered by date ASC
  // For each entry, iterate metadata.matches
  // Track consecutive wins per gent (reset on loss/draw)
  // Return current streak + longest streak per gent
}
```
- [ ] **Step 2:** Create `PS5StreaksSection.tsx`:
  - 3 gent cards side by side
  - Each shows: alias label, current streak (large gold number + "W" suffix), longest streak (smaller, below)
  - Fire emoji... wait, no emojis. Use a gold crown icon (Crown from lucide) next to the longest-streak holder
  - Active streak gets a pulsing gold dot indicator
- [ ] **Step 3:** Add to Ledger.tsx after PS5Rivalry section
- [ ] **Step 4:** Run `npx tsc --noEmit`

### Task 3.2: Wire Weekly Digest to Cron

**Files:**
- Modify: `supabase/functions/send-weekly-digest/index.ts` — verify it works as-is
- Create: `.github/workflows/weekly-digest.yml` — GitHub Actions cron schedule

- [ ] **Step 1:** Read `send-weekly-digest/index.ts` to verify it's functional
- [ ] **Step 2:** Create `.github/workflows/weekly-digest.yml`:
```yaml
name: Weekly Digest
on:
  schedule:
    - cron: '0 7 * * 1'  # Every Monday at 7:00 UTC
  workflow_dispatch: {}    # Allow manual trigger

jobs:
  send:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger weekly digest
        run: |
          curl -s -X POST \
            "${{ secrets.SUPABASE_URL }}/functions/v1/send-weekly-digest" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            -d '{}'
```
- [ ] **Step 3:** Verify the required secrets (`SUPABASE_URL`, `SUPABASE_ANON_KEY`) are set in the repo, or document that they need to be added

### Task 3.3: Prospect Auto-nudge

**Files:**
- Modify: `src/pages/Chronicle.tsx` — show prospect nudge banner when a scouted event's date has arrived
- Modify: `src/data/prospects.ts` — add `fetchDueProspects()` function

- [ ] **Step 1:** Read `src/data/prospects.ts` to understand the prospect data model and existing functions
- [ ] **Step 2:** Add `fetchDueProspects()`:
```typescript
export async function fetchDueProspects(): Promise<Prospect[]> {
  // Fetch prospects where:
  //   status = 'prospect'
  //   event_date <= today
  //   event_date >= 7 days ago (don't show ancient ones)
  // Order by event_date DESC
}
```
- [ ] **Step 3:** In `Chronicle.tsx`, add a nudge banner above the entry list when due prospects exist:
  - Gold-accented banner: "You scouted [event_name] — ready to log it?"
  - "Log Entry" button → navigates to `/chronicle/new?from=prospect&id={prospect.id}`
  - "Dismiss" button → calls `updateProspect(id, { status: 'passed' })`
  - Only show the most recent due prospect (not all of them)
- [ ] **Step 4:** Run `npx tsc --noEmit`
- [ ] **Step 5:** Commit Bundle 3, run `/simplify`

---

## Bundle 4: Private Entries + Contact Quick-add + Achievement Cards + Photo Tagging

### Task 4.1: Private Entries

**Files:**
- Modify: `src/types/app.ts` — add `visibility: 'shared' | 'private'` to Entry
- Modify: `src/types/database.ts` — add visibility to Row/Insert/Update
- Modify: `src/data/entries.ts` — filter private entries to creator only in `fetchEntries`
- Modify: `src/pages/EntryNew.tsx` — add visibility toggle to form
- Modify: `src/components/chronicle/EntryCard.tsx` — show lock icon for private entries

**DB migration:**
```sql
ALTER TABLE entries ADD COLUMN visibility text NOT NULL DEFAULT 'shared' CHECK (visibility IN ('shared', 'private'));
```

- [ ] **Step 1:** Add `visibility: 'shared' | 'private'` to Entry interface and database types
- [ ] **Step 2:** In `fetchEntries`, add RLS-like client filter: if entry.visibility === 'private' and entry.created_by !== currentGentId, exclude it. Pass `currentGentId` as an optional parameter.
- [ ] **Step 3:** In `EntryNew.tsx`, add a small toggle at the bottom of the form (before the submit button): "Private — only you can see this entry". Use a `Lock`/`Unlock` icon toggle. Default: 'shared'.
- [ ] **Step 4:** In `EntryCard.tsx`, show a small `Lock` icon (12px, `text-ivory-dim`) next to the date for private entries
- [ ] **Step 5:** Run `npx tsc --noEmit`

### Task 4.2: Contact Quick-add from Entry

**Files:**
- Create: `src/components/chronicle/ContactTagger.tsx` — search + tag people from Circle
- Modify: `src/data/people.ts` — add `fetchPeopleQuick()` for name search
- Modify: `src/pages/EntryNew.tsx` — render ContactTagger below ParticipantSelector
- Modify: `src/data/entries.ts` — add `addPersonAppearances(entryId, personIds)` function

- [ ] **Step 1:** Read `src/data/people.ts` to understand the people data layer
- [ ] **Step 2:** Add `fetchPeopleQuick()` in `src/data/people.ts`:
```typescript
export async function fetchPeopleQuick(query?: string): Promise<Array<{ id: string; name: string; photo_url: string | null }>> {
  // Fetch people (contacts + POIs) with name, photo_url
  // If query provided, filter by ilike on name
  // Limit 20, order by name
}
```
- [ ] **Step 3:** Add `addPersonAppearances()` in `src/data/entries.ts`:
```typescript
export async function addPersonAppearances(entryId: string, personIds: string[], gentId: string): Promise<void> {
  // Upsert into person_appearances: { entry_id, person_id, noted_by: gentId }
}
```
- [ ] **Step 4:** Create `ContactTagger.tsx`:
  - Compact component: "Tag people present" label
  - Search input that filters contacts by name
  - Selected contacts shown as small avatar chips (removable)
  - On submit in EntryNew, call `addPersonAppearances` after entry creation
- [ ] **Step 5:** In `EntryNew.tsx`, render `<ContactTagger>` below `<ParticipantSelector>`, storing selected person IDs in state. In `handleSubmit`, call `addPersonAppearances` after entry creation.
- [ ] **Step 6:** Run `npx tsc --noEmit`

### Task 4.3: Achievement Sharing Cards (Studio)

**Files:**
- Create: `src/export/templates/AchievementCard.tsx` — export template for achievements
- Modify: `src/pages/Studio.tsx` — add achievement template option (standalone like Wrapped)
- Modify: `src/pages/Studio.tsx` — add achievement data loading

- [ ] **Step 1:** Read an existing simple template (e.g. `InterludeCard.tsx`) to understand the forwardRef + 1080×1350 pattern
- [ ] **Step 2:** Create `AchievementCard.tsx`:
  - 1080×1350 canvas, obsidian background
  - Large gold achievement icon/badge centered
  - Achievement name (Playfair Display, 60px)
  - Description below (Instrument Sans, 24px, ivory-dim)
  - "Earned by: [Gent Name]" + date
  - BrandMark at bottom
  - GoldRule separator
- [ ] **Step 3:** In Studio.tsx, add an "achievement" standalone type (like "annual" for Wrapped):
  - Add achievement selector UI when this template is chosen
  - Fetch achievements via existing `fetchAchievements()`
  - Pass selected achievement data to the template
- [ ] **Step 4:** Run `npx tsc --noEmit`

### Task 4.4: Photo Auto-tagging with AI

**Files:**
- Modify: `supabase/functions/generate-lore/index.ts` — return identified gents alongside lore
- Modify: `src/ai/lore.ts` — parse gent identifications from response
- Modify: `src/pages/EntryNew.tsx` — auto-tag identified gents in person_appearances
- Create: `src/data/photoTags.ts` — functions to store/fetch photo-person associations

- [ ] **Step 1:** In `generate-lore/index.ts`, modify the prompt to also return structured identification:
  - After the lore text, add: `\n\nAlso return a JSON line at the very end: IDENTIFIED: ["alias1", "alias2"] listing which gents you identified in the photos (use aliases: lorekeeper, bass, keys). If you cannot identify anyone, return IDENTIFIED: []`
  - Parse the `IDENTIFIED: [...]` line from the response, strip it from the lore text
- [ ] **Step 2:** Update `src/ai/lore.ts` to return `{ lore: string, identifiedGents: string[] }` instead of just `string`
- [ ] **Step 3:** In EntryNew.tsx, after `generateLore` completes, if identifiedGents are returned, log them (this connects to the mind map's person_appearances). For now, auto-select matching gents in the participant selector if they weren't already selected.
- [ ] **Step 4:** Run `npx tsc --noEmit`
- [ ] **Step 5:** Commit Bundle 4, run `/simplify`

---

## Execution Order

1. **Bundle 1** → Search + Pin → commit → `/simplify`
2. **Bundle 2** → Photo Timeline + Steak Chart → commit → `/simplify`
3. **Bundle 3** → PS5 Streaks + Digest Cron + Prospect Nudge → commit → `/simplify`
4. **Bundle 4** → Private + Contact Tag + Achievement Cards + Photo Tag → commit → `/simplify`

Each bundle is independent and produces working features on its own.
