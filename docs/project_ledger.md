# Project Ledger — The Gents Chronicles

Chronological record of every session. Most recent first.

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
