# Night Out Flavours — Design Spec

## Overview

Add a "flavour" system to Night Out entries, starting with **Live Music** (for Almedin's pub piano performances) and **Movie Night**. Flavours are metadata tags that unlock flavour-specific form fields, lore directives, and Studio templates — without adding a new entry type or requiring a DB migration.

## Data Model

No migration. All data lives in `entry.metadata`:

| Field | Type | When set |
|-------|------|----------|
| `metadata.flavour` | `'live_music' \| 'movie_night' \| undefined` | Undefined = regular Night Out |
| `metadata.song` | `string \| undefined` | Only when flavour is `live_music` |

Venue is already `entry.location`. No new DB columns. No branded metadata type — use `Record<string, unknown>` with runtime extraction (consistent with steak `cut`/`score`, mission `date_end`, etc.).

## Form Changes

### Flavour pills (NightOutForm)

Row of pill/chip buttons below the title input:

- **Regular** (default) — no special metadata, `flavour` omitted from metadata
- **Live Music** — sets `metadata.flavour = 'live_music'`, reveals Song field
- **Movie Night** — sets `metadata.flavour = 'movie_night'`, no extra fields yet

Styling: gold border on active pill, consistent with filter chips elsewhere in the app. Form tracks `flavour` in local state; conditionally renders the Song field when `form.flavour === 'live_music'`.

### Song field

Visible only when flavour is `live_music`. **Optional** — user can log a Live Music night without specifying the song.

- Label: "Song"
- Placeholder: "What was playing?"
- Stored as `metadata.song`

### NightOutFormData changes

Add two optional fields:

```typescript
flavour?: string
song?: string
```

`EntryNew` passes both into `metadata` on submit, following the existing pattern where `handleSubmit` spreads form-specific fields into the metadata object.

### Edit flow

When editing an existing Night Out entry, the flavour pills reflect the stored `metadata.flavour`. Changing flavour from `live_music` to `regular` clears the `song` field from the form (but doesn't retroactively remove it from DB — next save overwrites metadata).

## Lore Generation

In `generate-lore/index.ts`, branch on `metadata.flavour` before falling back to the standard `entryTypeDirectives[entry.type]`:

- `flavour === 'live_music'` → use live music directive (below)
- `flavour === 'movie_night'` or any other value → fall back to standard Night Out directive
- `flavour` undefined → standard Night Out directive

Live Music directive:

> "This is a Live Music night — one of the Gents at the keys, performing live at a small venue. The prose should capture his presence at the piano, fingers on the keys, the sound filling a tight room. If photos show the performer, describe his command of the instrument and the stage. If photos show the crowd, describe the atmosphere — drinks in hand, conversations paused, eyes on the piano. Reference the song if provided. This is a night where the music came from one of their own."

## Studio Templates

Four new Live Music template variants. Registered in `TEMPLATES_BY_TYPE` under `night_out` alongside the existing V1-V4.

### Template filtering

Studio filters available templates based on entry flavour:

- Entry has `metadata.flavour === 'live_music'` → show `live_music_v1` through `live_music_v4` **plus** the regular Night Out V1-V4
- Entry has no flavour or any other flavour → show only regular Night Out V1-V4 (hide live music templates)

Filter logic: helper function in Studio that checks `selectedEntry.metadata.flavour` and filters `TEMPLATES_BY_TYPE[night_out]` accordingly. Live music templates have a `requiresFlavour: 'live_music'` flag in `TemplateConfig`.

### No BrandMark

Live Music templates omit the BrandMark logo. Design rationale: concert poster / vinyl / setlist aesthetics don't suit a corporate-style logo watermark — it breaks the raw, music-first feel. Templates use the dark-bg pattern (like NightOutCard) with `BackgroundLayer`, not PassportFrame.

### All templates: 1080x1350

Display: song title (from `metadata.song`), venue (from `entry.location`), date, lore oneliner (from `getOneliner(entry)`), photo via `BackgroundLayer`.

### V1 "Marquee" — Jazz club elegant

- Dark obsidian background, gold accents
- Venue name top-centre in small caps tracking
- Large italic serif song title as hero element
- Photo as polaroid or centered with vignette
- Date + "Live Session" badge at bottom

### V2 "Poster" — Gritty concert poster

- Dark bg with subtle noise/grain texture (CSS repeating-linear-gradient)
- Bold uppercase song title, very large (80-100px)
- Venue + date stacked below in mono/condensed style
- Photo with high-contrast treatment (CSS filter)
- Rough border feel via CSS clip-path or inset box-shadow

### V3 "Setlist" — Paper setlist card

- Cream/aged paper background (#F5F0E1, similar to PassportFrame)
- Song title centred in display font
- Venue + date below in small caps
- Subtle ruled-line pattern (CSS repeating-linear-gradient)
- Photo small, polaroid-style at bottom

### V4 "Vinyl" — Record sleeve

- Dark background
- Circular decorative element: concentric rings in gold/muted via SVG circles
- Song title + venue in clean type, centred
- Photo inset or overlapping the vinyl circle
- Minimal, modern feel

## What's NOT Changing

- No DB migration
- No new entry type — still `night_out` under the hood
- Chronicle feed, search, pinning, photo upload, lore section — all unchanged
- Existing Night Out V1-V4 templates — unchanged, still available for all Night Out entries
- Movie Night flavour: form pill only, standard Night Out lore directive as fallback, no special templates yet

## Files to Modify

| File | Change |
|------|--------|
| `src/components/chronicle/forms/NightOutForm.tsx` | Add flavour pills, song field, update FormData |
| `src/pages/EntryNew.tsx` | Pass flavour + song into metadata on submit |
| `supabase/functions/generate-lore/index.ts` | Branch on flavour for live music directive |
| `src/pages/Studio.tsx` | Register live_music templates, add `requiresFlavour` to TemplateConfig, filter by flavour |
| `src/export/templates/LiveMusicCard.tsx` | New file — 4 variant templates |
| `src/lib/entryTypes.ts` | No change (still `night_out` type) |

## Template Data Access

All templates receive `entry` which has `metadata`. Extract at runtime:

```typescript
const meta = entry.metadata as Record<string, unknown>
const song = meta?.song as string | undefined
```

Venue comes from `entry.location`. Oneliner from `getOneliner(entry)`.
