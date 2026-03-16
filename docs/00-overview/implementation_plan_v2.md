# Implementation Plan v2 — Engagement & Polish

Phased build plan for the features in `feature_wishlist.md`.
Each phase ends with a `/simplify` pass before moving on.
Intended to be run autonomously via Ralph.

---

## Phase 1 — Polish & Identity (no new tables)

**Goal**: High-impact changes using only existing data. Zero schema migrations.

### Tasks

- [x] **Animated reactions** — Burst particles in `EntryReactions.tsx` (float-up + fade-out on tap)

- [x] **Trophy case on gent profiles** — "Honours" section in `GentProfile.tsx` showing achievements + thresholds

- [x] **Signature stat** — `deriveSignatureStat` in `GentProfile.tsx` (threshold labels + relative-to-group fallback)

- [x] **`/simplify`** — verified clean

---

## Phase 2 — Entry Comments

**Goal**: Let gents leave short text notes on any entry. Live updates.

### Schema
Migration `20260318000004_entry_comments.sql`:
```sql
CREATE TABLE IF NOT EXISTS entry_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  gent_id uuid NOT NULL REFERENCES gents(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(body) <= 280),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE entry_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY ec_select ON entry_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY ec_insert ON entry_comments FOR INSERT TO authenticated WITH CHECK (gent_id = auth.uid());
CREATE POLICY ec_delete ON entry_comments FOR DELETE TO authenticated USING (gent_id = auth.uid());
CREATE INDEX idx_ec_entry ON entry_comments(entry_id);
```

### Tasks

- [ ] Run migration, update `database.ts` with `entry_comments` Row/Insert/Update types

- [ ] `src/types/app.ts` — add `EntryComment` interface: `{ id, entry_id, gent_id, body, created_at, gent?: Gent }`

- [ ] `src/data/entryComments.ts` — `fetchComments(entryId)` (select with gent join), `addComment(entryId, gentId, body)`, `deleteComment(id)`

- [ ] `src/hooks/useComments.ts` — fetches comments for an entry, subscribes to Supabase Realtime channel `entry_comments:entry_id=eq.{id}`, cleans up on unmount. Returns `{ comments, loading, addComment, deleteComment }`.

- [ ] `src/components/chronicle/CommentsSection.tsx` — shows comment list (gent avatar + name + body + time), a single-line input with send button at the bottom. Own comment gets a delete button. Input clears on send. `maxLength={280}`.

- [ ] Wire `CommentsSection` into `EntryDetail.tsx` — below `PeoplePresent`, above the bottom padding.

- [ ] **`/simplify`** — run simplify pass on all Phase 2 changes

---

## Phase 3 — Prospect Voting

**Goal**: Let gents respond to shared prospects with "I'm in" or "Pass".

### Schema
Migration `20260318000005_prospect_votes.sql`:
```sql
CREATE TABLE IF NOT EXISTS prospect_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id uuid NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
  gent_id uuid NOT NULL REFERENCES gents(id) ON DELETE CASCADE,
  vote text NOT NULL CHECK (vote IN ('in', 'pass')),
  created_at timestamptz DEFAULT now(),
  UNIQUE(prospect_id, gent_id)
);
ALTER TABLE prospect_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY pv_select ON prospect_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY pv_insert ON prospect_votes FOR INSERT TO authenticated WITH CHECK (gent_id = auth.uid());
CREATE POLICY pv_upsert ON prospect_votes FOR UPDATE TO authenticated USING (gent_id = auth.uid());
```

### Tasks

- [ ] Run migration, update `database.ts`

- [ ] `src/types/app.ts` — add `ProspectVote: { id, prospect_id, gent_id, vote: 'in'|'pass', created_at }`

- [ ] `src/data/prospectVotes.ts` — `fetchVotesForProspects(prospectIds[])`, `upsertVote(prospectId, gentId, vote)`

- [ ] `ProspectCard` component — add a vote strip below the thumbnail (only on `visibility === 'shared'` prospects). Three avatar slots (one per gent) with a colour indicator: green ring = "in", red ring = "pass", dim = no vote. Current gent's slot is a tappable toggle between in/pass/none. Fetch votes in the main `load()` and pass as `votes: ProspectVote[]` prop.

