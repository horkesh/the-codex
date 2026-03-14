# ADR 0001 — Technology Stack

**Date**: 2026-03-13
**Status**: Accepted

## Decision

Build The Gents Chronicles as a React + TypeScript + Vite PWA deployed on Vercel, with Supabase for auth/database/storage/edge functions.

## Context

The app is for three specific, known users. No public launch. No App Store. The primary needs are:
- Private shared data between 3 users (requires a real database, not localStorage)
- Beautiful UI that works on mobile
- Instagram export (requires web APIs — html-to-image)
- AI-powered text and images
- Simple deployment (2 people max will ever touch the infra)

## Considered alternatives

**Expo (React Native)**:
- Used in Hype project
- Pros: native feel, App Store distribution
- Cons: App Store overhead for 3 users is wasteful; html-to-image doesn't work well on native; more complex deployment (EAS)
- Verdict: Unnecessary for this scale

**Next.js instead of Vite**:
- Pros: SSR, image optimisation, built-in API routes
- Cons: SSR unnecessary for a private PWA; api routes would replace Edge Functions but with more complexity; the user's proven pattern (Grand Tour, The Toast) is Vite
- Verdict: Stick with what works

**Firebase instead of Supabase**:
- Pros: real-time by default, NoSQL flexibility
- Cons: no SQL (stats views are much easier in PostgreSQL); Supabase already used in Hype; free tier more generous for our needs; Supabase Edge Functions replace a Firebase Cloud Functions setup
- Verdict: Supabase

**Separate Node/Express backend**:
- Used in The Toast
- Pros: full control, familiar
- Cons: another deployment target (Fly.io); unnecessary for 3 users with no complex server logic; Supabase Edge Functions handle the only backend need (AI proxy)
- Verdict: Edge Functions only

## Consequences

- Simple deployment: one Vercel project, one Supabase project
- All API keys stay server-side (Edge Functions)
- Real-time updates between the 3 Gents via Supabase subscriptions
- Consistent with user's existing tech knowledge (React, TypeScript, Vite, Tailwind)
- PWA install on iOS/Android — no App Store needed
