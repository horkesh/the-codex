# Visa Page V2 — "Stamped Passport Page" Design Spec

Date: 2026-03-17

## Overview

Redesign the in-app visa page (`/passport/visa/{stampId}`) and its Instagram carousel export. The visa card becomes a dense, layered artifact that feels like a real stamped passport page. Below the card, a magazine-style story weaves photos, lore, and debrief into one integrated flow. The Instagram export produces a dynamic carousel (up to 7 slides at 1080x1350).

## Part 1: In-App Visa Card

### Layout (top to bottom)

1. **Header strip** — "VIZE · ВИЗЕ · VISAS" centered, small caps, navy on cream.
2. **Photo band** — `cover_image_url` bleeds edge-to-edge (~160px on mobile). Gradient fade from transparent at top to cream at bottom. Flag emoji + country-specific "VIZA" title overlaid on the bottom-left of the fade.
3. **Destination block** — No labels. City name large in Playfair Display bold (`"BUDAPEST, HUNGARY"`). Below it: date in small caps (`"DECEMBER 2025"`) + duration badge (`"5 DAYS"`) side by side. Duration: inclusive day count from `entry.date` to `metadata.date_end` (e.g. same day = "1 DAY", 5-day span = "5 DAYS"). Omitted entirely if no `date_end`.
4. **Bearer row** — Vertical "BEARERS" label on left (rotated). Each participant: 32px circular avatar + name + alias. From `entry.participants[]`.
5. **One-liner** — `metadata.lore_oneliner` as centered italic Playfair quote. Falls back to first sentence of `entry.lore` via existing `getOneliner()`.
6. **Stamp overlay** — `stamp.image_url` (SVG) or CSS fallback (entry title + date in a bordered box, rotated). Positioned bottom-right, rotated -12deg, ~100px, opacity 0.55. Overlaps body content like a physical stamp.

### Styling

- Background: cream `#F5F0E1`
- Guilloche CSS border pattern (existing from current visa page)
- Europe map SVG watermark (existing)
- Text colors: navy `#1B3A5C` (titles/labels), `#2C2C2C` (body), `#5A6B7A` (secondary), `#8B7355` (accents)
- Fonts: Playfair Display (titles, quotes), Instrument Sans (labels, meta)

### Data sources

| Field | Source |
|---|---|
| Cover photo | `entry.cover_image_url` |
| City, country, country_code | `entry.city`, `entry.country`, `entry.country_code` |
| Date + end date | `entry.date`, `metadata.date_end` |
| Participants | `entry.participants[]` (avatar_url, display_name, alias) |
| One-liner | `metadata.lore_oneliner` or first sentence of `entry.lore` |
| Stamp | `stamp.image_url` (fetched via stamp object in VisaPage, or `fetchStampByEntryId` in Studio) |
| Flag + visa word | `entry.country_code` → existing `visaWord()` mapping |

## Part 2: Magazine Story (Below the Card)

Scrollable content below the visa card, on the dark app background.

### Sections (in order)

1. **"The Mission" header** — gold ornamental divider lines flanking centered label.
2. **Hero photo** — first entry photo (or cover), 16:9, rounded, optional caption overlay.
3. **Lore narrative** — full `entry.lore` in Playfair Display with drop-cap first letter (gold). Split by `\n\n` into paragraphs. Photo pairs interspersed between paragraphs (photos[1]+[2] after first paragraph, photos[3]+[4] after second). If lore is a single paragraph, photo pair goes after it.
4. **"Intelligence Report" header** — same ornamental divider style.
5. **Debrief card** — dark card with gold border:
   - "CLASSIFIED" badge
   - `metadata.mission_debrief` text
   - Landmark tags (gold pills) from `metadata.landmarks`
   - Numbered key moments from `metadata.debrief_highlights`
   - Risk assessment amber box from `metadata.risk_assessment`
   - "Generate Mission Debrief" button if no debrief exists yet
6. **"View Full Entry" button** — outline gold button linking to `/chronicle/{entryId}`.

### Photo distribution logic

- Photos from `fetchEntryPhotos(entryId)`, excluding cover photo (index 0 used as hero).
- Photo pairs pulled in order: photos[1]+[2] after first lore paragraph, photos[3]+[4] after second, etc.
- If lore is a single paragraph or absent, show all photo pairs sequentially after it.
- Remaining photos not shown inline (user can view full entry for complete gallery).

### Graceful degradation

- No lore → skip narrative text, show hero photo + photo pairs, then debrief.
- No debrief → show "Generate Mission Debrief" button instead of debrief card.
- No photos → skip hero and inline pairs, show lore text only.
- No stamp → CSS fallback (existing behavior).
- No `date_end` → omit duration badge, show single date.
- No participants → omit bearer row entirely.

## Part 3: Instagram Carousel Export

Dynamic carousel of 1080x1350 slides, registered as new template entries in Studio.

### Slide generation rules

Slides generated dynamically based on available content. Maximum 7 slides.

