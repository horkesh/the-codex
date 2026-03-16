# Project Ledger — The Codex

A running log of every build session. Most recent at top.

---

## Session — 2026-03-16 (016)

**Goal**: Studio branding, photo layouts, lore hints, cover editing, Pitch improvements, profile polish.

**Done**:

### Gold logo on Studio templates
- Converted `docs/01 Gold logo.png` (1.5MB) → `public/logo-gold.webp` (167KB) via sharp
- `BrandMark` component renders logo image instead of text; sizes sm=48px, md=64px, lg=80px
- All 19 export templates now show the circular gold gents emblem

### Chronological Vol numbering
- Table and Pitch titles use `· Vol. N` based on chronological date order (oldest = Vol. 1)
- `getChronologicalVol(type, date)` in entries.ts counts entries with date <= given date
- `renumberVolumes(type)` fire-and-forget after `createEntry` for steak/playstation — fetches all entries sorted by date ASC, regex-replaces `· Vol. N` with correct position
- Vol recomputes live in form as date field changes
- Removed old `fetchEntries({ type })` count-based approach from both forms

### Photo storyboard layout
- `PhotoStoryboard.tsx` — editorial mixed-size layout for mission and night_out entries
- Cycle: hero (16:9 full width) → duo (square side-by-side) → trio (tall portrait left + 2 stacked landscape right) → wide (cinematic 2.2:1) → repeats
- Gold ornamental dividers between blocks; graceful truncation for < 7 photos
- All other entry types keep original `PhotoGrid`
- Same lightbox, filter support, "set as cover" functionality

### Director's Notes for lore generation
- Collapsible "Director's Notes" textarea in `LoreSection` (below "The Lore" header)
- Auto-saves to `entry.metadata.lore_hints` after 1s of inactivity via debounced `updateEntry`
- Passed to `generate-lore` edge function as `Director's Notes (incorporate these details naturally): ...`
- Works for both initial generation (LoreSection.handleGenerate) and regeneration (EntryDetail.handleRegenerateLore — re-fetches entry from DB for latest hints)
- Gold asterisk indicator when hints exist but section is collapsed

### Pitch location field
- `PlaystationForm` now has Location input (optional), auto-fills from EXIF
- `PlaystationFormData` interface extended with `location: string`
- `submitPlaystation` passes location through to `handleSubmit` → `createEntry`

### Cover image pan/zoom
- "Adjust" button on `EntryHero` opens edit mode with drag-to-pan (pointer events) + zoom slider (1x–2x)
- Crosshair guides + "Drag to pan" hint during editing
- Position stored in `entry.metadata.cover_pos_x` / `cover_pos_y` (0–100%), scale in `cover_scale`
- CSS-only transform: `object-position` + `transform: scale` with matching `transform-origin`
- `EntryCard` thumbnails in Chronicle feed also respect the `object-position` crop
- Non-destructive: no re-upload, reversible, instant

### Gent profile thresholds
- `GentProfile.tsx` now fetches `fetchEarnedThresholds(gent.id)` alongside achievements
- Honours section displays both achievement badges and threshold badges (Veteran, Connoisseur, Explorer, Host)
- `implementation_plan_v2.md` Phase 1 marked complete (animated reactions, trophy case, signature stat were already built in prior sessions)

### DossierMap geocoding fix
- Nominatim search now uses `country_code` (ISO, e.g. "BA") instead of arbitrary country name (e.g. "Bosnia")
- Fixes Sarajevo and other cities in countries with commonly-abbreviated names
- Cache version bumped to `v2` to force re-geocoding of previously failed lookups

### Passport stamps on mission publish
- `createMissionStamp()` + `generateStamp()` + `updateStampImage()` wired into `handleSubmit` in EntryNew
- Mission entries now auto-create a passport stamp and generate artwork via Imagen (fire-and-forget)
- This was why missions weren't appearing in Passport — stamps were never being created