- [ ] **`/simplify`** — run simplify pass on all Phase 3 changes

---

## Phase 4 — Convert Prospect → Entry + Wishlist → Done

**Goal**: Close the two open workflow loops.

### Tasks

- [ ] **Convert prospect → entry** — In `ProspectCard` three-dot menu, add "Log as Entry" option (only when `status !== 'converted'`). Tapping navigates to `/chronicle/new?from=prospect&id={prospect.id}`. In `EntryNew.tsx`, read these query params on mount; if present, fetch the prospect and pre-populate: `title = prospect.event_name ?? prospect.venue_name`, `date = prospect.event_date ?? today`, `location = prospect.venue_name`, `city = prospect.city`, `country = prospect.country`. After successful entry creation, call `updateProspect(prospect.id, { status: 'converted', converted_entry_id: entry.id })`.

- [ ] **Wishlist → completed link** — In `BucketList.tsx`, on items with `status = 'open'`, add a "Mark Done" action that opens a modal with two options: (a) Link to existing entry (searchable entry picker) or (b) Create new entry (navigate to `/chronicle/new`). On link: call `updateBucketItem(id, { status: 'done', converted_entry_id: entryId })`. Show a linked entry preview chip on done items.

- [ ] **`/simplify`** — run simplify pass on all Phase 4 changes

---

## Phase 5 — Streaks + Monthly Crown

**Goal**: Gamification from existing data — no new tables needed.

### Tasks

- [ ] **Streaks in Ledger** — Add a `StreaksSection` component in `src/components/ledger/`. For each gent, derive: current consecutive-month streak for their most frequent entry type (scan entries grouped by year-month, check contiguous months back from today). Show as a card with gent avatar, "X month streak" headline, entry type badge, and "Personal best: Y months" sub-line. Add to `Ledger.tsx` below `MissionTimeline`.

- [ ] **Monthly crown** — In `src/components/layout/SectionNav.tsx` (or wherever the nav renders gent avatars), compute who has the most entries this calendar month from a lightweight query. Show a small 👑 emoji badge overlaid on that gent's avatar. Update on nav render. If tied, all tied gents get the crown.

- [ ] **`/simplify`** — run simplify pass on all Phase 5 changes

---

## Phase 6 — Quick-Log Global FAB

**Goal**: Reduce friction — log an entry from any screen.

### Tasks

- [ ] In `src/components/layout/Shell.tsx` (or wherever the bottom nav renders), add a centred FAB button in the nav bar itself (replacing the blank centre slot if any, or floating above it). Tapping navigates to `/chronicle/new`. Only shown when the current route is not already `/chronicle/new`.

- [ ] Animate with `initial={{ scale:0 }} animate={{ scale:1 }}` spring. Match existing FAB style: `bg-gold text-obsidian rounded-full`.

- [ ] **`/simplify`** — run simplify pass on Phase 6 changes

---

## Deployment Gate (all phases)

After each phase (post-simplify):
1. `tsc -b` must pass with zero errors
2. `npx vercel --prod` deploy
3. Commit with descriptive message

---

## Tech Reminders for Ralph

- Project: `C:/Users/User/OneDrive - United Nations Development Programme/Documents/Personal/Chronicles`
- Stack: React + TypeScript strict, Vite, Tailwind (dark-only), Framer Motion, Supabase, React Router v6
- Deploy: `npx vercel --prod` (run from project root)
- DB push: `npx supabase db push` (run from project root)
- Type check: `npx tsc -b` (must be clean before deploy)
- Colors: `obsidian`, `slate-mid`, `slate-dark`, `slate-light`, `ivory`, `ivory-muted`, `ivory-dim`, `gold`, `gold-muted`
- Fonts: `font-display` (headings), `font-body` (everything else)
- Always update `src/types/database.ts` manually after migrations (no auto-gen)
- `GENT_COLUMNS` in `src/data/gents.ts` is the canonical column list for gents queries
- Supabase Realtime pattern: subscribe in `useEffect`, return cleanup that calls `supabase.removeChannel(channel)`
