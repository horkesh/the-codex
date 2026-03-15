# Fix Plan — The Codex v2 Features

Work through phases in order. Run `/simplify` after each phase before moving to the next.
See `docs/00-overview/implementation_plan_v2.md` for full specs.

---

## Phase 1 — Polish & Identity (no migrations)

- [ ] Animated reactions: float-fade burst on tap in `EntryReactions.tsx` using Framer Motion AnimatePresence
- [ ] Trophy case on gent profiles: fetch achievements + thresholds, display as gold badge chips in `GentProfile.tsx`
- [ ] Signature stat: derive one iconic line from stats, show under display_name in hero
- [ ] `/simplify` pass on Phase 1 changes
- [ ] `tsc -b` passes clean
- [ ] Deploy: `npx vercel --prod`
- [ ] Commit all Phase 1 work

---

## Phase 2 — Entry Comments

- [ ] Write migration `supabase/migrations/20260318000004_entry_comments.sql`
- [ ] `npx supabase db push`
- [ ] Update `src/types/database.ts` with entry_comments Row/Insert/Update
- [ ] Add `EntryComment` interface to `src/types/app.ts`
- [ ] Create `src/data/entryComments.ts`: fetchComments, addComment, deleteComment
- [ ] Create `src/hooks/useComments.ts`: fetches + Realtime subscription + cleanup
- [ ] Create `src/components/chronicle/CommentsSection.tsx`: list + input + send + delete own
- [ ] Wire CommentsSection into `EntryDetail.tsx` below PeoplePresent
- [ ] `/simplify` pass on Phase 2 changes
- [ ] `tsc -b` passes clean
- [ ] Deploy: `npx vercel --prod`
- [ ] Commit all Phase 2 work

---

## Phase 3 — Prospect Voting

- [ ] Write migration `supabase/migrations/20260318000005_prospect_votes.sql`
- [ ] `npx supabase db push`
- [ ] Update `src/types/database.ts` with prospect_votes Row/Insert/Update
- [ ] Add `ProspectVote` interface to `src/types/app.ts`
- [ ] Create `src/data/prospectVotes.ts`: fetchVotesForProspects, upsertVote
- [ ] Add vote strip to `ProspectCard` in `src/pages/Prospects.tsx`
- [ ] Fetch votes in `load()` and pass to cards
- [ ] `/simplify` pass on Phase 3 changes
- [ ] `tsc -b` passes clean
- [ ] Deploy: `npx vercel --prod`
- [ ] Commit all Phase 3 work

---

## Phase 4 — Convert Prospect → Entry + Wishlist Done

- [ ] Add "Log as Entry" to ProspectCard three-dot menu → navigate to `/chronicle/new?from=prospect&id=`
- [ ] In `EntryNew.tsx` read `from=prospect` query params and pre-fill form fields from fetched prospect
- [ ] After entry creation in the prospect flow: `updateProspect(id, { status: 'converted', converted_entry_id: entry.id })`
- [ ] In `BucketList.tsx`: "Mark Done" on open items → modal to link existing entry or create new
- [ ] `updateBucketItem(id, { status: 'done', converted_entry_id })` data function
- [ ] Show linked entry chip on completed wishlist items
- [ ] `/simplify` pass on Phase 4 changes
- [ ] `tsc -b` passes clean
- [ ] Deploy: `npx vercel --prod`
- [ ] Commit all Phase 4 work

---

## Phase 5 — Streaks + Monthly Crown

- [ ] Create `src/components/ledger/StreaksSection.tsx`: per-gent consecutive-month streaks derived from entries
- [ ] Wire StreaksSection into `Ledger.tsx` below MissionTimeline
- [ ] Monthly crown: query entry counts for current month, show 👑 on leading gent's nav avatar
- [ ] `/simplify` pass on Phase 5 changes
- [ ] `tsc -b` passes clean
- [ ] Deploy: `npx vercel --prod`
- [ ] Commit all Phase 5 work

---

## Phase 6 — Quick-Log Global FAB

- [ ] Add centred FAB or prominent log button to `Shell.tsx` bottom nav (visible on all routes except `/chronicle/new`)
- [ ] Match existing FAB style: gold circle, Plus icon, spring animation
- [ ] `/simplify` pass on Phase 6 changes
- [ ] `tsc -b` passes clean
- [ ] Deploy: `npx vercel --prod`
- [ ] Commit all Phase 6 work

---

## Done Criteria
All 6 phases complete, all deploys successful, zero TS errors.
