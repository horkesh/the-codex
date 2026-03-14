# Environment & Secrets — The Gents Chronicles

## Client environment variables

Set in `.env.local` (development) and Vercel dashboard (production).
All start with `VITE_` to be exposed to the Vite build.

| Variable | Where | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Vercel + .env.local | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Vercel + .env.local | Supabase anon/public key — safe to expose |

These are the ONLY environment variables in the client. The anon key is designed to be public — it only permits what RLS policies allow.

## Edge Function secrets

Set in Supabase dashboard → Settings → Edge Functions → Secrets.
Never in `.env.local`. Never in Vercel. Never in version control.

| Secret | Used by | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | generate-lore, generate-wrapped | Claude API key |
| `GOOGLE_AI_API_KEY` | generate-stamp, generate-cover, generate-portrait | Gemini API key |

Set via CLI:
```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-api03-...
supabase secrets set GOOGLE_AI_API_KEY=AIzaSy...
```

## `.env.example` (committed to repo)

```
# Supabase — get from: https://supabase.com/dashboard/project/[your-project]/settings/api
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# AI API keys are NOT here — they live in Supabase Edge Function secrets only
```

## `.gitignore` entries (critical)

```
.env.local
.env.*.local
dist/
node_modules/
.vercel/
```

## Getting credentials

**Supabase URL + anon key**: Supabase dashboard → Project Settings → API

**Anthropic API key**: console.anthropic.com → API Keys

**Google AI API key**: aistudio.google.com → Get API key (or Google Cloud Console)

## Sharing credentials among the 3 Gents

The app URL and a Supabase invite link is all each Gent needs. They do not need API keys — those are server-side only.

For development (if another Gent wants to run the app locally):
- Share `.env.local` values via a secure channel (not email, not chat in plain text)
- They do NOT need the AI API keys for local dev unless testing Edge Functions locally
