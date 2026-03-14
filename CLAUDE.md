# The Gents Chronicles — CLAUDE.md

## What this is
Private lifestyle chronicle app for three friends (The Gents). Deployed at https://the-codex-sepia.vercel.app. Three fixed users, invite-only Supabase Auth (magic link). Not commercial.

## Stack
- **Frontend**: React 19 + TypeScript + Vite 6 + Tailwind v4 + Framer Motion + Zustand 5
- **Backend**: Supabase (Auth + Postgres + Storage + Edge Functions on Deno)
- **AI**: Google Gemini (`gemini-2.5-flash` for text/vision, `gemini-2.5-flash-image` for image generation)
- **Deploy**: Vercel (frontend). GitHub auto-deploy is **disabled** (`"github": { "enabled": false }` in vercel.json). Always deploy manually: `npx vercel --prod --yes`
- **Edge functions**: `npx supabase functions deploy <name> --no-verify-jwt` — all functions use `--no-verify-jwt`

## Key architecture decisions
- **No service worker** — VitePWA is set to `selfDestroying: true`. The SW caused persistent deadlocks by caching Supabase calls. Do not re-enable runtime caching.
- **Auth listener** — `useAuthListener` in `src/hooks/useAuth.ts` must NOT `await` Supabase calls inside `onAuthStateChange`. supabase-js v2 holds an internal lock during the callback; calling `fetchGentById` inside it deadlocks all page queries. The fix is `setTimeout(() => fetchGentById(...).then(setGent), 0)`.
- **Zustand persist** — Auth store (`codex-auth`) persists `gent` to localStorage. Pages can render immediately with persisted data while the auth listener re-validates in background.

## Design system
- Colors: obsidian `#0a0a0f`, gold `#c9a84c`, ivory `#f5f0e8`
- Fonts: Playfair Display (`font-display`), Instrument Sans (`font-body`)
- Language: "Gents" not "users", "Chronicle" not "feed", "Mission" not "trip", "Circle" not "contacts"

## Portrait generation (`supabase/functions/generate-portrait/`)
Two-step pipeline:
1. **Analysis** — `gemini-2.5-flash` with vision: extracts `appearance` (skin tone, hair colour/style, eye colour, facial structure, facial hair, age, overall style) and `traits` (6 personality words)
2. **Generation** — `gemini-2.5-flash-image` text-to-image with prompt:
   > `Stylised portrait avatar of a real person. Subject: ${appearance}. Personality: ${traitList}. Style: High-end digital painting, cinematic dramatic lighting, rich natural colours preserving the subject's actual skin tone and hair colour, sharp facial detail, sophisticated artistic composition, dark elegant background. No text or labels.`
- Portrait uploaded to `portraits` bucket in Supabase Storage
- `appearance_description` saved to `gents` table for use in scene generation
- Frontend compresses photo to 400px / 0.5 JPEG quality before sending (matches Tonight app)

## Instagram photo auto-fetch
When a contact is created/edited with an Instagram handle, `photo_url` is set to `https://unavatar.io/instagram/{handle}`. On edit, only updates if the handle actually changed.

## Deployment workflow
```bash
git add <files> && git commit -m "..." && git push
npx vercel --prod --yes
# For edge functions:
npx supabase functions deploy <function-name> --no-verify-jwt
```

## Related projects (for reference)
- `C:\...\Tonight` — Social game app. Source of avatar prompt patterns and Gemini image generation approach.
- `C:\...\The Grand Tour` — Italy trip PWA.
