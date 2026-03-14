# Build Plan — The Codex

Complete phased plan with parallel flows, agent assignments, and quality gates.
Maintained as source of truth for build progress.

---

## Principles

- **Parallel by default** — every phase runs as many concurrent agent streams as dependencies allow
- **/simplify between phases** — dedicated simplify pass reviews all changed code before next phase starts
- **Chronicle discipline** — ledger + napkin updated at end of every phase
- **Mobile-first always** — test at 375px width before marking any screen done
- **No AI features block UI** — AI calls (Lore, stamps, covers) are always async; UI ships without them

---

## Dependency graph

```
Phase 1 (Foundation)
    └── Phase 2 (Chronicle + Entry System)
            ├── Phase 3 (Passport)      ─┐
            ├── Phase 4 (The Circle)    ─┤ → /simplify → Phase 5 (Ledger)
            │                           ─┘
            └── Phase 6 (Gathering)
                    └── Phase 7 (Studio) ← also needs Phases 3+4
                            └── Phase 8 (Polish & PWA)
```

---

## Phase 0 — Scaffold ✅ COMPLETE

**Status**: Done in Session 003.
- Supabase project created (Frankfurt, `biioztjlsrkgwjyfegey`)
- Schema pushed (9 tables, stats view, all RLS policies)
- TypeScript types generated
- Vite + React + TS + Tailwind v4 + Zustand + Framer Motion installed
- All page stubs created
- Fonts downloaded (Playfair Display, Plus Jakarta Sans, JetBrains Mono)
- Clean build confirmed

---

## Phase 1 — Foundation & Auth

**Goal**: App boots, a Gent can log in, sees the shell. Nothing else works yet.
**Blocks**: Everything.

### Streams (run in parallel)

**Stream A — Core UI Components** _(Frontend agent)_
- `src/components/ui/Button.tsx` — 3 variants: primary (gold), ghost, danger
- `src/components/ui/Card.tsx` — dark card with gold border
- `src/components/ui/Badge.tsx` — entry type badges (7 colours)
- `src/components/ui/Input.tsx` — dark input, gold focus ring
- `src/components/ui/Modal.tsx` — slide-up sheet on mobile, centred on desktop
- `src/components/ui/Spinner.tsx` — gold ring spinner
- `src/components/ui/Toast.tsx` — toast notifications (wired to UIStore)
- `src/components/ui/Avatar.tsx` — circular gent avatar with alias ring colour

**Stream B — App Shell & Navigation** _(Frontend agent)_
- `src/components/layout/Shell.tsx` — wraps all protected pages (safe area, bg)
- `src/components/layout/BottomNav.tsx` — 5-tab floating pill nav (Chronicle, Passport, Circle, Studio, Ledger)
- `src/components/layout/TopBar.tsx` — page title + optional action button
- `src/components/layout/PageWrapper.tsx` — consistent page padding + scroll

**Stream C — Auth Flow** _(Backend + Frontend agent)_
- `src/data/gents.ts` — `getGent(userId)`, `createGent(data)`, `updateGent(data)`
- `src/hooks/useAuth.ts` — Supabase auth session watcher, syncs to Zustand AuthStore
- `src/pages/Landing.tsx` — full build: The Codex wordmark, email/password form, sign-in logic
- Onboarding: if gent row doesn't exist after sign-in → create it (alias picker, display name)
- Auth guard: redirect to `/` if not authenticated

### Deliverable
Running app: login works, shell renders, bottom nav navigates between stub pages.

### /simplify checkpoint
Review Phase 1 output: component API consistency, no duplicate logic, auth flow clarity.

---

## Phase 2 — Chronicle + Entry System

**Goal**: Gents can log every entry type and see them in the Chronicle feed.
**Blocks**: Passport (needs mission entries), Ledger (needs all entries).

### Streams (run in parallel)

**Stream A — Data & AI Layer** _(Backend agent)_
- `src/data/entries.ts` — `getEntries()`, `getEntry(id)`, `createEntry()`, `updateEntry()`, `deleteEntry()`
- `src/data/entries.ts` — `getEntriesWithParticipants()` (joined query)
- `supabase/functions/generate-lore/index.ts` — Claude Edge Function (full build)
- `supabase/functions/generate-cover/index.ts` — Gemini Edge Function (full build)
- `src/ai/lore.ts` — client wrapper for generate-lore
- `src/ai/cover.ts` — client wrapper for generate-cover
- Deploy both Edge Functions + set secrets

