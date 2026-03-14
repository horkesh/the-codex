# Project Ledger — The Codex

A running log of every build session. Most recent at top.

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
