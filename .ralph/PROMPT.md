# The Codex — Ralph Development Instructions

## Project
The Codex (internally "Chronicles") is a private PWA for three friends ("The Gents") to log shared experiences — dinners, travel, nightlife, PS5 sessions. It is fully live at https://the-codex-sepia.vercel.app.

**Project root**: `C:/Users/User/OneDrive - United Nations Development Programme/Documents/Personal/Chronicles`

## Tech Stack
- React 18 + TypeScript (strict, `tsc -b` must pass clean)
- Vite, Tailwind CSS (dark-only, custom tokens)
- Framer Motion for all animations
- Supabase (Postgres + Storage + Realtime + Edge Functions)
- React Router v6
- Deployed to Vercel via `npx vercel --prod`

## Critical Rules
1. **`tsc -b` must pass** with zero errors before every deploy. This is stricter than `tsc --noEmit`. `unknown` fields from `Record<string, unknown>` must be narrowed before use in JSX.
2. **After every DB migration**, manually add the new columns to `src/types/database.ts` (Row, Insert, Update sections). There is no auto-generation.
3. **Never use `status: 500`** in Supabase Edge Function catch blocks — always return `status: 200` with an `error` field, otherwise the Supabase JS SDK throws a generic error.
4. **Dark-only design** — no light mode classes.
5. **Mobile-first** — all layouts must work on 390px viewport.
6. **No new dependencies** unless essential and approved.

## Design Tokens
Colors: `obsidian`, `slate-dark`, `slate-mid`, `slate-light`, `ivory`, `ivory-muted`, `ivory-dim`, `gold`, `gold-muted`
Fonts: `font-display` (headings/numbers), `font-body` (all other text)
Borders: `border-white/6`, `border-white/8`, `border-white/10` for cards
Rounded: `rounded-xl` cards, `rounded-2xl` hero/image blocks, `rounded-full` pills/chips

## Key Files
- `src/types/app.ts` — all app interfaces (add new types here)
- `src/types/database.ts` — Supabase generated types (manually maintained)
- `src/lib/navigation.ts` — NAV_SECTIONS (home grid)
- `src/data/gents.ts` — GENT_COLUMNS, fetchGentByAlias, fetchAllGents
- `src/data/entries.ts` — fetchEntries({gentId, type, year, ids}), createEntry, updateEntryCover
- `src/data/stats.ts` — fetchAllStats, COMPARISON_STAT_ROWS
- `src/hooks/useStats.ts` — useStats hook used by Ledger
- `src/components/layout/Shell.tsx` — bottom nav shell
- `src/pages/GentProfile.tsx` — gent profile page at /gents/:alias
- `src/pages/EntryDetail.tsx` — entry detail, has ParticipantsSection, PeoplePresent
- `src/pages/Prospects.tsx` — scouting/prospects page
- `src/pages/BucketList.tsx` — wishlist page
- `supabase/migrations/` — all DB migrations (push with `npx supabase db push`)

## Commands
```bash
# Type check (must pass before deploy)
cd "C:/Users/User/OneDrive - United Nations Development Programme/Documents/Personal/Chronicles"
npx tsc -b

# Push DB migrations
npx supabase db push

# Deploy
npx vercel --prod

# Commit
git add -A && git commit -m "message" && git push
```

## Current Task List
See `.ralph/fix_plan.md` for the prioritised task checklist.

## Implementation Reference
See `docs/00-overview/implementation_plan_v2.md` for full specs of each feature including schema SQL, component structure, and behaviour details.

## RALPH_STATUS Format
At the end of each response, output:
```
RALPH_STATUS
STATUS: IN_PROGRESS | COMPLETE
EXIT_SIGNAL: false | true
COMPLETED_TASKS: [list what was just done]
NEXT: [what comes next]
```
