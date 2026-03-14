# Napkin — The Codex

**The Codex** is the product/app name. **The Gents Chronicles** is the external brand name. Use "The Codex" when referring to the app in code and internal docs.

Quick-reference rules and startup protocol. Read at the start of every session.
Max 10 items per section. Prune stale rules. Add new ones as they emerge.

---

## Startup protocol

Every session, in order:
1. Read `docs/00-overview/handover.md` (current state)
2. Read `docs/00-overview/execution_board.md` (what to work on)
3. Read this file (rules)
4. Skim `docs/project_ledger.md` (last 2 entries)

At session end, Chronicle agent:
1. Append to `docs/project_ledger.md`
2. Update `docs/00-overview/handover.md`
3. Update `docs/00-overview/execution_board.md`
4. Update this file if new rules emerged

---

## Architecture rules

1. **Data layer is separate** — `src/data/*.ts` contains all Supabase calls. Pages use hooks. Hooks use data functions. Never skip a layer. _(Added 2026-03-13)_

2. **AI calls through Edge Functions only** — `src/ai/*.ts` calls `supabase.functions.invoke()`. Never call Anthropic or Gemini directly from client code. API keys live in Supabase secrets. _(Added 2026-03-13)_

3. **One Supabase client** — `src/lib/supabase.ts` is the single instance. Never create a second one. _(Added 2026-03-13)_

4. **RLS on every table** — Any new table needs an explicit RLS policy before use. Default: authenticated can SELECT all, INSERT their own, DELETE their own. _(Added 2026-03-13)_

5. **Regenerate types after schema changes** — `supabase gen types typescript --project-id [id] > src/types/database.ts`. Do this before writing any TypeScript that touches new columns. _(Added 2026-03-13)_

6. **Gathering entries have two phases — never publish a Gathering without the post-event phase being complete.** A `gathering_pre` entry is not a Chronicle entry — it lives in the Upcoming strip. A `gathering_post` entry is ready to publish but not yet live. Only `published` Gatherings appear in the Chronicle timeline and count in stats. _(Added 2026-03-13)_

7. **Public pages (invite RSVP, QR guest book) require NO authentication.** `/g/:slug` and `/g/:slug/guestbook` are publicly accessible. They call Edge Functions with the anon key. Never add auth guards to these routes. _(Added 2026-03-13)_

8. **Private Circle notes are per-gent — never query them without filtering by current user's gent_id.** The `people_notes` table has RLS enforcing this, but application-layer queries must also always include `eq('gent_id', currentGentId)`. Never expose another Gent's notes in any component. _(Added 2026-03-13)_

---

## Frontend rules

9. **Pages are orchestration shells** — No Supabase calls. No business logic. Render hooks + pass to components. _(Added 2026-03-13)_

10. **Dark only** — No light mode. No `dark:` Tailwind variants. The app is always dark. Exception: Studio export templates and Public pages (invite + guest book) use light/luxury aesthetics. _(Added 2026-03-13)_

11. **Export templates use fixed dimensions + inline styles** — `style={{ width: 1080, height: 1080 }}` not className. CSS variables may not resolve in html-to-image. Hex values inline. _(Added 2026-03-13)_

12. **Self-host fonts** — Google Fonts CDN unreliable in html-to-image. Playfair Display + Instrument Sans must be in `public/fonts/` and loaded via `@font-face`. _(Added 2026-03-13)_

13. **Gold is precious** — `#c9a84c` and its variants are the primary accent. Use sparingly. It loses impact if it appears on every element. _(Added 2026-03-13)_

14. **Mobile-first** — All layouts start from mobile (375px). Desktop adjustments are additions, not the base. The "wow" moments (Passport reveal, invite card animation, QR guest book) must be perfect on mobile. _(Added 2026-03-13)_

---

## Backend / Edge Function rules

15. **One function, one job** — Edge Functions are single-purpose. No multi-purpose handlers. _(Added 2026-03-13)_

16. **Images go to Storage** — Gemini-generated images are stored in Supabase Storage, not returned as base64. Return the storage URL. _(Added 2026-03-13)_

17. **Edge Functions are Deno** — Use `npm:` prefix for npm packages. Deno standard library for utilities. Not Node.js patterns. _(Added 2026-03-13)_

18. **Deploy all Edge Functions with `--no-verify-jwt`** — Users access functions via magic-link sessions. JWT verification at the function level breaks after session expiry or cache clears. Command: `npx supabase functions deploy <name> --no-verify-jwt`. _(Added 2026-03-13)_

19. **Never `await` Supabase inside `onAuthStateChange`** — supabase-js v2 holds an internal lock during the auth callback. Any Supabase query inside the callback calls `getSession()` which needs the same lock → deadlock → all page queries hang forever. Defer with `setTimeout(() => ..., 0)` to escape the lock. _(Added 2026-03-13)_

20. **No service worker runtime caching** — VitePWA is set to `selfDestroying: true`. The SW was caching Supabase calls and causing infinite spinners. Do not add `runtimeCaching` for any Supabase route. _(Added 2026-03-13)_

---

## Deploy rules

21. **GitHub auto-deploy is permanently disabled** — `"github": { "enabled": false }` in vercel.json. Running `git push` + `npx vercel --prod` simultaneously caused two competing builds with different asset hashes. Always deploy manually: `npx vercel --prod --yes`. _(Added 2026-03-13)_

---

## Portrait generation rules

22. **Portrait prompt must preserve skin tone** — Do not use "moody desaturated" or "minimalist geometric forms" style. These strip all colour and produce a dark featureless alien regardless of subject. Use "rich natural colours preserving the subject's actual skin tone and hair colour, high-end digital painting". _(Added 2026-03-13)_

23. **Analysis prompt must extract skin tone explicitly** — The appearance field must include: skin tone, hair colour/style, eye colour, facial structure, facial hair, age, overall style. Without skin tone the image model renders everyone as dark grey. _(Added 2026-03-13)_

---

## Shell / environment

24. **Windows environment** — This is Windows 11. Use forward slashes in paths where possible. Use `pnpm` not `npm`. Bash shell available via Git Bash. _(Added 2026-03-13)_

25. **Project path** — `C:\Users\User\OneDrive - United Nations Development Programme\Documents\Personal\Chronicles` — quote the path when using in shell due to spaces. _(Added 2026-03-13)_
