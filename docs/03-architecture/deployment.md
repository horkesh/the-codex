# Deployment — The Gents Chronicles

## Architecture overview

```
                    ┌─────────────────┐
                    │     Vercel      │
                    │  (React PWA)    │
                    │  chronicles.app │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼──────────┐     ┌────────────▼────────────┐
    │   Supabase DB       │     │   Supabase Edge Funcs   │
    │   PostgreSQL        │     │   (Deno runtime)        │
    │   Auth              │     │   generate-lore         │
    │   Storage           │     │   generate-stamp        │
    └─────────────────────┘     │   generate-cover        │
                                │   generate-portrait     │
                                │   generate-wrapped      │
                                └─────────────────────────┘
                                          │
                           ┌──────────────┴──────────────┐
                           │                             │
                  ┌────────▼────────┐         ┌──────────▼────────┐
                  │  Anthropic API  │         │   Google Gemini   │
                  │  Claude Opus    │         │   Image Gen       │
                  └─────────────────┘         └───────────────────┘
```

## Frontend — Vercel

**Repository**: `Chronicles/` (root of this project)
**Framework**: None (Vite SPA)
**Build command**: `pnpm build`
**Output directory**: `dist`

`vercel.json`:
```json
{
  "buildCommand": "pnpm build",
  "outputDirectory": "dist",
  "framework": null,
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

**Domain**: Set custom domain when ready (e.g., `chronicles.thegents.app` or similar)
**Environment variables** (set in Vercel dashboard):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Supabase project

**Create at**: supabase.com → New project
**Tier**: Free (more than enough for 3 users)
**Region**: Choose closest to Sarajevo — `eu-central-1` (Frankfurt)

**After creating project**:
1. Copy project URL and anon key → into `.env.local` and Vercel env vars
2. Run migrations: `supabase db push` (or paste SQL in SQL editor)
3. Create storage buckets: `entry-photos`, `people-photos`, `stamps`, `covers`, `portraits`
4. Set bucket policies (private, authenticated access only)
5. Deploy Edge Functions: `supabase functions deploy`
6. Set Edge Function secrets (in Supabase dashboard → Edge Functions → Secrets):
   - `ANTHROPIC_API_KEY`
   - `GOOGLE_AI_API_KEY`

## Edge Functions deployment

```bash
# Deploy all functions
supabase functions deploy generate-lore
supabase functions deploy generate-stamp
supabase functions deploy generate-cover
supabase functions deploy generate-portrait
supabase functions deploy generate-wrapped

# Set secrets
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set GOOGLE_AI_API_KEY=AIza...
```

## Local development

```bash
# Start app
pnpm dev         # → http://localhost:5173

# Supabase local (optional — or use hosted project directly)
supabase start   # → local Supabase at http://localhost:54321

# Serve Edge Functions locally
supabase functions serve
```

**Recommended**: Use the hosted Supabase project directly in dev (not local emulation). Simpler setup for 3 users.

## Environment variables

`.env.local` (never committed):
```
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

`.env.example` (committed — template):
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

AI API keys are NEVER in the frontend env. They live only in Supabase Edge Function secrets.

## Auth setup (3 fixed users)

No public sign-up. Three users are created manually:

1. Go to Supabase dashboard → Authentication → Users → Invite user
2. Invite each Gent's email address
3. They receive invite email, set password
4. After first login, the app creates their `gents` table row (onboarding step)

Or: Use Supabase SQL to seed the `gents` table directly after creating auth users.

## PWA config

`vite.config.ts` includes `vite-plugin-pwa`:
- Manifest: app name, icons, theme colour (`#0a0a0f`)
- Service worker: cache-first for assets, network-first for API calls
- iOS standalone mode supported

Users install: "Add to Home Screen" on iOS/Android → full-screen PWA experience.

## Monitoring

No formal monitoring needed for 3 users. Supabase dashboard shows:
- API request logs
- Edge Function invocation logs
- Storage usage
- Auth events

Vercel dashboard shows deploy logs and runtime errors.
