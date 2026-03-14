# Handover — The Gents Chronicles

_Updated at the end of every session. Read this first when resuming._

---

## Current state (2026-03-13)

**Phase**: **FULLY LIVE.** App deployed, all users seeded, Edge Functions deployed, AI secrets set.

**What was just done** (Sessions 007 + 008):
- **UI redesign**: warmer dark palette (#0d0b0f obsidian), Playfair Display as `--font-display`, floating island bottom nav with Framer Motion spring, gold logo medallion on landing + TopBar, editorial EntryCard, no emojis anywhere
- **Studio AI backgrounds**: "Generate AI Background" button in Studio calls `generate-template-bg` edge function (Imagen 4) — produces cinematic dark backgrounds per entry type; passed to template as `backgroundUrl`
- **2 new Studio templates**: `ToastCard` (1080×1350 — whisky sessions) and `InterludeCard` (1080×1080 — pull-quote reflection)
- **All 8 templates** now accept `backgroundUrl?: string` via shared `BackgroundLayer` component
- `generate-template-bg` edge function deployed to Supabase project `biioztjlsrkgwjyfegey`

**Gent auth accounts** (pre-created, no signup needed):
- `haris.daul@gmail.com` → alias: `lorekeeper` (Haris)
- `adelija@gmail.com` → alias: `keys` (Almedin)
- `vedadcolo@gmail.com` → alias: `bass` (Vedo)

**What the app can do now**:
- Log all 7 entry types (mission, night_out, steak, playstation, toast, gathering, interlude)
- Chronicle feed with real-time subscriptions and type/year filters
- Passport with stamps, achievements, Imagen-generated stamp art
- Circle — people directory with RLS-enforced private notes
- Ledger — per-gent stats, PS5 H2H rivalry, Mission timeline, Claude Wrapped narrative
- Gathering lifecycle — creation, invite, RSVP, guestbook (public pages, no auth), post-event view
- Studio — 8 dark cinematic export templates (NightOut, Mission, Steak, PS5, GatheringInvite, Countdown, Toast, Interlude); AI-generated backgrounds via Imagen 4
- Profile — avatar upload (AI portrait), name/role/bio edit, sign out
- Saved Places — shared POI database, GPS detection, chip bar in entry forms, EXIF proximity match
- EXIF geo-extraction — photo upload auto-fills location + date from image metadata
- PWA — installable (no SW caching)

**What's left** (future sessions):
- Seed Budapest 2023 Instagram profiles into Circle
- Toast auto-sync webhook (E10)
- QR code for guestbook page
- Map view of missions (Leaflet)

## Active blockers
- None. App is fully live at https://the-codex-sepia.vercel.app

## Known decisions (do not relitigate)
- PWA, not native app
- Claude for text AI, Gemini (Imagen 3) for image AI
- Supabase Edge Functions proxy all AI calls (no separate backend server)
- Vercel deployment (frontend), Supabase (backend)
- Dark-only design (no light mode)
- Three fixed users — no public sign-up
- Gatherings stored as entries with type='gathering', not a separate table
- Private notes always filtered by BOTH person_id AND gent_id

## Critical files to read before coding
- `docs/03-architecture/data_model.md` — Supabase schema
- `docs/00-overview/napkin.md` — Active constraints and rules
- `src/types/app.ts` — All app types
- `src/lib/entryTypes.ts` — ENTRY_TYPE_META (single source of truth for entry type config)

---

_← Updated 2026-03-13 (Sessions 007 + 008)_