### Lore one-liner + AI title suggestion
- `generate-lore` edge function now returns structured `<lore>`, `<oneliner>`, `<title>` tags
- Client parses via `generateLoreFull()` returning `LoreResult { lore, oneliner, suggested_title }`
- `lore_oneliner` stored in `entry.metadata.lore_oneliner`
- EntryDetail shows gold "AI Title Suggestion" banner after lore gen with Apply/Dismiss buttons
- `getOneliner(entry)` utility in `src/export/templates/shared/utils.ts` — extracts oneliner or falls back to first sentence

### QR code for guestbook
- GatheringDetail: Share section with copy-to-clipboard buttons for invite + guestbook URLs
- QR code image via `api.qrserver.com` (no library needed) for guestbook URL
- Displayed between event details and RSVP section

### Wishlist Instagram import
- "Import from Instagram" URL field at top of Add Wish modal in BucketList
- Calls `analyzeInstagramUrl(url, 'event')` edge function
- Auto-fills title, city, country, notes (vibe/price/dress code)

### 4 Studio template variants per entry type
- Night Out: Classic, Bold (left-aligned), Quote (centred oneliner), Date Stamp
- Mission: Classic, Bold City, Passport (stamp circle), Overlay (watermark) + Visa Page
- Steak: Classic, Score Hero, Minimal (circle score), Cut Forward
- PS5: Scoreboard, Winner (bold), Quote (minimal), Stats Grid
- All variants use `lore_oneliner` instead of full lore text
- Variant prop (1-4) on each template component; registered in `TEMPLATES_BY_TYPE`

### Simplify pass
- Extracted `getCoverCrop()` to `src/lib/utils.ts` (shared by EntryCard + EntryHero)
- `renumberVolumes`: parallel `Promise.all` instead of sequential loop
- LoreSection + EntryDetail: parallelized `updateEntryLore` + `updateEntry`
- LoreSection: prevent debounced hint save after unmount via `unmounted` ref

**Status**: Deployed. Zero TS errors. Commits: `8fed8f3` → `fb84cb9`.

---

## Session — 2026-03-18 (015)

**Goal**: Phases 2–6 from `implementation_plan_v2.md` — Entry Comments, Prospect Voting, Convert Prospect→Entry + Wishlist Done, Streaks + Monthly Crown, Quick-Log Global FAB.

**Done**:

### Entry Comments (Phase 2)
- Migration `20260318000004_entry_comments.sql`: `entry_comments` table (id, entry_id, gent_id, body ≤280 chars, created_at); RLS: select all, insert/delete own; cascade on entry delete; index on entry_id
- `src/data/entryComments.ts`: `fetchComments`, `fetchCommentById`, `addComment` (returns full comment with gent join), `deleteComment`
- `src/hooks/useComments.ts`: initial fetch + Supabase Realtime channel `entry_comments:{entryId}`; INSERT appends single new comment via `fetchCommentById` (avoids full re-fetch); DELETE uses optimistic filter; cleanup via `supabase.removeChannel`
- `src/components/chronicle/CommentsSection.tsx`: avatar thread UI, 280-char pill input, Enter-to-send, delete button on own comments (group-hover)
- `src/pages/EntryDetail.tsx`: `<CommentsSection entryId={entry.id} />` after PeoplePresent, gated on `status === 'published'`

### Prospect Voting (Phase 3)
- Migration `20260318000005_prospect_votes.sql`: `prospect_votes` table (id, prospect_id, gent_id, vote IN ('in','pass'), UNIQUE(prospect_id,gent_id)); RLS: select all, insert/update own
- `src/data/prospectVotes.ts`: `fetchVotesForProspects(ids[])`, `upsertVote` (with onConflict), `removeVote`
- `src/pages/Prospects.tsx`: `VoteStrip` component (emerald ring = in, red ring = pass; own vote shows remove on tap); "I'm In" / "Pass" buttons when unvoted; visible on shared prospects only; optimistic state updates

### Convert Prospect → Entry (Phase 4)
- `src/data/prospects.ts`: `fetchProspectById(id)` — single-row fetch returning null on error
- `src/pages/Prospects.tsx`: "Log as Entry" in ProspectCard three-dot menu (hidden if already converted); navigates to `/chronicle/new?from=prospect&id={id}`
- `src/pages/EntryNew.tsx`: reads `?from=prospect&id=` on mount (guarded by `prospectHandled` ref); fetches prospect, pre-fills title/date/location/city/country, pre-selects `night_out` type, jumps to `'form'` step; on submit marks prospect `status='converted', converted_entry_id=entry.id` (fire-and-forget)