**Stream B — Entry Forms** _(Frontend agent)_
Build all 7 entry creation forms:
- `src/components/chronicle/EntryTypeSelector.tsx` — 7 cards, visual type picker
- `src/components/chronicle/forms/MissionForm.tsx`
- `src/components/chronicle/forms/NightOutForm.tsx`
- `src/components/chronicle/forms/SteakForm.tsx`
- `src/components/chronicle/forms/PlaystationForm.tsx` — match-by-match logger (add/remove matches dynamically)
- `src/components/chronicle/forms/ToastForm.tsx`
- `src/components/chronicle/forms/InterludeForm.tsx`
- `src/components/chronicle/ParticipantSelector.tsx` — checkboxes for 3 Gents
- `src/components/chronicle/PhotoUpload.tsx` — Supabase Storage upload, preview grid
- Wire `src/pages/EntryNew.tsx` — type select → form → publish flow

**Stream C — Chronicle Feed** _(Frontend agent)_
- `src/components/chronicle/EntryCard.tsx` — compact card: cover thumb, type badge, title, lore preview, participant avatars
- `src/components/chronicle/ChronicleFilters.tsx` — type chips + gent filter + month picker
- `src/hooks/useChronicle.ts` — entries query, filter state, real-time subscription
- `src/pages/Chronicle.tsx` — full build: header, upcoming strip placeholder, feed, FAB

**Stream D — Entry Detail** _(Frontend agent)_
- `src/components/chronicle/EntryHero.tsx` — cover image, type badge, title overlay
- `src/components/chronicle/LoreSection.tsx` — shimmer while loading → fade-in Playfair italic, gold border
- `src/components/chronicle/PhotoGrid.tsx` — masonry 2–3 col photo grid
- `src/components/chronicle/MetadataCard.tsx` — type-specific details (steak cut, PS5 scores, mission expense)
- `src/components/chronicle/PS5Scoreboard.tsx` — match-by-match table + head-to-head records
- `src/hooks/useEntry.ts` — single entry + photos + participants
- `src/pages/EntryDetail.tsx` — full build

### Merge after streams complete
- Wire Lore generation: on entry publish → call `generateLore()` → poll/subscribe → update LoreSection
- Wire cover generation: on publish without photo → call `generateCover()`
- Wire photo upload: PhotoUpload → Supabase Storage → entry_photos table

### /simplify checkpoint
Review all forms for shared patterns, data layer for duplication, entry detail components.

---

## Phase 3 — The Passport  _(parallel with Phase 4)_

**Goal**: The Passport is fully alive — stamps, achievements, the showpiece experience.
**Depends on**: Phase 2 (mission entries create stamps).

### Streams (run in parallel)

**Stream A — Stamp Data + AI** _(Backend agent)_
- `src/data/stamps.ts` — `getStamps()`, `getStamp(id)`, `createStamp()`
- Auto-stamp trigger: on mission entry publish → create stamp rows for each city
- `supabase/functions/generate-stamp/index.ts` — Gemini stamp image generation (full build)
- `src/ai/stamp.ts` — client wrapper
- Deploy Edge Function + set secrets
- Seed historical mission stamps (12 missions, cities from Missions.txt)

**Stream B — Passport UI** _(Frontend agent)_
- `src/components/passport/PassportCover.tsx` — leather texture, gold embossed title, tap to open
- `src/components/passport/StampGrid.tsx` — stamp collection grid, stagger entrance
- `src/components/passport/StampCard.tsx` — circular stamp image, city, date. Tap → expand
- `src/components/passport/StampDetail.tsx` — full stamp + link to mission entry
- `src/components/passport/AchievementGrid.tsx` — earned crests + locked silhouettes
- `src/components/passport/PassportMissionPage.tsx` — visa-page layout for one mission
- `src/hooks/usePassport.ts` — stamps + achievements query
- `src/pages/Passport.tsx` — full build: cover → tabs (stamps / achievements / diplomatic)
- `src/pages/PassportMission.tsx` — full build

### Achievement definitions
Seed `achievements` table with all milestone definitions from `docs/03-architecture/passport_system.md`.

### /simplify checkpoint (combined with Phase 4)
---

## Phase 4 — The Circle  _(parallel with Phase 3)_

**Goal**: The Circle is fully functional — add people, view dossiers, private notes.
**Depends on**: Phase 2 (entries exist to link people to).

### Streams (run in parallel)

**Stream A — Circle Data Layer** _(Backend agent)_
- `src/data/people.ts` — `getPeople()`, `getPerson(id)`, `createPerson()`, `updatePerson()`, `deletePerson()`
- `src/data/people.ts` — `getPrivateNote(personId, gentId)`, `upsertPrivateNote()`
- Seed Budapest 2023 Instagram profiles list from `Missions/Budapest 2023/Instagram profiles.txt`

