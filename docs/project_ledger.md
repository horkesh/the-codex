# Project Ledger — The Gents Chronicles

Chronological record of every session. Most recent first.

---

## 2026-03-20 — Session 007: Mission Intelligence Overhaul

**Agent**: Claude Opus 4.6
**Status**: Deployed to production.

### What happened
- **Full mission intelligence pipeline**: Missions now run AI-powered photo analysis (Gemini Flash) + multi-stage narrative generation (Claude Sonnet) instead of simple lore. Extracts GPS/timestamps, clusters photos into scenes by temporal proximity, analyzes each photo for venues/food/gents/ephemera, generates per-scene + per-day + trip-level narratives with cross-mission memory.
- **14 new UI components**: MissionDossier vertical scroll layout replacing broken horizontal carousel. Includes DayChapter, SceneCard, RouteMap (Google Maps with gold polyline), TripTempoGraph, MissionVerdict, EphemeraGallery, HighlightReel, GentPresenceBar, GentPerspectives, SceneEditor (Director's Cut), SoundtrackPicker, DayStickyNav.
- **Database**: `entry_photos` gains `gps_lat`, `gps_lng`, `ai_analysis` columns. Complete MissionIntel stored in `entry.metadata.mission_intel`.
- **Video support**: Keyframe extraction from videos via Canvas, audio clip extraction for ambient analysis.
- **Cross-mission memory**: Previous trips to same city referenced in narrative generation.
- **Director's Cut**: Per-scene editing with AI regeneration incorporating director's notes.
- **Soundtrack integration**: Mood picker shapes AI prose style (jazz → smoky, electronic → kinetic, etc.).

### Key decisions
- Scene clustering uses 45-minute time gap + 500m GPS distance thresholds.
- Gemini Flash for photo analysis (Claude refuses appearance scoring), Claude Sonnet for narrative (best literary voice).
- MissionIntel stored in entry.metadata (not separate table) — single source of truth.
- Legacy story auto-creation kept for backward compatibility but deprecated for missions.
- Processing overlay shows 7 stages with progress counts.
- Falls back to legacy lore on pipeline failure.

### Files changed
- New: `supabase/migrations/20260320000001_photo_intelligence.sql`
- New: `src/lib/sceneEngine.ts`, `src/lib/videoKeyframes.ts`, `src/lib/missionIntelBuilder.ts`
- New: `src/ai/missionIntel.ts`, `src/ai/missionLore.ts`
- New: `supabase/functions/analyze-mission-photos/index.ts`, `supabase/functions/generate-mission-narrative/index.ts`
- New: `src/components/mission/` (14 components)
- Modified: `src/types/app.ts` (15+ new interfaces), `src/data/entries.ts` (GPS in upload, cross-mission context, extended photo fetch), `src/lib/geo.ts` (batch reverse geocode), `src/lib/dayBoundary.ts` (export formatDayLabel), `src/pages/EntryNew.tsx` (staged pipeline), `supabase/config.toml` (2 new functions)

---

## 2026-03-14 — Session 006: Profile Polish + EXIF Geo + Saved Places

**Agent**: Claude Sonnet 4.6
**Status**: Live and stable. locations table applied, types regenerated.

### What happened
- **Profile identity polish**: White h1 = `gent.full_alias` (editable role); gold line = `gent.display_name` (real name). Settings renamed to Name + Role + Bio. Role saves to `full_alias`. Real names shown (Haris/Almedin/Vedad).
- **EXIF geo-extraction**: Uploading a photo to an entry now extracts GPS + `DateTimeOriginal` via `exifr`. Reverse-geocodes via Nominatim (zoom=14) to auto-fill city/country/country_code/date fields. Only fills fields that are empty (no overwrite).
- **Saved Places** (`/places`): Shared POI database for all 3 gents. Types: restaurant, bar, home, venue, other. GPS detection on add ("Use current location"). Management page linked from Profile. Route: `/places`.
- **SavedPlacesBar component**: Horizontal chip strip shown above entry forms for location-aware types. Tapping a place force-fills all location fields (overwrite: true).
- **EXIF proximity match**: If EXIF GPS is within 200m of a saved place, auto-uses the place's name as the location field.
- **LocationFill interface** in `src/lib/geo.ts`: `overwrite?: boolean` — false = fill-if-empty (EXIF), true = force-overwrite (place selection).
- **DB migration**: `supabase/migrations/20260314000003_locations.sql` — locations table with RLS. Applied successfully after fixing timestamp collision with gents_appearance migration.
- **TypeScript types**: Regenerated `src/types/database.ts` after applying migration. Removed `any` cast from `src/data/locations.ts`.

### Key decisions
- `exifr` for EXIF extraction — works in browser with File objects, no server needed.
- Nominatim for reverse geocoding — free, no API key, User-Agent required.
- Haversine formula for proximity: 200m threshold for auto-matching saved places.
- `overwrite` flag on LocationFill: EXIF fills empty fields only; explicit place selection overwrites all.
- Migration files must have unique timestamps — two files with the same timestamp collide on the schema_migrations unique key.
- Management API trick: use `sbp_*` personal access token with `POST /v1/projects/{ref}/database/query` to fix corrupted schema_migrations entries when `db push` deadlocks.

### Files changed
- `src/pages/Profile.tsx` — identity display + Saved Places nav button
- `src/lib/geo.ts` — `LocationFill` interface, `haversineMetres`, `extractLocationFromPhoto`
- `src/components/chronicle/PhotoUpload.tsx` — EXIF extraction + proximity check on upload
- `src/components/chronicle/SavedPlacesBar.tsx` — NEW: horizontal chip strip of saved places
- `src/components/chronicle/forms/MissionForm.tsx` (+ NightOut, Steak, Toast) — `detectedLocation` prop, `overwrite` logic
- `src/pages/EntryNew.tsx` — `locationFill` state, `savedPlaces` state, SavedPlacesBar wired up
- `src/data/locations.ts` — NEW: CRUD for locations table
- `src/pages/Places.tsx` — NEW: management page
- `src/App.tsx` — `/places` route
- `supabase/migrations/20260314000003_locations.sql` — DB migration (renamed from 000001 due to timestamp collision)
- `supabase/migrations/20260314000001_gents_appearance.sql` — made idempotent (DO block for policies)
- `src/types/database.ts` — regenerated with locations table

---

## 2026-03-13 — Session 005: Portrait Fix + Spinning Circle Root Cause

**Agent**: Claude Sonnet 4.6
**Status**: Live and stable.

### What happened
- Identified and fixed the root cause of all "spinning circle" issues: `onAuthStateChange` callback was `async` and awaited `fetchGentById`, which deadlocked the supabase-js v2 internal auth lock. All page data queries waited for the same lock → hung forever. Fixed by deferring the DB fetch via `setTimeout(() => fetchGentById(...).then(setGent), 0)`.
- Killed the service worker permanently with `selfDestroying: true` in VitePWA config.
- Restored Tonight app's portrait pipeline with 6 traits. Identified that "moody desaturated color palette" + "minimalist geometric forms" produced dark featureless alien figures. Rewrote the image prompt to preserve skin tone and facial features. Updated analysis prompt to explicitly extract skin tone, hair colour, eye colour, facial hair.
- Created `CLAUDE.md` in project root with full technical context.
- Updated napkin with 8 new rules from hard-won lessons.
- Updated project ledger (this entry).

### Key decisions
- Portrait style: "High-end digital painting, cinematic dramatic lighting, rich natural colours preserving skin tone" — NOT the old Tonight noir/desaturated style.
- Auth listener: always use `setTimeout` to escape the supabase-js auth lock.
- SW: `selfDestroying: true` permanently. No runtime caching ever.

### Files changed
- `src/hooks/useAuth.ts` — auth deadlock fix
- `vite.config.ts` — selfDestroying PWA
- `supabase/functions/generate-portrait/index.ts` — portrait prompt overhaul, consolidated Supabase client, 6 traits
- `src/pages/Profile.tsx` — compression 400px/0.5 quality
- `CLAUDE.md` — created
- `.claude/napkin.md` — 8 new rules

---

## 2026-03-13 — Session 004: Features — Instagram Photos, Portrait, Help, Fixes

**Agent**: Claude Sonnet 4.6
**Status**: Live. Core features complete.

### What happened
- **Instagram auto-fetch**: When a contact is added/edited with an Instagram handle, `photo_url` is auto-set to `https://unavatar.io/instagram/{handle}`. On edit, only updates if the handle changed.
- **Portrait generation merge**: Removed the separate "Upload photo" and "AI portrait" flows. Single "Change photo" button triggers the AI portrait pipeline directly. Photo is compressed client-side (400px, 0.5 quality) and sent to `generate-portrait` edge function.
- **Portrait pipeline**: Two-step via Supabase Edge Function — (1) `gemini-2.5-flash` vision analysis → appearance + traits JSON, (2) `gemini-2.5-flash-image` text-to-image generation → uploaded to `portraits` storage bucket. `appearance_description` saved to `gents` table for scene generation.
- **Field Guide (Help page)**: Built `src/pages/Help.tsx` — "The Field Guide" tutorial page covering all features in the app's own language (Chronicle, Lore, Scene, Passport, Circle, Portrait, Studio, Gatherings). Accessible via `?` button on Profile page. Route: `/help`.
- **Deployment fixes**: Disabled Vercel GitHub auto-deploy (`vercel.json`). Deployed all edge functions with `--no-verify-jwt`. Fixed double-deployment race condition.
- **Gemini model**: Upgraded from deprecated `gemini-2.0-flash` to `gemini-2.5-flash`.

### Files changed
- `src/pages/Circle.tsx` — Instagram → unavatar.io on create
- `src/pages/PersonDetail.tsx` — Instagram → unavatar.io on edit (only if handle changed)
- `src/pages/Profile.tsx` — merged portrait flow, added Help button, timer display
- `src/pages/Help.tsx` — created (The Field Guide)
- `src/App.tsx` — added `/help` route
- `supabase/functions/generate-portrait/index.ts` — full portrait pipeline
- `vercel.json` — GitHub auto-deploy disabled

---

## 2026-03-13 — Session 003: Full App Build

**Agent**: Claude Sonnet 4.6
**Status**: App scaffolded and all core screens built.

### What happened
- Scaffolded full React + TypeScript + Vite + Tailwind v4 + Supabase app from architecture docs
- Built all screens: Landing, Chronicle, EntryNew, EntryDetail, GatheringNew, GatheringDetail, Passport, Circle, PersonDetail, Studio, Ledger, Profile
- Built public pages: PublicInvite (`/g/:slug`), PublicGuestBook (`/g/:slug/guestbook`)
- Implemented Supabase auth (magic link), Zustand auth store with persist, auth listener hook
- Built all data layers: entries, gents, people, gatherings
- Built all Edge Functions: generate-lore, generate-scene, generate-portrait, generate-invite-card
- Implemented design system: obsidian/gold/ivory palette, Playfair Display + Instrument Sans, animation library
- Deployed to Vercel and Supabase
- Set up VitePWA (later caused spinning issues, addressed in Session 005)

---

## 2026-03-13 — Session 002: Architecture Expansion

**Agent**: Claude Sonnet 4.6
**Status**: Architecture phase — no code written yet. Docs updated, no scaffold changes.

### What happened
- Reviewed all existing architecture docs
- Applied 8 confirmed product decisions across all relevant doc files
- App name "The Codex" formalised throughout docs (brand name "The Gents Chronicles" retained externally)
- Gathering entry type fully designed and documented end-to-end
- All doc files updated: vision, entry_system, data_model, studio_export, screen_inventory, execution_board, napkin

### Key decisions recorded

1. **App name is The Codex** — product/app is "The Codex"; external brand is "The Gents Chronicles". All docs now reflect this.

2. **Gathering entry type** — two-phase entry (pre-event + post-event). Pre-event: title, date, location, guest list from The Circle, invite card generated (image + public RSVP web link with countdown). Post-event: add photos, generate Lore, publish as Chronicle entry. Use cases: Herzegovina villa weekend, cocktail parties, curated gatherings.

3. **Invite card system** — two outputs: (a) exported PNG image (1080×1350, luxury invite card, The Codex branding) for WhatsApp sharing; (b) public web link (`/g/:slug`) with animated event page + RSVP button. RSVP responses populate guest list in real-time via Supabase subscriptions.

4. **Live party QR guest book** — QR code displayed at the event. Guests scan → public page (`/g/:slug/guestbook`) → enter name, pick a cocktail from the party menu, leave a message. No login, no app install. Responses saved to `guest_book_messages` table in real-time.

5. **The Toast auto-sync** — when a Toast app session ends, it automatically creates a draft Toast entry in The Codex pre-populated with guest count, session code, theme, duration, date. Gent adds photos and publishes.

6. **The Circle: custom labels + private notes** — `people` table gains a `labels text[]` column for custom labels (e.g., "legend", "BACHATA", "recurring"). New `people_notes` table for private per-gent notes (filtered strictly by `gent_id` — never shared between Gents).

7. **Privacy: everything shared** — all Chronicle entries visible to all 3 Gents. No selective sharing. Exception: private Circle notes per decision 6.

8. **Mobile-first, desktop comfortable** — mobile is the primary target. "Wow" moments (Passport, invite card reveal, QR guest book) happen on mobile. Desktop works well but is not a priority.

9. **PS5 match-by-match tracking** — every individual match within a session is logged (Player 1, Player 2, Score, Winner). `playstation` metadata `matches` array updated to include `match_number`. Head-to-head record per pairing computed at publish time and stored as `head_to_head_snapshot`.

### Docs changed
- `docs/00-overview/vision.md` — renamed to The Codex, added 5th pillar (The Gathering), updated design philosophy to mobile-first, updated privacy model
- `docs/03-architecture/entry_system.md` — added Gathering type + full two-phase spec, invite card, QR guest book, Toast auto-sync, PS5 match-by-match logging, updated entry types table
- `docs/03-architecture/data_model.md` — added `gathering_rsvps` table, `guest_book_messages` table, `people_notes` table; updated `people` table (added `labels`); updated `entries` metadata for gathering and playstation types; updated `entries` status enum; updated `gent_stats` view; updated storage buckets; updated RLS summary
- `docs/03-architecture/studio_export.md` — added Gathering Invite Card template, Gathering Recap Carousel template, Countdown Card template; updated Annual Wrapped to include Gatherings
- `docs/04-product/screen_inventory.md` — added Gathering New, Gathering Detail, Gathering Post-Event screens; added Public Invite page and Public QR Guest Book page (both no-auth); updated Chronicle screen (Upcoming Gatherings strip); updated Circle and Person Detail screens (labels, private notes); updated Entry New (7 types); updated all references to The Codex
- `docs/00-overview/execution_board.md` — renamed to The Codex; added E9 (Gathering System) and E10 (Toast Auto-Sync) epics; updated E3, E5, E6, E7 for new features
- `.claude/napkin.md` — added 4 new rules (Gathering phases, public pages no auth, private Circle notes, The Codex name)

### Next session
Begin scaffolding: `pnpm create vite`, Supabase project setup, Tailwind config, design tokens, folder structure.

---

## 2026-03-13 — Session 001: Architecture Foundation

**Agent**: Claude Sonnet 4.6
**Status**: Architecture phase — no code written yet

### What happened
- Explored the Gentlemen media folder (4.6 GB, 1,981 files) to understand the brand, missions, passport concept, and content library
- Explored The Toast (existing cocktail party app — nearly complete, React/TS/Vite/Gemini/Socket.io)
- Explored The Grand Tour (anniversary PWA — React/TS/Vite/Gemini/Zustand/Leaflet, excellent reference for emotional design)
- Explored Hype (Sarajevo city-discovery app — Expo + Supabase + extensive docs/napkin/ledger discipline)
- Designed full architecture for The Gents Chronicles app
- Created complete docs folder with all architecture documents, agent roles, napkin, and ledger

### Key decisions made
- Platform: React + TypeScript + Vite + PWA (not Expo — 3 users, no App Store needed)
- AI: Claude API (text/narrative) + Gemini API (image generation) via Supabase Edge Functions
- Database: Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- Deployment: Vercel (frontend) + Supabase (backend services)
- State: Zustand + Supabase real-time subscriptions
- Design: Dark luxury — obsidian/gold/ivory, Playfair Display + Instrument Sans
- Export: html-to-image for Instagram-ready PNG generation

### Architecture documents created
- All docs/ folder files (vision, execution board, repo map, tech stack, data model, AI integration, auth, entry system, passport system, studio export, design system, deployment, screen inventory, feature spec, env vars, runbook, ADRs, agent roles)
- `.claude/napkin.md` with startup protocol and rules
- `.claude/settings.local.json` with permissions

### Next session
Begin scaffolding: `pnpm create vite`, Supabase project setup, Tailwind config, design tokens, folder structure.

---