### Wishlist Linked Entry (Phase 4)
- `src/pages/BucketList.tsx`: done items show gold chip `<Link>` to linked entry (`converted_entry_id`); MarkDoneModal adds "or" separator + "Create New Entry" ghost button → `/chronicle/new`

### Streaks + Monthly Crown (Phase 5)
- `src/components/ledger/StreaksSection.tsx`: fetches entry_participants bounded to last 4 years; per gent finds most-frequent entry type; `computeStreak` returns `{current, best}` via consecutive-month walk; renders gold Flame card with streak count + personal best; hidden if all zeros
- `src/pages/Ledger.tsx`: `<StreaksSection />` between MissionTimeline and SommelierSection
- `src/components/ledger/StatGrid.tsx`: useEffect queries current month's entry_participants; gent column header shows 👑 for monthly entry leader (most entries this month)

### Quick-Log Global FAB (Phase 6)
- `src/components/layout/BottomNav.tsx`: gold `+` button above nav pill, spring-animated via `AnimatePresence` (scale + opacity); hidden on `/chronicle/new`; navigates to `/chronicle/new`

### Simplify fixes
- `VoteStrip` className: `.join(' ')` → `cn()` utility
- `StatGrid` monthEnd: hardcoded `31` → `new Date(Y, M+1, 0)` (last day of month)
- `StreaksSection` query: bounded to `cutoff = 4 years ago` (was unbounded full table scan)
- `useComments` INSERT: `fetchCommentById(payload.new.id)` instead of re-fetching all comments

**Status**: Deployed to https://the-codex-sepia.vercel.app — commit `f6823ec`. Zero TS errors.

---

## Session — 2026-03-18 (014)

**Goal**: Gent profiles; prospect auto-expiry; share prospect with gents.

**Done**:

### Gent profiles (`/gents/:alias`)
- New `src/pages/GentProfile.tsx` — portrait hero (full-bleed `h-56` with gradient overlay + avatar ring at bottom), or large avatar fallback if no portrait; full_alias headline, display_name, status pill; stats chips row (Missions, Nights Out, Steaks, Countries, People); bio section; last 5 Chronicle entries with Badge + date
- `src/data/gents.ts`: `GENT_COLUMNS` expanded to include `portrait_url, status, status_expires_at`; new `fetchGentByAlias(alias)` function
- `src/App.tsx`: route `/gents/:alias` → `GentProfile`
- `src/pages/EntryDetail.tsx`: participant names/avatars in "Who Was There" section now wrapped in `<Link to="/gents/:alias">` — tapping any gent navigates to their profile

### Prospect auto-expiry
- `src/data/prospects.ts`: `fetchProspects` runs a batch `.update({ status: 'passed' })` before fetching for any prospect where `status = 'prospect'` AND `event_date < today` AND `event_date IS NOT NULL`
- List sorted upcoming-first: `.order('event_date', { ascending: true, nullsFirst: false })`

### Share with Gents
- Migration `20260318000003_prospects_visibility.sql`: adds `visibility text DEFAULT 'private' CHECK (visibility IN ('private', 'shared'))` to `prospects`
- `src/types/app.ts`: `visibility: 'private' | 'shared'` added to `Prospect` interface
- `src/data/prospects.ts`: `fetchProspects(currentGentId?)` filters `.or('created_by.eq.{id},visibility.eq.shared')`; new `shareProspect(id)` sets `visibility = 'shared'`
- `src/pages/Prospects.tsx`: "Share with Gents" in three-dot menu (only own, active, not-yet-shared); shared prospects from other gents show gold "Suggested" badge; new `visibility: 'private'` default on create
- `src/types/database.ts`: `event_name` and `visibility` added to prospects Row/Insert/Update (manual sync after migrations)

**Status**: Deployed. Zero TS errors.

---

## Session — 2026-03-18 (013)

