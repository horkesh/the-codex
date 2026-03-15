# Project Ledger — The Codex

A running log of every build session. Most recent at top.

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
