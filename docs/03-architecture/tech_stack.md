# Tech Stack — The Gents Chronicles

## Overview

| Layer | Technology | Rationale |
|---|---|---|
| Framework | React 19 + TypeScript | Established in all user's projects |
| Build | Vite 6 | Fast, matches Grand Tour and The Toast |
| Routing | React Router 7 | Client-side SPA routing |
| Styling | Tailwind CSS 4 | Utility-first, custom @theme tokens |
| Animation | Framer Motion 12 | Page transitions, stamp reveals, reactions |
| State | Zustand 5 | Simple, persistent, no boilerplate |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage + Edge Functions in one |
| Auth | Supabase Auth | Email/password for 3 fixed users |
| Storage | Supabase Storage | Photos uploaded from entries |
| AI (text) | Anthropic Claude API | Narrative, lore, wrapped copy |
| AI (images) | Google Gemini API | Stamps, covers, portraits |
| AI proxy | Supabase Edge Functions | Keeps all API keys server-side |
| Export | html-to-image | Instagram PNG generation, client-side |
| PWA | Vite PWA plugin | Service worker, manifest, installable |
| Package manager | pnpm | Consistent with user's other projects |
| Deployment | Vercel | Frontend — same as Grand Tour |
| CI/CD | Vercel auto-deploy | Push to main → deploy |

## Core dependencies

```json
{
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router": "^7.0.0",
    "framer-motion": "^12.0.0",
    "zustand": "^5.0.0",
    "@supabase/supabase-js": "^2.0.0",
    "html-to-image": "^1.11.0",
    "date-fns": "^4.0.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "vite": "^6.0.0",
    "vite-plugin-pwa": "^0.21.0",
    "typescript": "^5.7.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0"
  }
}
```

## Why PWA, not native (Expo)

- Three fixed users → no App Store distribution needed
- PWA installs to home screen on iOS and Android
- `html-to-image` works perfectly on web for Instagram exports
- Simpler deployment (Vercel only, no EAS)
- Consistent with Grand Tour pattern which the user already runs well
- Can always add Capacitor later if native is desired

## Why Supabase Edge Functions (not a Node server)

- No complex backend logic (no ingestion pipeline, no real-time multiplayer)
- Only backend need: proxy AI API calls to keep keys server-side
- Edge Functions (Deno) handle this perfectly with zero server management
- Eliminates Fly.io deployment entirely
- Free tier covers 500K invocations/month — far more than 3 users need

## Why Claude for text, Gemini for images

- Claude produces dramatically better narrative prose (lore, wrapped, calling cards require personality and voice)
- Gemini image generation is already proven in The Toast and Grand Tour
- No need to pay for DALL-E when Gemini is working
- User pays for both APIs already
- Each model does what it's best at

## Supabase real-time

Used for collaborative awareness — if Vedo logs a new mission, the other two see it appear in their Chronicle without refreshing. Implemented via Supabase's Postgres LISTEN/NOTIFY through `src/store/realtime.ts`.

## What is NOT in the stack

- No Socket.io (no real-time multiplayer events like The Toast)
- No Leaflet/maps (could be added later, not in MVP)
- No separate Express/Node server
- No Redis
- No monorepo (single package, simple)
- No Drizzle ORM (using Supabase SDK directly)