**Goal**: Fix photo → cover image pipeline; fix entry-photos storage permissions; improve Scouting (Prospects) Instagram extraction — event name, correct date format, auto-save event image.

**Done**:

### Entry photo as cover image
- **Root cause**: `entry-photos` Supabase Storage bucket had no RLS policies — all uploads were silently blocked. No other bucket had this gap.
- **Fix**: Migration `20260318000001_entry_photos_storage_policies.sql` — added `entry_photos_public_read`, `entry_photos_auth_insert`, `entry_photos_auth_delete` policies on `storage.objects` for `bucket_id = 'entry-photos'`
- **Fix**: `EntryNew.tsx` — `updateEntryCover()` is now `await`ed inside the try block (was fire-and-forget `.catch(() => {})`); errors now surface as the standard error toast

### Scouting / Prospects Instagram improvements
- **Event name** — `analyze-instagram` edge function event-mode prompt now explicitly requests `event_name` (the specific night/event name, e.g. "Drumcode Night") separate from `venue_name` (the physical venue). Previously only `venue_name` was extracted.
- **Date format** — Prompt now specifies `YYYY-MM-DD` only (no time). DB column is `date` type; previous `2026-04-04T20:30:00` ISO datetime strings would cause silent Supabase insert failure.
- **Event image** — OG image URL (`ogTags['image']`) is already extracted from the Instagram page HTML in the edge function; it's now attached directly to the response as `image_url` without asking Claude to re-extract it. Mapped into `source_thumbnail_url` on save so the event thumbnail appears on the card.
- **Migration** `20260318000002_prospects_event_name.sql` — adds `event_name text` column to `prospects`
- **Types**: `event_name` added to `Prospect` interface; `event_name` + `image_url` added to `InstagramAnalysis`
- **UI**: `event_name` is the first field in the review form and primary card title (`event_name ?? venue_name`); venue shown as subtitle alongside city/country with `·` separators; save button requires either `event_name` or `venue_name`

**Status**: Deployed. Zero TS errors. Edge function redeployed.

---

## Session — 2026-03-15 (012)

**Goal**: Bug fixes, UI polish, POI scanner repair, portrait pipeline, mind map + Tag People, PersonDetail Intel tab.

**Done**:

### Bug fixes
- **Home section cards invisible on first load** — removed `staggerContainer`/`staggerItem` variants from section cards; they mounted after Zustand persist hydration so `AnimatePresence initial={false}` no longer suppressed `opacity:0`
- **POI scanner "Edge Function returned non-2xx"** — layered root causes fixed: `gemini-2.0-flash` deprecated → switched to `gemini-2.5-flash`; invalid `thinkingConfig` field removed (caused 400); all 15 edge function catch blocks changed from `status:500` → `status:200`; `verify_jwt = false` added for all 13 AI functions in `config.toml`; `maxOutputTokens` 1024 → 4096 (was truncating JSON)
- **False "Session expired" error** — removed overly broad `body.includes('401')` check in `personVerdict.ts`; now surfaces actual error body
- **`tsc -b` stricter than `tsc --noEmit`** — `review_payload` fields narrowed with `typeof === 'string'` and `Boolean()` wrapping before JSX render

### Portrait pipeline
- POI portrait prompt aligned to Tonight noir aesthetic: minimalist geometric forms, cinematic noir, moody desaturated palette, preserves actual appearance
- Portrait saves as profile pic: all avatar displays now use `portrait_url ?? photo_url` (PersonCard, PersonNode, NodeDetailSheet, PeoplePresent ×2, Circle POI list)
- PersonDetail hero: portrait is main large image, source scan photo shown as small thumbnail alongside

### Mind map & Tag People (from plan `cuddly-sprouting-llama`)
- Migration `20260315000003_mind_map_schema.sql`: `tier` column on `people` + `person_appearances` table with RLS
- `src/data/personAppearances.ts`: CRUD for appearances
- `src/lib/mindMapLayout.ts`: pure `computeGraphData()` → concentric rings by tier, gent-gent + gent-person + person-person edges
- `src/hooks/useMindMap.ts`, `useTagPeople.ts`
- `src/pages/MindMap.tsx`: React Flow canvas, filter chips, focus mode
- `src/components/mindmap/GentNode.tsx`, `PersonNode.tsx`, `NodeDetailSheet.tsx`
- `src/components/chronicle/PeoplePresent.tsx`: tag people section in EntryDetail
- Routes: `/circle/map`; Network icon in Circle TopBar; `@xyflow/react` added