| Slide | Content | Condition |
|---|---|---|
| 1 (always) | **Visa card** — compact version of in-app card for 1080x1350. Photo band takes ~30% height (not 40% — tighter for export). PassportFrame wrapper. | Always present |
| 2 (always) | **Hero + lore** — large cover photo top half, lore one-liner below in Playfair italic, participant avatars at bottom. BrandMark footer. | Always present |
| 3–N | **Photo spreads** — 2x2 grid of entry photos (4 per slide). Cream background, thin gold border between photos, entry title + date at top. | 1 slide per 4 photos, max 3 photo slides |
| N+1 | **Debrief** — classified narrative, landmarks as tags, key moments list. Cream PassportFrame background. BrandMark footer. | Only if `metadata.mission_debrief` exists |
| Last | **Stamp page** — large SVG stamp centered on cream background with city + country + date. BrandMark footer. | Only if `stamp.image_url` exists |

### New data helper: `fetchStampByEntryId`

Add to `src/data/stamps.ts`:
```ts
export async function fetchStampByEntryId(entryId: string): Promise<PassportStamp | null>
```
Queries `passport_stamps` where `entry_id = entryId` and `type = 'mission'`, returns first result or null. Used by Studio to get stamp data from an entry context.

### Export templates

New directory `src/export/templates/visa-carousel/`:
- `VisaCardSlide.tsx` — slide 1 (compact visa card for export)
- `HeroLoreSlide.tsx` — slide 2
- `PhotoGridSlide.tsx` — slide 3–N (reusable, accepts array of 1–4 photo URLs)
- `DebriefSlide.tsx` — debrief content
- `StampSlide.tsx` — stamp showcase
- `index.ts` — barrel export + `buildVisaCarousel()` composer

All slides:
- Use inline CSS (not Tailwind) for `html-to-image` compatibility
- Use `PassportFrame` wrapper and `BrandMark` footer (existing shared components)
- Accept `ref` for export via `React.forwardRef`

### Carousel composer

```ts
function buildVisaCarousel(
  entry: EntryWithParticipants,
  photos: EntryPhoto[],
  stamp: PassportStamp | null
): SlideConfig[]
```

Returns an ordered array of `{ id: string, component: ReactElement, ref: RefObject }` based on what data is available. Studio renders all slides simultaneously (hidden offscreen), previews one at a time with arrows.

### Multi-slide export

Add to `src/export/exporter.ts`:
```ts
export async function exportMultipleToPng(elements: HTMLElement[]): Promise<Blob[]>
```
Calls `exportToPng` sequentially for each element. Returns array of blobs.

Add to `src/export/exporter.ts`:
```ts
export async function shareMultipleImages(blobs: Blob[], filenamePrefix: string): Promise<void>
```
Creates `File[]`, uses `navigator.share({ files })` if supported (Web Share API supports multiple files). Falls back to downloading each as `{prefix}-1.png`, `{prefix}-2.png`, etc.

### Studio integration

**Architecture change**: the existing Studio assumes 1 template = 1 ref = 1 export. The visa carousel breaks this. Rather than restructuring the entire Studio, add a carousel-aware code path:

- Add `visa_carousel` to `TemplateId` union type.
- Register in `TEMPLATES_BY_TYPE.mission` as `{ id: 'visa_carousel', label: 'Visa Carousel', dims: '1080×1350' }`.
- In `TemplateRenderer`, `visa_carousel` renders a `VisaCarouselPreview` wrapper component that:
  1. Fetches stamp via `fetchStampByEntryId(entry.id)` and photos via `fetchEntryPhotos(entry.id)` on mount.
  2. Calls `buildVisaCarousel(entry, photos, stamp)` to get slide list.
  3. Renders all slides in a hidden container (for export refs).
  4. Shows the currently active slide in the preview area with prev/next arrows and dot indicators.
  5. Exposes the active slide's ref as `innerRef` for single-slide export (normal "Share" button exports current slide).
  6. Adds an "Export All" button that calls `exportMultipleToPng` + `shareMultipleImages` for the full carousel.

**Participants in Studio context**: `VisaCarouselPreview` fetches `EntryWithParticipants` via `fetchEntry(entry.id)` (which already joins participants) to get avatar/alias data. This is a one-time fetch on mount when the carousel template is selected.

### Remove old templates

- Remove `visa_stamp_page` and `passport_page` from `TEMPLATES_BY_TYPE.mission` — replaced by the carousel.
- Keep `debrief_page` as a standalone option (some users may want just the debrief).
- Delete `src/export/templates/VisaStampPage.tsx` (replaced by `VisaCardSlide.tsx`).
- Delete or keep `PassportPageExport.tsx` depending on whether it's used elsewhere (check references).

## Files to modify

| File | Change |
|---|---|
| `src/pages/VisaPage.tsx` | Rebuild visa card layout + add magazine story below |
| `src/data/stamps.ts` | Add `fetchStampByEntryId(entryId)` |
| `src/export/templates/visa-carousel/` (new) | New directory with 5 slide templates + barrel + composer |
| `src/export/exporter.ts` | Add `exportMultipleToPng` and `shareMultipleImages` |
| `src/pages/Studio.tsx` | Add `visa_carousel` to TemplateId, register in mission templates, add `VisaCarouselPreview` wrapper with carousel preview/export UX |
| `src/export/templates/VisaStampPage.tsx` | Delete (replaced by VisaCardSlide) |

## Out of scope

- Video/animated exports
- Carousel for non-mission entries
- Editing slide content from Studio
- Reordering slides in Studio
