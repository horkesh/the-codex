# Runbook — The Gents Chronicles

Quick reference for common operations.

---

## Start dev session

```bash
cd "C:\Users\User\OneDrive - United Nations Development Programme\Documents\Personal\Chronicles"
pnpm dev
# → http://localhost:5173
```

---

## Deploy to production

```bash
git add <files> && git commit -m "..." && git push
# GitHub Actions (.github/workflows/deploy.yml) handles everything:
# 1. Installs deps
# 2. Deploys frontend to Vercel (prod)
# 3. Deploys all Supabase Edge Functions
#
# Watch progress: github.com/horkesh/the-codex/actions
```

Required GitHub secrets: `VERCEL_TOKEN`, `SUPABASE_ACCESS_TOKEN`
Vercel project: `prj_iU3ov4FHk374t4L6kjtHH7mT4zEu` (team `team_SpPoZYOLWh3JTJjuvfZG10Xn`)
Supabase project ref: `biioztjlsrkgwjyfegey`

---

## First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Run database migrations
supabase db push

# 4. Set Edge Function secrets (one-time)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_AI_API_KEY=AIza...

# 5. Start dev
pnpm dev
```

---

## Emergency manual deploy (if CI is broken)

```bash
# Frontend
npx vercel deploy --prod --token=<VERCEL_TOKEN>

# Edge Functions (all)
npx supabase functions deploy --project-ref biioztjlsrkgwjyfegey
# SUPABASE_ACCESS_TOKEN must be set in environment
```

To verify which version is live on Supabase:
```bash
npx supabase functions list
# Check VERSION and UPDATED_AT columns — bump confirms the deploy landed
```

---

## Update Supabase TypeScript types

Run after any schema change:

```bash
supabase gen types typescript --project-id biioztjlsrkgwjyfegey > src/types/database.ts
```

---

## Add a new Edge Function

```bash
supabase functions new [function-name]
# Creates supabase/functions/[function-name]/index.ts
# Will be auto-deployed on next git push
```

---

## Common issues

**Home page blank on first hard load / redirects to Landing then back**
Cause: `ProtectedRoute` was redirecting when `gent` was null before Zustand persist hydrated from localStorage.
Current fix (`src/App.tsx`): render immediately if `gent` is already in store; return `null` only if `gent === null && !initialized`; redirect only once `initialized === true`. Do not simplify this back to `if (!gent) redirect` — that breaks first-load.

**Home section cards invisible on first load (appear after navigating away and back)**
Cause: Section cards used `staggerItem` variant with `initial: { opacity: 0 }`. The stagger container mounts after Zustand persist hydrates, which is after `AnimatePresence`'s first render — so `initial={false}` on `AnimatePresence` no longer suppresses the initial state. Cards start invisible and the animate never fires reliably.
Fix: Remove `staggerContainer`/`staggerItem` variants from section cards in `src/pages/Home.tsx`. Cards render immediately; `PageWrapper` `fadeUp` handles the page entrance. Do not add stagger variants back to these cards.

**"Edge Function returned a non-2xx status code"**
This is infrastructure-level (Supabase killed the function), not a code error — our catch block never ran.
Causes: function timeout > 25s, or using `gemini-2.5-flash` (preview, unstable).
Rules: (1) All `new Response(...)` calls must include `status: 200` explicitly. (2) All Gemini `fetch()` calls must use a 20s `AbortController` timeout. (3) Use `gemini-2.0-flash`, not `gemini-2.5-flash`.

**Claude refuses photo analysis**
Claude refuses prompts that score appearance or suggest openers ("social/romantic evaluation framework that commodifies individuals"). Photo scan (`source_type: 'photo'`) must use `gemini-2.0-flash`. Do not route photos through Claude.

**Supabase Edge Function not updating after push**
GitHub Actions deploys ALL functions on every push. Verify with `npx supabase functions list` — check VERSION increased. If stuck, the "Push edge functions" step in Actions may have failed silently.

**Port 5173 in use**: `pnpm dev -- --port 5174`

**Supabase types out of date**: Run gen types above.

**html-to-image fonts wrong**: Fonts must be self-hosted in `public/fonts/` with `@font-face` in `globals.css`. Google Fonts CDN fails inside html-to-image canvas rendering.

**Supabase RLS blocking queries**: Confirm user is authenticated. Check RLS policies in Supabase dashboard → Table Editor → RLS.

---

## Branch strategy

`main` — production (auto-deploys via GitHub Actions on every push)

Direct pushes to `main` are fine for a 3-person team.
