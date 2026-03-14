# Handover — The Gents Chronicles

_Updated at the end of every session. Read this first when resuming._

---

## Current state (2026-03-14)

**Phase**: **FULLY LIVE.** App deployed, all users seeded, Edge Functions deployed, AI secrets set.

**What was just done** (post-launch session):
- Pre-created 3 Supabase auth users (no email sent, `email_confirm: true` via Admin API)
- Seeded `gents` table rows for all 3 users (alias, display_name, full_alias)
- Deployed all 7 Edge Functions via `supabase functions deploy`
- Set `ANTHROPIC_API_KEY` and `GOOGLE_AI_API_KEY` as Supabase secrets
- Fixed magic link redirect (was pointing to localhost — updated `site_url` in config.toml to Vercel URL)
- Custom magic link email template (`supabase/templates/magic_link.html`) — dark gold branded design

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
- Studio — 9 Instagram-ready export templates via html-to-image
- Profile — avatar upload, bio edit, sign out
- PWA — installable, service worker, precache

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

_← Updated 2026-03-14_