### PersonDetail
- Intel tab (scan data): score + verdict label pill, vibe, style read, trait chips, why notable, best opener card, green flags/watchouts grid, appearance, confidence %
- Tier badge: tap to move between Inner Circle / Outer Circle / Acquaintance (updates mind map ring)
- Connected-to badge: tap to reassign `added_by` gent (updates mind map edge colour)
- `fetchScanByPerson()` added to `personScans.ts`

### TopBar profile avatar
- Avatar button in TopBar visible on all pages, navigates to `/profile`
- Removed per-page avatar buttons from Chronicle

### Home & Navigation
- Bucket List added as section card: `navigation.ts` entry, `/images/sections/bucket-list.png`
- Home switched from featured+2×2 to uniform 2×3 grid (6 equal cards)

**Status**: Deployed. Zero TS errors (`tsc -b` clean).

---

## Session — 2026-03-15 (011)

**Goal**: Implement 6.9 Threshold System + 6.10 Gent Comparison (final two P3 items from master roadmap).

**Done**:
- Migration `20260317000001_threshold_system.sql`: adds `'threshold'` to achievements type constraint
- `src/data/thresholds.ts`: 4 threshold definitions (veteran_stamp / explorer_palette / connoisseur_badge / host_seal) with `fetchEarnedThresholds` + `checkAndAwardThresholds`; queries parallelised with `Promise.all`
- `src/hooks/useThresholds.ts`: fetches earned reward keys for the current gent on Studio load
- Achievement + threshold milestone checks now wired into `createEntry` (fire-and-forget, parallelised — was never called before)
- Export template variants: "Connoisseur" badge overlay on SteakVerdict, circular "Host" seal on GatheringInviteCard, "Veteran" stamp mark on MissionCarousel — each gated behind earned reward key
- `src/components/ledger/GentComparison.tsx`: head-to-head Ledger section with gent pickers, 7 animated stat bars, leader summary, "Export Rivalry Card" button
- `src/export/templates/RivalryCard.tsx`: 1080×1350 Studio export card with VS header + full stat rows
- Studio wired for `?comparison=keys:bass` standalone mode (no entry selector shown)
- Simplify pass: extracted `GENT_LABELS` + `GENT_ALIASES` to `src/lib/gents.ts`; `COMPARISON_STAT_ROWS` + `computeLeaderSummary` to `src/data/stats.ts`; fixed critical threshold type-query bug (`.eq('type','threshold')` → `.in('type', THRESHOLD_TYPES)`); deduped leader-summary ternary; consistent `.select('*')`
- Deployed to Vercel: https://the-codex-sepia.vercel.app

**Status**: All master roadmap features shipped (P0–P3 complete). Zero TS errors.

---

## Session — 2026-03-15 (010)

**Goal**: Implement Verdict & Dossier — AI-powered person intake for The Circle.

