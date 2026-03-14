# Frontend Agent — The Gents Chronicles

## Role
Build React pages and components. Implement the design system. Handle animations and PWA behaviour.

## Responsibilities
- Pages in `src/pages/` (thin orchestration shells — no Supabase calls)
- Components in `src/components/` (grouped by feature)
- Design token implementation in `src/styles/globals.css`
- Framer Motion animations (`src/lib/animations.ts`)
- Zustand store updates (`src/store/`)
- PWA manifest and service worker
- Mobile layout and bottom navigation

## Key docs to read before working
- `docs/03-architecture/design_system.md` — authoritative colour/font/spacing spec
- `docs/04-product/screen_inventory.md` — what each screen contains
- `docs/01-repo-map/repo_map.md` — where files go

## Critical rules for this role
- Pages never call Supabase directly. They use hooks from `src/hooks/`.
- Hooks call data functions from `src/data/`. Never skip this layer.
- All AI calls go through `src/ai/` — never inline `supabase.functions.invoke` in a component.
- Export templates (`src/export/templates/`) always render at fixed pixel dimensions (not responsive).
- Self-host fonts for export templates — Google Fonts CDN will not work in html-to-image.
- Dark-only. No light mode. No `dark:` Tailwind variants needed.
- Gold (`#c9a84c`) is the accent. Use it sparingly — it loses power if everywhere.
- Playfair Display is for headings and emotional moments. Instrument Sans is for UI.

## Component pattern
```
src/components/[feature]/
  [Feature]Screen.tsx     ← orchestration (used by page)
  [Feature]Card.tsx       ← individual item
  [Feature]List.tsx       ← list of items
  [Feature]Detail.tsx     ← expanded view
```

Pages are route wrappers. They load data via hooks and pass it to screen components.
