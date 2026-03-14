# Project Ledger — The Codex

A running log of every build session. Most recent at top.

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