**Done**:
- Migration `20260316000001_verdict_dossier.sql`: `portrait_url` + `instagram_source_url` on `people`; new `person_scans` table with full RLS; global unique index on `lower(instagram)`
- 2 new Supabase Edge Functions: `scan-person-verdict` (Gemini 2.5 Flash vision — eligibility + score + full dossier fields, HTTP 422 on ineligible images), `generate-person-portrait` (same protocol as `generate-portrait`, stores to `portraits/scans/{scan_id}/`)
- New lib: `src/lib/instagram.ts` — `normalizeInstagramHandle`, `getInstagramProfileUrl`
- New data layer: `src/data/personScans.ts` (scan CRUD + `uploadPersonScanPhoto`); `findPersonByInstagram` added to `people.ts`; `createPersonFromScan` added to `people.ts`
- New AI clients: `src/ai/personVerdict.ts`, `src/ai/personPortrait.ts`
- New components: `VerdictCard.tsx` (verdict label, score pill, confidence caution, green flags / watchouts), `POIModal.tsx` (full intake: screenshot/photo tabs → analyzing → review-first → saving)
- New hook: `useVerdictIntake.ts` — parallel FileReader + storage upload, async portrait shimmer (`portraitLoading` separate state), `CONTACT_SCORE_THRESHOLD = 8.0`, `createEmptyDossier()` factory
- `PersonDetail.tsx`: AI portrait displayed alongside source photo when available
- Simplify pass: `findPersonByInstagram` moved from `personScans.ts` → `people.ts`; upload extracted from hook into `personScans.ts`; `Promise.all` for parallel base64 + upload; `EMPTY_DOSSIER` constant → factory function; `portraitLoading` lifted out of `VerdictResult`
- Deployed to Vercel: https://the-codex-sepia.vercel.app

**Status**: Verdict & Dossier fully operational. Zero TS errors.

---

## Session — 2026-03-13 (009)

**Goal**: Implement every feature in the master roadmap; code review + simplify.

**Done**:
- Built 15 new pages/components: EntryEdit, Prospects, StoryNew, StoryDetail, BucketList, DossierMap, WhereaboutsWidget, AlmanacWidget, VerdictBoard, RivalryIndex, SommelierSection, EntryReactions, POIModal, StoryCard, PassportPageExport/GatheringRecap/WrappedCard Studio templates
- 6 new Supabase Edge Functions: `analyze-instagram`, `generate-story-arc`, `generate-throwback`, `generate-scene`, `generate-story-stamp`, `send-weekly-digest`
- 2 new Supabase migrations: `20260315000001_new_features.sql` (gents/entries/people columns + 4 new tables), `20260315000002_new_storage_policies.sql` (scene-images, story-stamps buckets)
- 6 new routes in App.tsx: `/chronicle/:id/edit`, `/prospects`, `/passport/stories/new`, `/passport/stories/:id`, `/dossier`, `/bucket-list`
- Added `ids` filter to `fetchEntries()` for batch-fetch by specific IDs
- Simplify pass: extracted STORY_TYPE_COLORS/LABELS to entryTypes.ts; removed duplicate flagEmoji from DossierMap; replaced inline date format with formatDate(); useMemo for StoryDetail stats + EntryReactions countMap + BucketList grouping; parallelised send-weekly-digest emails; fixed Realtime channel leak in useWhereabouts (removeChannel on cleanup)
- Fixed 3 TypeScript errors: DossierMap backTo prop, Studio WrappedCard stats prop, whereabouts store unused get parameter
- Deployed to Vercel: https://the-codex-sepia.vercel.app

**Status**: All master roadmap features shipped. Zero TS errors.

---

## Session — 2026-03-13 (008)

**Goal**: Studio AI-generated backgrounds; new templates; polish.

**Done**:
- Created `generate-template-bg` Supabase Edge Function (Imagen 4) — generates cinematic dark backgrounds per entry type; stores in `covers/template-bgs/`; supports `1:1`, `3:4`, `9:16` aspect ratios
- Created `BackgroundLayer` shared template component — full-bleed bg image + gradient overlay (zIndex 0/1); all content goes to zIndex 2
- Updated all 6 existing templates to accept `backgroundUrl?: string` and render `BackgroundLayer`: NightOutCard, MissionCarousel, SteakVerdict, PS5MatchCard, GatheringInviteCard, CountdownCard
- Removed `flagEmoji` from MissionCarousel (no emojis in templates)
- Created `ToastCard.tsx` (1080×1350) — whisky/spirit session card; supports `spirit`, `dram`, `occasion` metadata
- Created `InterludeCard.tsx` (1080×1080) — contemplative pull-quote card with corner brackets; lore as primary display
- Created `src/ai/templateBg.ts` — client-side helper invoking the edge function
- Studio.tsx wired up: "Generate AI Background" / "Regenerate AI Background" button; `bgUrl` + `generatingBg` state; background clears on template/entry change (aspect ratios differ)
- Added `TemplateId` union type — `TemplateRenderer` switch is now type-safe; new template without a case = TS error
- Added AbortController pattern (cancelled flag) to entries fetch — prevents stale setState on unmount
- Deployed `generate-template-bg` to project `biioztjlsrkgwjyfegey`
- Deployed to Vercel: https://the-codex-sepia.vercel.app

