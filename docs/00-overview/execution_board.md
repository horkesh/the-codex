# Execution Board — The Codex

## Current Milestone
**APP COMPLETE** — All phases shipped. Build clean at 2140 modules. Deployed to Vercel.

## Epics

### E1: Foundation ✅
- [x] Architecture documentation
- [x] Agent roles + napkin + ledger protocols
- [x] Project scaffold (Vite + React + TS + Tailwind + Zustand)
- [x] Supabase project created (auth, tables, storage buckets, edge functions)
- [x] Design tokens implemented (colors, fonts, shadows)
- [x] Routing structure (React Router 7)
- [x] PWA manifest + service worker

### E2: Auth + Gent Profiles ✅
- [x] Supabase Auth (email/password for 3 fixed users)
- [x] `gents` table seeded (3 rows: aliases, display names)
- [x] Auth flow (login screen → redirect to Chronicle)
- [x] Profile screen (gent info, stats summary, avatar upload)

### E3: The Chronicle ✅
- [x] Entry types defined in DB (`entries` table + type-specific JSONB)
- [x] Log new entry flow (type selection → form → submit) — 7 entry types
- [x] Chronicle timeline view (with Upcoming Gatherings strip)
- [x] Entry detail view (hero, lore, photos, metadata, PS5 scoreboard)
- [x] Claude AI "Lore" generation per entry
- [x] Photo upload to Supabase Storage
- [x] Entry participants (which Gents were there)

### E4: The Passport ✅
- [x] `passport_stamps` table
- [x] Auto-stamp on Mission entry creation (city + country)
- [x] Passport UI (cover → stamp grid with tabs)
- [x] Stamp detail view → links to Mission entry
- [x] Achievement stamps system (`achievements` table, 7 definitions)
- [x] Imagen-generated stamp images (generate-stamp Edge Function)

### E5: The Circle ✅
- [x] `people` table (with `labels` column)
- [x] `people_notes` table (private per-gent notes, RLS enforced)
- [x] Add person flow (name, Instagram, photo, linked entry, labels)
- [x] Circle list view (with search + label filter)
- [x] Person detail view (shared info + private notes section, auto-save)

### E6: The Studio ✅
- [x] Export template system (html-to-image, pixelRatio: 3)
- [x] Night Out card template (1080×1350)
- [x] Mission summary carousel template (1080×1080)
- [x] Steak verdict card template (1080×1350)
- [x] PS5 match card template (1080×1080)
- [x] Passport page template (1080×1920)
- [x] Annual Wrapped carousel template (1080×1080)
- [x] Calling card (per Gent) template (1080×1080)
- [x] Gathering Invite Card template (1080×1350)
- [x] Countdown Card template (1080×1920 story)
- [x] Download/share functionality (Web Share API + download fallback)

### E7: The Ledger (Stats) ✅
- [x] Lifetime stats view (including Gatherings count)
- [x] Per-Gent breakdown table
- [x] Year-in-review data (year selector chips)
- [x] PS5 H2H rivalry display (per-pairing dominance bars)
- [x] Mission timeline (horizontal scroll bar chart by year)
- [x] Annual Wrapped generation (Claude claude-sonnet-4-6 narrative)

### E8: Polish & PWA ✅
- [x] PWA install prompt (vite-plugin-pwa)
- [x] Offline capability (service worker precache)
- [x] Real-time updates (Supabase subscriptions — Chronicle feed, RSVPs)
- [x] Animations + transitions (Framer Motion — stagger, stamp reveal, card flip)
- [x] Mobile layout optimization (mobile-first)
- [x] Dark mode only (by design)

### E9: Gathering System ✅
- [x] `gathering_rsvps` table + RLS
- [x] `guest_book_messages` table + RLS
- [x] Gathering entry creation flow (pre-event phase, status: gathering_pre)
- [x] Public invite page (`/g/:slug`) — no auth, animated, RSVP form
- [x] RSVP Edge Function (anonymous insert via service role)
- [x] Real-time RSVP updates in Gathering Detail screen
- [x] Public QR guest book page (`/g/:slug/guestbook`) — cocktail selector, flip animation
- [x] Guest book Edge Function (anonymous insert via service role)
- [x] Post-event phase view (guest book messages, export to Studio)
- [x] Upcoming Gatherings strip in Chronicle feed

### E10: Verdict & Dossier ✅
- [x] `person_scans` table (audit trail for AI intake flow)
- [x] `portrait_url` + `instagram_source_url` columns on `people`
- [x] Global unique index on `lower(instagram)` (deduplication across all gents)
- [x] `scan-person-verdict` Edge Function (Gemini 2.5 Flash vision — eligibility + full scoring)
- [x] `generate-person-portrait` Edge Function (same portrait protocol as Gent portraits)
- [x] `src/lib/instagram.ts` — `normalizeInstagramHandle` + `getInstagramProfileUrl`
- [x] `src/data/personScans.ts` — scan CRUD + `uploadPersonScanPhoto`
- [x] `src/ai/personVerdict.ts` + `src/ai/personPortrait.ts` — client-side AI helpers
- [x] `src/components/circle/VerdictCard.tsx` — verdict label, score, confidence, flags/watchouts
- [x] `src/components/circle/POIModal.tsx` — full intake flow (input → analyzing → review → saving)
- [x] `src/hooks/useVerdictIntake.ts` — orchestrates all intake state + async portrait shimmer
- [x] PersonDetail updated to show AI portrait alongside source photo

### E11: The Toast Auto-Sync
- [ ] Toast app webhook / integration point _(future)_

## Backlog (future)
- QR code calling card (deep link to Gent profile)
- Push notifications ("Vedo just logged a mission")
- Voice memo per entry
- Map view of all missions (Leaflet, like Grand Tour)
- Budget tracker per mission
- Gathering Recap Carousel Studio template
- Seed Budapest 2023 Instagram profiles into Circle

## Completed
All E1–E9 epics shipped 2026-03-13. E10 (Verdict & Dossier) shipped 2026-03-15.
