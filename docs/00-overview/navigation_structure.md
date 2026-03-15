# Navigation Structure

_Decided 2026-03-15. Implemented same session._

---

## Principles

- Cards are the primary navigation metaphor at every level (Home → section → sub-section)
- Nothing is more than 2 taps from the Home screen
- Top-level Home grid stays at 6 cards
- Sections own their sub-pages rather than exposing them as orphaned routes

---

## Home grid (6 cards, 2 × 3)

| | |
|---|---|
| Chronicle | Passport |
| Circle | Ledger |
| Studio | Agenda |

---

## Section map

### Chronicle `/chronicle`
- Feed of all entries (default view)
- **Globe icon in TopBar** → `/dossier` (Dossier Map — entries grouped by country → city)
- Same pattern as Circle → Mind Map (icon button, not a separate Home card)

### Passport `/passport`
- Stamps, Stories, Achievements tabs (unchanged)

### Circle `/circle`
- Contacts + POI tabs (unchanged)
- Network icon → `/circle/map` (Mind Map — unchanged)

### Ledger `/ledger`
- Stats, PS5 rivalry, Mission timeline, Wrapped, Verdict Board, Sommelier, Comparison (unchanged)
- **"Our Places" card** within the page → `/places` (saved venue directory)

### Studio `/studio`
- Export templates (unchanged)

### Agenda `/agenda`  _(was: Bucket List `/bucket-list`)_
- Landing page with **two sub-cards**:
  - **Wishlist** → `/agenda/wishlist` — aspirational items (title, category, city, notes); smart-match against Chronicle entries when logged
  - **Scouting** → `/agenda/scouting` — Instagram-sourced event prospects (venue, date, price, dress code, vibe)
- Instagram import works in both sub-sections: paste a link → `analyze-instagram` edge function (event mode) → pre-fills the form

---

## Route map (after reorganization)

| Route | Page | Entry point |
|-------|------|-------------|
| `/home` | Home | — |
| `/chronicle` | Chronicle feed | Home card / SectionNav |
| `/chronicle/:id` | Entry detail | Chronicle feed |
| `/chronicle/:id/edit` | Entry edit | Entry detail |
| `/chronicle/new` | New entry | Chronicle FAB |
| `/dossier` | Dossier Map | Chronicle TopBar globe icon |
| `/passport` | Passport | Home card / SectionNav |
| `/passport/stories/new` | New story | Passport |
| `/passport/stories/:id` | Story detail | Passport |
| `/circle` | Circle | Home card / SectionNav |
| `/circle/map` | Mind Map | Circle TopBar network icon |
| `/circle/:id` | Person detail | Circle |
| `/ledger` | Ledger | Home card / SectionNav |
| `/places` | Saved Places | Ledger "Our Places" card |
| `/studio` | Studio | Home card / SectionNav |
| `/agenda` | Agenda hub | Home card / SectionNav |
| `/agenda/wishlist` | Wishlist | Agenda hub card |
| `/agenda/scouting` | Scouting | Agenda hub card |
| `/gathering/new` | New gathering | Chronicle new entry flow |
| `/gathering/:id` | Gathering detail | Chronicle feed |
| `/profile` | Profile | TopBar avatar |
| `/help` | Help | — |

---

## What changed vs. previous structure

| Page | Was | Now |
|------|-----|-----|
| Dossier Map | Orphaned (`/dossier`) | Chronicle → globe icon |
| Saved Places | Orphaned (`/places`) | Ledger → "Our Places" card |
| Prospects | Orphaned (`/prospects`) | Agenda → Scouting sub-card |
| Bucket List | Home card (`/bucket-list`) | Agenda → Wishlist sub-card |
| Bucket List Home card | `/bucket-list` direct | `/agenda` hub |

---

## Images needed

- `Agenda` Home card: existing `bucket-list.png` repurposed (or regenerate)
- Agenda hub sub-cards: two new images
  - **Wishlist card**: ~600 × 360px — aspirational, forward-looking
  - **Scouting card**: ~600 × 360px — event/venue scouting feel

_← Updated 2026-03-15_