**Stream B — Circle UI** _(Frontend agent)_
- `src/components/circle/PersonCard.tsx` — avatar, name, where met, label chips
- `src/components/circle/CircleFilters.tsx` — search + label filter chips
- `src/components/circle/LabelEditor.tsx` — add/remove custom labels (tag-style input)
- `src/components/circle/PersonForm.tsx` — add/edit person form
- `src/components/circle/PrivateNoteSection.tsx` — auto-save on blur, invisible to other Gents
- `src/hooks/useCircle.ts` — people list + filter state
- `src/hooks/usePerson.ts` — single person + private note
- `src/pages/Circle.tsx` — full build
- `src/pages/PersonDetail.tsx` — full build: photo, dossier, labels, shared notes, private notes

### /simplify checkpoint (combined Phase 3+4)
Review stamp system, achievement triggers, circle data layer, private note RLS.

---

## Phase 5 — The Ledger

**Goal**: Stats are live, PS5 rivalry is tracked, Annual Wrapped is generatable.
**Depends on**: Phases 2, 3, 4.

### Single stream (sequential — stats depend on all prior data)

**Frontend + Backend agent** (can split: backend does wrapped Edge Function, frontend does UI)

- `src/data/stats.ts` — `getGentStats()` (all-time), `getYearStats(year)`, `getPS5HeadToHead()`
- `supabase/functions/generate-wrapped/index.ts` — Claude Edge Function: annual Wrapped narrative
- `src/ai/wrapped.ts` — client wrapper
- `src/components/ledger/StatGrid.tsx` — big-number stats, per-Gent breakdown
- `src/components/ledger/PS5Rivalry.tsx` — head-to-head table per pairing, win streaks
- `src/components/ledger/MissionTimeline.tsx` — horizontal scroll of missions with stamps
- `src/components/ledger/WrappedSection.tsx` — generate button → Claude narrative → export trigger
- `src/hooks/useStats.ts` — stats query + year selector
- `src/pages/Ledger.tsx` — full build

### /simplify checkpoint
Review stats queries for efficiency, Wrapped Edge Function prompt quality.

---

## Phase 6 — The Gathering

**Goal**: Full Gathering lifecycle — invite → RSVP → QR guest book → Chronicle entry.
**Depends on**: Phase 2 (entry system), Phase 4 (The Circle for guest list).
**Most complex phase** — runs sequentially due to dependencies.

### Streams (run in parallel where possible)

**Stream A — Backend** _(Backend agent)_
- `src/data/gatherings.ts` — `createGathering()`, `updateGathering()`, `getRsvps()`, `getGuestBookMessages()`
- `supabase/functions/submit-rsvp/index.ts` — anonymous RSVP insert Edge Function
- `supabase/functions/submit-guestbook/index.ts` — anonymous guest book insert Edge Function
- `src/ai/portrait.ts` — Gemini portrait generation (for calling card, used in Phase 7)
- Deploy functions + configure anon access

**Stream B — App Gathering Screens** _(Frontend agent)_
- `src/components/gathering/GatheringForm.tsx` — pre-event creation form (title, date, guest list, cocktail menu)
- `src/components/gathering/InviteCardPreview.tsx` — live preview of invite card as you fill the form
- `src/components/gathering/GuestList.tsx` — RSVP status per guest, real-time updates
- `src/components/gathering/GuestBookPanel.tsx` — scrollable messages panel
- `src/components/gathering/CountdownBadge.tsx` — "In 14 days" countdown chip
- `src/components/gathering/UpcomingStrip.tsx` — horizontal scroll for Chronicle feed
- `src/pages/GatheringNew.tsx` — full build + invite card reveal animation after creation
- `src/pages/GatheringDetail.tsx` — full build: pre-event and post-event views

**Stream C — Public Pages** _(Frontend agent)_
- `src/pages/public/PublicInvite.tsx` — full build: animated reveal, countdown, RSVP form
- `src/pages/public/PublicGuestBook.tsx` — full build: dark party aesthetic, cocktail selector, guest book form, flip animation on submit

### /simplify checkpoint
Review public pages (no auth leakage), Edge Function security, RSVP real-time wiring.

---

## Phase 7 — The Studio

**Goal**: Every entry type exportable as Instagram-ready image.
**Depends on**: All prior phases (needs real entry data for templates).

### Streams (run in parallel)

