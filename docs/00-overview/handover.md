# Handover — The Gents Chronicles

_Updated at the end of every session. Read this first when resuming._

---

## Current state (2026-03-18)

**Phase**: **FULLY LIVE.** Continued post-roadmap polish and new features.

**What was just done** (Sessions 013–014):

- Entry photo → cover image pipeline fixed: `entry-photos` storage bucket now has RLS policies; `updateEntryCover` awaited so errors surface
- Scouting Instagram extraction: `event_name` extracted separately from `venue_name`; date as `YYYY-MM-DD`; OG image auto-saved as thumbnail
- **Gent profiles** (`/gents/:alias`): portrait hero, stats chips, bio, recent Chronicle entries; participant avatars in EntryDetail now link here
- **Prospect auto-expiry**: batch-marks overdue prospects as `passed` on every load; sorted upcoming-first
- **Share with Gents**: `visibility` column on prospects; "Share with Gents" in three-dot menu; shared prospects show "Suggested" badge for other gents

**What was done before** (Sessions 011–012):

- POI scanner fully repaired (gemini-2.5-flash, status:200, verify_jwt=false, 4096 tokens)
- Portrait displayed as profile pic everywhere (portrait_url ?? photo_url fallback)
- Mind map: concentric rings, gent-person edges by colour, focus mode, Tag People in EntryDetail
- PersonDetail: Intel tab, tier selector, gent connection selector
- Home: uniform 2×3 grid; Agenda hub (Wishlist + Scouting); Dossier in Chronicle; Our Places in Ledger

**What's left / next ideas**:
- Wishlist (Bucket List): Instagram URL input to auto-populate from event pages
- Passport Stamps: `image_url` field exists but generation not hooked up
- Toast entry type: to be removed (moving to separate app)
- Ledger Sommelier: only populated by Toast entries — revisit once Toast removed

---

## Current state (2026-03-13)

**Phase**: **FULLY LIVE.** All features from the master roadmap implemented, deployed, and code-reviewed.

**What was just done** (Session 009 — Master Roadmap full build + simplify):

### New features built
- **Entry Edit** — `/chronicle/:id/edit` with pre-populated forms for all 7 entry types
- **Passport Stories** — `stories` table, StoryNew (3-step wizard), StoryDetail (arc, places, timeline), StoryCard grid; Claude generates narrative arcs via `generate-story-arc` edge function
- **Instagram Intelligence** — `analyze-instagram` edge function (server-side fetch + OG extraction + Claude); Prospects page at `/prospects`; POI analysis in Circle
- **Circle: Persons of Interest** — "On the Radar" tab in Circle; POIModal with URL/screenshot analysis; `poi_source_url`, `poi_intel`, `poi_visibility` on People
- **Live Whereabouts** — Supabase Realtime broadcast channel `'whereabouts'`; `useWhereabouts` hook; `WhereaboutsWidget` on Chronicle dashboard; ephemeral (no DB persistence); share durations 1h/4h/24h; Nominatim reverse geocoding to neighbourhood
- **Almanac Widget** — "On This Day" anniversary banner on Chronicle dashboard
- **Verdict Board** — top steakhouses by avg score + most-visited cities, in Ledger
- **Rivalry Index** — current/longest streaks + decisive victory stat on top of PS5 H2H, in Ledger
- **Sommelier Section** — spirits/whisky grouping by category from Toast entries, in Ledger
- **Bucket List** — `/bucket-list`; open/done/passed items; smart matching against existing entries
- **Dossier Map** — `/dossier`; rich list grouped by country → city with entry type pills and side panel
- **Entry Reactions** — 4 reaction types (legendary ★, classic •, ruthless ✦, noted ◈) with optimistic updates; on EntryDetail
- **Scene Generation** — "Generate Scene" button on EntryDetail; `generate-scene` edge function (Imagen 4); stored to `scene-images` bucket
- **Story Stamps** — `generate-story-stamp` edge function (Imagen 4); circular stamp art for stories
- **Throwback** — `generate-throwback` edge function; 2-3 sentence retrospective for anniversary entries
- **Weekly Digest** — `send-weekly-digest` edge function; Claude narrative + Resend email to all gents; parallel sends
- **Profile** — portrait generation button + gent status (short text with expiry)
- **Studio templates** — PassportPageExport, GatheringRecap, WrappedCard; wired into Studio

