# Repo Map — The Gents Chronicles

## Root structure

```
Chronicles/
├── .claude/
│   ├── napkin.md                    # Startup protocol + recurring rules (READ EVERY SESSION)
│   └── settings.local.json          # Claude Code permissions
│
├── docs/                            # All architecture and planning docs (YOU ARE HERE)
│
├── public/
│   ├── icons/                       # PWA icons (192, 512)
│   ├── fonts/                       # Self-hosted fonts if needed
│   └── sw.js                        # Service worker
│
├── src/
│   ├── main.tsx                     # React entry point
│   ├── App.tsx                      # Router + providers
│   │
│   ├── pages/                       # Route-level components (thin orchestration only)
│   │   ├── Landing.tsx              # Login / entry point
│   │   ├── Chronicle.tsx            # The Chronicle (timeline of all entries)
│   │   ├── EntryNew.tsx             # Log new entry
│   │   ├── EntryDetail.tsx          # Single entry view + Lore + photos
│   │   ├── Passport.tsx             # The Passport (stamp book)
│   │   ├── PassportMission.tsx      # Single mission passport page
│   │   ├── Circle.tsx               # The Circle (people met)
│   │   ├── PersonDetail.tsx         # Single person card
│   │   ├── Studio.tsx               # Export center
│   │   ├── Ledger.tsx               # Stats + Wrapped
│   │   └── Profile.tsx              # Gent profile + settings
│   │
│   ├── components/
│   │   ├── ui/                      # Primitive components (Button, Card, Badge, Input, Modal)
│   │   ├── chronicle/               # Chronicle-specific components
│   │   ├── passport/                # Passport + stamp components
│   │   ├── circle/                  # Circle + person card components
│   │   ├── studio/                  # Export template components
│   │   ├── ledger/                  # Stats + chart components
│   │   └── layout/                  # Nav, Shell, BottomBar, Header
│   │
│   ├── data/                        # Supabase query functions (NEVER mixed with components)
│   │   ├── entries.ts               # CRUD for entries
│   │   ├── stamps.ts                # Passport stamps
│   │   ├── people.ts                # The Circle
│   │   ├── gents.ts                 # Gent profiles
│   │   ├── stats.ts                 # Aggregate stats queries
│   │   └── achievements.ts          # Achievement logic
│   │
│   ├── ai/                          # AI integration functions (call Edge Functions)
│   │   ├── lore.ts                  # Claude: generate entry Lore narrative
│   │   ├── wrapped.ts               # Claude: generate annual Wrapped copy
│   │   ├── stamp.ts                 # Gemini: generate passport stamp image
│   │   ├── cover.ts                 # Gemini: generate entry cover image
│   │   └── portrait.ts              # Gemini: generate Gent portrait (for calling card)
│   │
│   ├── export/                      # Instagram export templates (html-to-image)
│   │   ├── templates/               # One file per template type
│   │   │   ├── NightOutCard.tsx
│   │   │   ├── MissionCarousel.tsx
│   │   │   ├── SteakVerdict.tsx
│   │   │   ├── PS5Match.tsx
│   │   │   ├── PassportPage.tsx
│   │   │   ├── AnnualWrapped.tsx
│   │   │   └── CallingCard.tsx
│   │   └── exporter.ts             # html-to-image orchestration
│   │
│   ├── hooks/                       # Custom hooks (state + logic, no Supabase calls)
│   │   ├── useAuth.ts               # Auth state
│   │   ├── useChronicle.ts          # Chronicle list + filters
│   │   ├── useEntry.ts              # Single entry state
│   │   ├── usePassport.ts           # Passport stamps
│   │   ├── useCircle.ts             # People list
│   │   └── useStats.ts              # Stats aggregation
│   │
│   ├── store/                       # Zustand stores
│   │   ├── auth.ts                  # Auth + gent profile
│   │   ├── ui.ts                    # Global UI state (modals, toasts, loading)
│   │   └── realtime.ts              # Supabase real-time subscription management
│   │
│   ├── lib/
│   │   ├── supabase.ts              # Canonical Supabase client (ONE instance)
│   │   ├── animations.ts            # Framer Motion variants
│   │   └── utils.ts                 # General utilities
│   │
│   ├── styles/
│   │   └── globals.css              # Tailwind + design tokens (@theme)
│   │
│   └── types/
│       ├── database.ts              # Supabase-generated types (auto-updated)
│       └── app.ts                   # App-specific TypeScript interfaces
│
├── supabase/
│   ├── functions/                   # Edge Functions (Deno)
│   │   ├── generate-lore/           # Claude API: entry narrative
│   │   ├── generate-stamp/          # Gemini API: passport stamp image
│   │   ├── generate-cover/          # Gemini API: entry cover image
│   │   ├── generate-portrait/       # Gemini API: calling card portrait
│   │   └── generate-wrapped/        # Claude API: annual Wrapped text
│   ├── migrations/                  # SQL migration files
│   └── config.toml                  # Supabase local config
│
├── .env.example                     # Template (never commit .env.local)
├── .env.local                       # Actual secrets (gitignored)
├── index.html                       # Vite HTML entry
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts               # (if needed — Tailwind v4 may use CSS-only config)
└── vercel.json                      # SPA rewrite
```

## Naming conventions

- Pages: PascalCase, one per route
- Components: PascalCase, grouped by feature
- Data functions: camelCase, prefixed by entity (e.g. `getEntries`, `createStamp`)
- Hooks: camelCase, prefixed `use`
- Stores: camelCase, named by domain
- Edge Functions: kebab-case folder names

## Critical rules

- Pages are thin orchestration shells — no Supabase calls, no business logic
- All Supabase calls live in `src/data/`
- All AI calls go through `src/ai/` which calls Supabase Edge Functions
- Never import from `src/data/` inside a component directly — use hooks
- One Supabase client: `src/lib/supabase.ts`
- All secrets via Edge Functions (never in client code)