**Stream A — Export Infrastructure** _(Frontend agent)_
- `src/export/exporter.ts` — html-to-image orchestration, font loading, pixel ratio, Web Share API
- `src/export/templates/shared/BrandMark.tsx` — The Gents Chronicles wordmark component (reused in all templates)
- `src/export/templates/shared/GoldRule.tsx` — decorative gold rule line
- Verify fonts load correctly inside html-to-image (critical — test early)

**Stream B — Entry Templates** _(Studio agent)_
- `src/export/templates/NightOutCard.tsx` — 1080×1350
- `src/export/templates/MissionCarousel.tsx` — multi-slide 1080×1080
- `src/export/templates/SteakVerdict.tsx` — 1080×1350
- `src/export/templates/PS5MatchCard.tsx` — 1080×1080
- `src/export/templates/PassportPage.tsx` — 1080×1920 story

**Stream C — Special Templates** _(Studio agent)_
- `src/export/templates/AnnualWrapped.tsx` — multi-slide 1080×1080
- `src/export/templates/CallingCard.tsx` — 1080×1080
- `src/export/templates/GatheringInviteCard.tsx` — 1080×1350
- `src/export/templates/GatheringRecapCarousel.tsx` — multi-slide
- `src/export/templates/CountdownCard.tsx` — 1080×1920

**Stream D — Studio UI** _(Frontend agent)_
- `src/pages/Studio.tsx` — full build: entry selector, template grid, previews, export button
- Wire export templates to real entry data
- Integrate Countdown Card + Invite Card into Gathering Detail screen

### /simplify checkpoint
Review template code for shared patterns, exporter API, font loading strategy.

---

## Phase 8 — Polish & PWA

**Goal**: Feels premium. Animations are right. Works offline. Installs on mobile.
**Depends on**: All prior phases complete.

### Streams (run in parallel)

**Stream A — Animations** _(Frontend agent)_
- Page transitions: `AnimatePresence` on all route changes
- Entry card stagger entrance in Chronicle feed
- Stamp reveal: spring scale + rotate (physical stamp press feel)
- Achievement unlock: full-screen gold moment
- Lore text: fade-in word by word (or paragraph fade)
- Gathering invite reveal: card unfolds from center
- Guest book submit: flip animation

**Stream B — Real-time & PWA** _(Backend + Frontend agent)_
- `src/store/realtime.ts` — Supabase subscriptions: new entries appear in Chronicle live
- New entry toast: "Vedo just logged a Mission" notification
- PWA: offline page, install prompt component
- iOS Safari safe-area edge cases
- Test on real mobile (Chrome + Safari)

**Stream C — Profile** _(Frontend agent)_
- `src/pages/Profile.tsx` — full build: avatar, alias, stats summary, calling card preview, settings
- `supabase/functions/generate-portrait/index.ts` — Gemini portrait for calling card
- Avatar upload to Supabase Storage

### Final /simplify pass
Full codebase review: unused code, duplicate patterns, over-engineered solutions, component size.

### Final chronicle update
Comprehensive ledger entry. Napkin pruned to only active rules. Execution board fully updated.

---

## /simplify schedule

| After Phase | Scope |
|---|---|
| Phase 1 | UI components, auth flow, shell |
| Phase 2 | Entry forms, Chronicle feed, data layer, AI wrappers |
| Phase 3 + 4 | Passport + Circle (combined pass) |
| Phase 5 | Ledger, stats queries |
| Phase 6 | Gathering screens, public pages, Edge Functions |
| Phase 7 | All export templates, Studio UI |
| Phase 8 | Full codebase final pass |

---

## Agent team assignments

| Agent role | Phases active | Primary files |
|---|---|---|
| **Frontend** | All phases | `src/pages/`, `src/components/`, `src/hooks/` |
| **Backend** | 2A, 3A, 4A, 5, 6A, 8B | `src/data/`, `supabase/functions/`, `src/ai/` |
| **Studio** | Phase 7B, 7C | `src/export/templates/` |
| **Architect** | Between phases | Reviews structure, updates ADRs |
| **Chronicle** | End of every phase | `project_ledger.md`, `napkin.md`, `execution_board.md` |

---

## Current status

- [x] Phase 0 — Scaffold ✅
- [x] Phase 1 — Foundation & Auth ✅
- [x] Phase 2 — Chronicle + Entry System ✅
- [x] Phase 3 — The Passport ✅
- [x] Phase 4 — The Circle ✅
- [x] Phase 5 — The Ledger ✅
- [x] Phase 6 — The Gathering ✅
- [x] Phase 7 — The Studio ✅
- [x] Phase 8 — Polish & PWA ✅

**App complete. Build clean at 2140 modules. All phases shipped.**