### Schema changes (migration `20260315000001_new_features.sql`)
- `gents`: added `portrait_url`, `status`, `status_expires_at`
- `entries`: added `scene_url`
- `people`: added `category`, `poi_source_url`, `poi_intel`, `poi_source_gent`, `poi_visibility`
- New tables: `prospects`, `stories`, `reactions` (UNIQUE entry_id+gent_id), `bucket_list`
- New storage buckets: `scene-images`, `story-stamps` (migration `20260315000002_new_storage_policies.sql`)

### Code quality pass (simplify)
- `TYPE_COLORS`/`TYPE_LABELS` extracted from StoryNew + StoryDetail → `STORY_TYPE_COLORS`/`STORY_TYPE_LABELS` in `entryTypes.ts`
- `flagEmoji()` removed from DossierMap → imported from `src/lib/utils`; `formatDate()` replaces inline date format
- `fetchEntries()` now accepts `ids?: string[]` filter (`.in('id', ids)`) — used by StoryDetail to batch-fetch only linked entries instead of full chronicle
- `useMemo` added to StoryDetail (derived stats), EntryReactions (countMap single-pass), BucketList (status grouping single-pass)
- `supabase.removeChannel(channel)` added to useWhereabouts cleanup — prevents Realtime listener accumulation on remount
- `send-weekly-digest` emails parallelised with `Promise.all`

---

**Gent auth accounts** (pre-created, no signup needed):
- `haris.daul@gmail.com` → alias: `lorekeeper` (Haris)
- `adelija@gmail.com` → alias: `keys` (Almedin)
- `vedadcolo@gmail.com` → alias: `bass` (Vedo)

**What the app can do now**:
- Log all 7 entry types; edit any entry post-creation
- Chronicle feed with real-time subscriptions, type/year filters, Almanac widget, Live Whereabouts widget
- Passport with stamps, achievements, Stories (multi-entry narrative arcs)
- Circle — contacts + Persons of Interest (Instagram analysis, private/circle visibility)
- Ledger — per-gent stats, PS5 H2H rivalry + Rivalry Index, Mission timeline, Sommelier, Verdict Board, Claude Wrapped
- Gathering lifecycle — creation, invite, RSVP, guestbook, post-event
- Studio — 11 export templates with AI backgrounds
- Prospects — Instagram-sourced upcoming event scouting
- Bucket List — aspirational places/experiences tracker
- Dossier Map — geographic breakdown of chronicle entries
- Entry Reactions — 4 types with optimistic updates
- Scene generation on any entry, Story arc + stamp generation
- Weekly email digest via Resend (must set `RESEND_API_KEY` in Supabase secrets)
- Profile — portrait + status
- Saved Places, EXIF geo-extraction, PWA

**What's left** (future sessions):
- Seed `RESEND_API_KEY` secret in Supabase to activate weekly digest
- Seed Budapest 2023 Instagram profiles into Circle
- QR code for guestbook page
- Leaflet map for Dossier (currently rich list fallback)

## Active blockers
- None. App is fully live at https://the-codex-sepia.vercel.app

## Known decisions (do not relitigate)
- PWA, not native app
- Claude for text AI, Imagen 4 for image AI
- Supabase Edge Functions proxy all AI calls (no separate backend server)
- Vercel deployment (frontend), Supabase (backend)
- Dark-only design (no light mode)
- Three fixed users — no public sign-up
- Gatherings stored as entries with type='gathering', not a separate table
- Private notes always filtered by BOTH person_id AND gent_id
- Whereabouts are ephemeral (Realtime broadcast only, no DB persistence)

## Critical files to read before coding
- `docs/03-architecture/data_model.md` — Supabase schema
- `docs/00-overview/napkin.md` — Active constraints and rules
- `src/types/app.ts` — All app types (now includes Story, Prospect, BucketListItem, Reaction, GentWhereabouts)
- `src/lib/entryTypes.ts` — ENTRY_TYPE_META + STORY_TYPE_COLORS/LABELS (single source of truth)
- `src/data/entries.ts` — `fetchEntries()` supports `type`, `gentId`, `year`, `ids` filters

---

_← Updated 2026-03-18 (Session 014)_