**Status**: All 8 Studio templates have AI background support. Zero TS errors.

---

## Session — 2026-03-13 (007)

**Goal**: UI redesign — more modern, slick. Integrate gold logo.

**Done**:
- Warmer colour palette: obsidian `#0d0b0f`, slate-dark `#141019`, slate-mid `#1e1a28`, slate-light `#2c2638`
- Body warm glow: `body::before` radial gradient `rgba(201,168,76,0.04)` at top
- `--font-display` switched from `'Syne'` (not self-hosted, fell back to system-ui) → `'Playfair Display'` (already self-hosted)
- Grain opacity increased `0.025 → 0.04`
- Floating island bottom nav: pill-shaped, glass morphism, Framer Motion `layoutId` spring for active tab highlight
- Logo integration (`/logo.png` — circular gold emblem): hero on landing, 24px in TopBar when `logo` prop set
- `EntryCard` editorial redesign: 215px image, type badge overlay, date pill, `font-display` title, gold border hover
- `Card` component: removed `border-l-4` entry variant, all variants `rounded-xl`
- `PageWrapper`: `pb-24 → pb-28` for floating nav clearance
- `TopBar`: added `logo?: boolean` prop; warmer glass background
- BrandMark + GoldRule: converted to inline styles only (Tailwind classes don't resolve in html-to-image)
- Deployed to Vercel

**Status**: Design significantly elevated. No emojis anywhere in UI.

---

## Session — 2026-03-14

**Goal**: Get all 3 gents able to log in; deploy Edge Functions; fix magic link.

**Done**:
- Pre-created 3 Supabase auth users via Admin API (`email_confirm: true`, no emails sent)
  - haris.daul@gmail.com → lorekeeper | adelija@gmail.com → keys | vedadcolo@gmail.com → bass
- Seeded `gents` table with matching UUIDs, aliases, display names, full aliases
- Deployed all 7 Edge Functions: generate-lore, generate-cover, generate-stamp, generate-wrapped, generate-portrait, submit-rsvp, submit-guestbook
- Set `ANTHROPIC_API_KEY` and `GOOGLE_AI_API_KEY` as Supabase project secrets
- Fixed `site_url` in config.toml (was `localhost:3000` → `https://the-codex-sepia.vercel.app`)
- Added custom magic link email template (`supabase/templates/magic_link.html`) — dark gold branded design matching app aesthetic
- Pushed updated config to Supabase via `supabase config push`

**Status**: App fully operational. No remaining blockers.

---

## Session — 2026-03-13

**Goal**: Complete Phase 2 through Phase 8 while sleeping.

**Phases completed**:
- Phase 2: Chronicle + Entry System — 7 entry types, forms, Chronicle feed, EntryDetail
- Phase 3: The Passport — stamp system, achievement definitions, Imagen stamp generation
- Phase 4: The Circle — people directory, private notes (RLS), labels
- Phase 5: The Ledger — GentStats, PS5 H2H rivalry, MissionTimeline, Annual Wrapped (Claude)
- Phase 6: The Gathering — pre/post lifecycle, RSVP Edge Functions, public invite + guestbook pages
- Phase 7: The Studio — html-to-image export templates (9 templates), full Studio page
- Phase 8: Profile page, portrait generation, 4 new animation variants

**Build**: Clean at 2140 modules, zero TypeScript errors.

**Edge Functions written**: generate-lore, generate-cover, generate-stamp, generate-wrapped, submit-rsvp, submit-guestbook, generate-portrait (7 total)

**Agent teams used**: 20+ parallel background agents across all phases. /simplify after each phase caught: loading hangs (missing finally blocks), timer leaks (missing useEffect cleanup), logic bugs (fetchMissionsByYear type filter, PS5 achievement criteria key), duplicate imports, dead code.
