# Handover — The Gents Chronicles

_Updated at the end of every session. Read this first when resuming._

---

## Current state (2026-03-13)

**Phase**: **APP COMPLETE.** All 8 build phases shipped overnight.

**What was just done** (overnight session):
- Phases 2–8 built in full using parallel agent teams
- 83 source files, 7 Supabase Edge Functions, 9 export templates
- Build: clean at 2140 modules, zero TypeScript errors
- /simplify passes after every phase caught real bugs (loading hangs, timer leaks, logic errors)
- Docs updated: build_plan.md, project_ledger.md, napkin.md, execution_board.md, handover.md

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
- Deploy Edge Functions to Supabase (`supabase functions deploy`)
- QR code for guestbook page
- Map view of missions (Leaflet)

## Active blockers
- Edge Functions not yet deployed (need `supabase functions deploy <name>` for all 7)
- `ANTHROPIC_API_KEY` and `GOOGLE_AI_API_KEY` secrets need to be set in Supabase dashboard

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

_← Updated 2026-03-13_
