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

## First-time setup

```bash
# 1. Install dependencies
pnpm install

# 2. Copy env template
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY

# 3. Run database migrations
supabase db push
# (Or paste migrations manually in Supabase SQL editor)

# 4. Deploy Edge Functions
supabase functions deploy generate-lore
supabase functions deploy generate-stamp
supabase functions deploy generate-cover
supabase functions deploy generate-portrait
supabase functions deploy generate-wrapped

# 5. Set Edge Function secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_AI_API_KEY=AIza...

# 6. Start dev
pnpm dev
```

---

## Deploy to production

```bash
# Push to main branch → Vercel auto-deploys
git push origin main

# Edge Functions (if changed)
supabase functions deploy [function-name]
```

---

## Update Supabase TypeScript types

Run after any schema change:

```bash
supabase gen types typescript --project-id [your-project-id] > src/types/database.ts
```

---

## Add a new Edge Function

```bash
supabase functions new [function-name]
# Creates supabase/functions/[function-name]/index.ts

# Deploy
supabase functions deploy [function-name]
```

---

## Common issues

**Port 5173 in use**: `pnpm dev -- --port 5174`

**Supabase types out of date**: Run the gen types command above.

**Edge Function not updating**: Check `supabase functions deploy` ran successfully. Check Supabase dashboard → Edge Functions for error logs.

**html-to-image fonts wrong**: Ensure fonts are self-hosted in `public/fonts/` and loaded via `@font-face` in `globals.css`. Google Fonts CDN is unreliable in html-to-image.

**Supabase RLS blocking queries**: Check that the user is authenticated (`supabase.auth.getUser()` returns a user). Check RLS policies in Supabase dashboard.

---

## Branch strategy

`main` — production (auto-deploys to Vercel)
`dev` — development (optional, for larger features)

For 3 users building together: direct pushes to `main` are fine given the team size.
