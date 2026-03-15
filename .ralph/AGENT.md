# Agent Instructions — The Codex

## Build Commands
```bash
# From project root:
cd "C:/Users/User/OneDrive - United Nations Development Programme/Documents/Personal/Chronicles"

# Type check
npx tsc -b

# Dev server
npx vite

# Build
npx vite build

# DB migrations
npx supabase db push

# Deploy to production
npx vercel --prod
```

## Project Type
TypeScript + React (Vite), Supabase backend, Vercel deployment

## Test Strategy
- `tsc -b` passing is the primary correctness gate (no test suite)
- Visual verification via `npx vercel --prod` deploy
