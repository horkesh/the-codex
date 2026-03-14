# Entry Type & App Image Prompts — The Gents Chronicles

Standalone prompts for **entry-type category images**, **empty-state illustrations**, and **decorative assets**. Copy one block per image into your generator. Dimensions are inside each prompt. Save to the paths listed in File naming.

---

## Dimensions rationale (use this so you only generate once)

| # | Asset | Dimensions | Where used | Why this size |
|---|--------|------------|------------|----------------|
| 1–7 | Entry-type images | **1080×608 (16:9)** | EntryTypeSelector (card bg), EntryCard (feed, no cover), EntryHero (detail, no cover) | Feed card and hero are landscape; selector uses same image with `object-fit: cover`. Landscape avoids centre-crop waste. |
| 8 | Chronicle empty | **1080×1080 (1:1)** | Chronicle page, centered above “The Chronicle awaits…” + button | Centered illustration in a column; displayed at ~240–320px. Square fits and scales down cleanly. |
| 9 | Circle empty | **1080×1080 (1:1)** | Circle page, centered above “Your circle is empty” + button | Same as above. |
| 10 | Passport empty | **1080×1080 (1:1)** | Passport StampGrid, “No stamps yet” (and Missions tab empty) | Centered above short text. Square. |
| 11 | Passport achievements empty | **1080×1080 (1:1)** | Passport StampGrid, Achievements tab “No achievement stamps yet” | Centered above short text. Square. |
| 12 | Grain | **512×512 (1:1)** | App background overlay, CSS `background-repeat` | Tilable texture; 512 is enough for seamless repeat at low opacity. |
| 13 | Guilloche | **1080×1080 (1:1)** | Passport/stamp decoration, `background-image` or tiled | Tiled or full-panel; square tiles cleanly. |

Generate each asset once at the size in the table; the prompts below match these dimensions.

---

## App asset paths (what the code uses)

Single source of truth for where the app looks for these assets. Add files to `public/`; paths below are relative to `public/`.

| # | Path the app loads | Component / usage |
|---|--------------------|-------------------|
| 1–7 | `/entry-types/01-mission.webp` … `07-interlude.webp` | `ENTRY_TYPE_IMAGES` in `src/lib/entryTypes.ts` → EntryTypeSelector, EntryCard, EntryHero (when no cover). |
| 8 | `/empty-states/chronicle.webp` | `EmptyStateImage` in Chronicle page empty state (`src/pages/Chronicle.tsx`). Hides on 404. |
| 9 | `/empty-states/circle.webp` | `EmptyStateImage` in Circle Contacts and On the Radar empty states (`src/pages/Circle.tsx`). Hides on 404. |
| 10 | `/empty-states/passport.webp` | `EmptyStateImage` in StampGrid for All/Missions/Diplomatic empty (`src/components/passport/StampGrid.tsx`). Hides on 404. |
| 11 | `/empty-states/passport-achievements.webp` | `EmptyStateImage` in StampGrid for Achievements empty. Hides on 404. |
| 12 | (optional) `/textures/grain.png` | Not currently used; app uses inline SVG noise in `globals.css`. Add if you want to switch. |
| 13 | `/textures/guilloche.webp` | PassportCover tiled background at 6% opacity (`src/components/passport/PassportCover.tsx`). Add file to enable. |

Empty-state images use the `EmptyStateImage` component (`src/components/ui/EmptyStateImage.tsx`), which hides itself on load error so missing assets don’t show a broken icon. See also **Visual elements audit** in `docs/03-architecture/visual_audit.md`.

---

## Brand reference: attach this image

**Attach the reference image** (e.g. **docs/01 Gold logo.png**) **only for prompts that say "Match the attached reference image"**—Mission (passport/stamp), Chronicle empty, Passport empty, Passport achievements empty, Guilloche. Those are the only images where the circular emblem style fits. The generator only sees the prompt and the attached image—it does not know about “the app.” Describe the style in the prompt; the attachment shows the exact gold tone and level of detail.

**What the reference shows:** A circular emblem: three silhouetted figures, warm gold (#c9a84c) on solid black, minimalist line-art, classic high-end. No text. **All other prompts** use the same colour discipline (gold and black, plus type accent where stated) but do **not** need the logo attached—they are cinematic/editorial, not emblematic.

**Logo implementation:** `public/logo.png` is used in TopBar, Landing hero, favicon, Apple touch icon. Source file: `docs/01 Gold logo.png`.

---

## 1. Mission — attach logo

```
Image dimensions: 1080 pixels wide by 608 pixels tall, landscape 16:9. Match the attached reference image: circular emblem in warm gold (#c9a84c) on solid black, minimalist line-art or silhouette, classic high-end. Use only that gold and black (plus the type colour below); no text, no logos, no clutter. Dark luxury atmosphere, cinematic composition, shallow depth of field. Add deep purple tones (#3d2b6b) for this type. No text, no logos, no people's faces. Scene: A passport or travel document in soft focus, corner of a vintage map, or a single gold stamp seal on dark leather. Evokes travel, missions, and adventure. Deep purple shadows, one subtle gold highlight. No emojis, no flags, no text. Output size: 1080×608.
```

---

## 2. Night Out

```
Image dimensions: 1080 pixels wide by 608 pixels tall, landscape 16:9. Dark luxury atmosphere, cinematic composition, shallow depth of field. Colour palette: near-black (#0d0b0f), navy blue (#0f2038), and a single accent of warm gold (#c9a84c). No text, no logos, no people's faces. Scene: City skyline at night, or neon glow reflected on wet pavement, or the rim of a glass in a dark bar with one gold reflection. Evokes nights out, the city after dark. Navy and black dominant, one subtle gold accent. No text, no signs with readable words. Output size: 1080×608.
```

---

## 3. The Table (Steak)

```
Image dimensions: 1080 pixels wide by 608 pixels tall, landscape 16:9. Dark luxury atmosphere, cinematic composition, shallow depth of field. Colour palette: near-black (#0d0b0f), deep brown (#3d1a0a), and a single accent of warm gold (#c9a84c). No text, no logos, no people's faces. Scene: A premium cut of meat on a dark plate, or silver cutlery on a dark tablecloth with candlelight, or the edge of a grill with warm ember glow. Evokes the table, steak, a proper meal. Rich browns and black, one gold highlight on metal or rim. No text, no menus. Output size: 1080×608.
```

---

## 4. The Pitch (PlayStation)

```
Image dimensions: 1080 pixels wide by 608 pixels tall, landscape 16:9. Dark luxury atmosphere, cinematic composition, shallow depth of field. Colour palette: near-black (#0d0b0f), dark teal-green (#0a2420), and a single accent of warm gold (#c9a84c). No text, no logos, no people's faces. Scene: A PlayStation-style controller (DualShock shape, symmetric thumbsticks) in silhouette or soft focus on a dark surface—nothing else in frame, no shield, no crest, no emblem beside it. Alternative: stadium-style lighting in deep green and black, or the glow of a screen in a dark room. Evokes the pitch, competition, match day. Teal-green and black dominant, one gold accent. No readable UI, no brand logos. Output size: 1080×608.
```

---

## 5. The Toast

```
Image dimensions: 1080 pixels wide by 608 pixels tall, landscape 16:9. Dark luxury atmosphere, cinematic composition, shallow depth of field. Colour palette: near-black (#0d0b0f), warm amber-brown (#3d2010), and a single accent of warm gold (#c9a84c). No text, no logos, no people's faces. Scene: A whisky glass or cocktail glass on a dark bar, or a bottle and tumbler in soft focus, or amber liquid catching one gold light. Evokes the toast, cocktails, a session. Amber and brown dominant, one gold highlight. No labels, no text. Output size: 1080×608.
```

---

## 6. Gathering

```
Image dimensions: 1080 pixels wide by 608 pixels tall, landscape 16:9. Dark luxury atmosphere, cinematic composition, shallow depth of field. Colour palette: near-black (#0d0b0f), deep forest green (#1a2a1a), and a single accent of warm gold (#c9a84c). No text, no logos, no people's faces. Scene: Candlelight in a dark room, or the backs of silhouetted figures at a dinner table, or an empty chair and glass at a set table. Evokes a hosted gathering, a curated event. Deep green and black, one gold candle or reflection. No text, no signage. Output size: 1080×608.
```

---

## 7. Interlude

```
Image dimensions: 1080 pixels wide by 608 pixels tall, landscape 16:9. Dark luxury atmosphere, cinematic composition, shallow depth of field. Colour palette: near-black (#0d0b0f), muted indigo (#1a1a2e), and a single accent of warm gold (#c9a84c). No text, no logos, no people's faces. Scene: An open book or journal in soft focus, or a single window with dim light, or a quiet still life—pen, paper, one gold detail. Evokes an interlude, a moment worth noting, reflection. Indigo and black dominant, one subtle gold. No readable text. Output size: 1080×608.
```

---

## Empty-state illustrations

Used when a list or section has no data (Chronicle feed, Circle, Passport). One illustration per screen so the empty state feels intentional, not blank. **Prompt 9 (Circle empty):** optional attach logo—the emblem is three figures in a circle, so it fits "your circle" thematically; not required.

---

## 8. Chronicle empty — attach logo (“The Chronicle awaits its first entry”)

```
Image dimensions: 1080 pixels wide by 1080 pixels tall, square 1:1. Use the attached reference ONLY for style and palette (gold on black, minimalist)—do NOT draw the circular emblem or three figures in this image. Match only the colour and tone: warm gold (#c9a84c) on solid black, minimalist line-art or silhouette, classic high-end. Use only that gold and black (plus slate tones #141019, #1e1a28 if needed); no text, no logos, no clutter. Scene: An open leather-bound journal or chronicle book in soft focus, or a quill and inkwell on a dark desk, or a subtle monument or obelisk silhouette—evokes “the chronicle awaits,” something momentous about to be written. One subtle gold highlight. No readable text, no emojis. Output size: 1080×1080.
```

---

## 9. Circle empty (“Your circle is empty”)

```
Image dimensions: 1080 pixels wide by 1080 pixels tall, square 1:1. Dark luxury atmosphere, editorial illustration style. Colour palette: near-black (#0d0b0f), slate tones (#141019, #1e1a28), and a single accent of warm gold (#c9a84c). No text, no logos. Scene: Three minimal silhouetted figures in a loose circle or ring, or an empty round table with three chairs, or three gold dots or medallions on dark—evokes “your circle,” connection, people to be added. One subtle gold accent. No faces, no readable text, no emojis. Output size: 1080×1080.
```

---

## 10. Passport empty — attach logo (“No stamps yet”)

```
Image dimensions: 1080 pixels wide by 1080 pixels tall, square 1:1. Match the attached reference image: circular emblem in warm gold (#c9a84c) on solid black, minimalist line-art or silhouette, classic high-end. Use only that gold and black (plus the type colour below); no text, no logos, no clutter. Editorial illustration style, slate tones (#141019, #1e1a28) allowed. No text, no logos. Scene: An empty passport page or stamp album in soft focus, or an unused stamp pad, or a single empty circular frame where a stamp would go—evokes “no stamps yet,” travel and achievements to come. One subtle gold highlight on edge or corner. No readable text, no emojis. Output size: 1080×1080.
```

---

## 11. Passport achievements empty — attach logo (“No achievement stamps yet”)

```
Image dimensions: 1080 pixels wide by 1080 pixels tall, square 1:1. Match the attached reference image: circular emblem in warm gold (#c9a84c) on solid black, minimalist line-art or silhouette, classic high-end. Use only that gold and black (plus the type colour below); no text, no logos, no clutter. Editorial illustration style, slate tones (#141019, #1e1a28) allowed. No text, no logos. Scene: A trophy or crest in silhouette or very low opacity, or locked medal, or empty podium—evokes “no achievements yet,” milestones to unlock. One subtle gold accent. No readable text, no emojis. Output size: 1080×1080.
```

---

## Decorative / system assets

---

## 12. Grain texture (app overlay)

```
Image dimensions: 512 pixels wide by 512 pixels tall, square 1:1. Dark, minimal, monochrome only. Seamless tilable texture. Fine film grain or subtle noise, monochrome only—pure black and white/grey pixels. Even, natural grain; no patterns or stripes. Used as a repeating overlay at low opacity (about 3–5%). Subtle, not distracting. Output size: 512×512. Must tile seamlessly when repeated (left-right and top-bottom).
```

---

## 13. Guilloche pattern (passport / stamp decoration) — attach logo

```
Image dimensions: 1080 pixels wide by 1080 pixels tall, square 1:1. Match the attached reference image: circular emblem in warm gold (#c9a84c) on solid black, minimalist line-art or silhouette, classic high-end. Use only that gold and black (plus the type colour below); no text, no logos, no clutter. Decorative guilloche pattern—intricate continuous curved lines, ornate border or fill, like classic passport or banknote engraving. Gold lines on transparent or near-black (#0d0b0f) background. Single colour only, no gradients. Elegant, symmetrical. No text, no logos. Can be used as background-image or tiled. Output size: 1080×1080.
```

---

## File naming (for implementation)

**Entry types (1–7):** Save as PNG from generator; convert to WebP for production (e.g. `npx sharp-cli -i 01-mission.png -o 01-mission.webp -f webp -q 85`). App uses the .webp paths.
```
public/entry-types/01-mission.webp
public/entry-types/02-night-out.webp
public/entry-types/03-the-table.webp
public/entry-types/04-the-pitch.webp
public/entry-types/05-the-toast.webp
public/entry-types/06-gathering.webp
public/entry-types/07-interlude.webp
```

**Empty states (8–11):** App loads `.webp` from `public/empty-states/`. Save as PNG from generator; convert to WebP if desired (same paths with .webp extension).
```
public/empty-states/chronicle.webp
public/empty-states/circle.webp
public/empty-states/passport.webp
public/empty-states/passport-achievements.webp
```

**Decorative (12–13):** Grain is optional (app uses CSS noise). Guilloche: app expects `public/textures/guilloche.webp` for Passport cover.
```
public/textures/grain.png      (optional; not wired)
public/textures/guilloche.webp (PassportCover background)
```

---

## Summary tables

**Entry types (1–7)**

| #  | Entry type   | Filename          | Dimensions  | Semantic colour |
|----|-------------|-------------------|------------|------------------|
| 1  | mission     | 01-mission.webp    | 1080×608   | #3d2b6b         |
| 2  | night_out   | 02-night-out.webp  | 1080×608   | #0f2038         |
| 3  | steak       | 03-the-table.webp  | 1080×608   | #3d1a0a         |
| 4  | playstation | 04-the-pitch.webp  | 1080×608   | #0a2420         |
| 5  | toast       | 05-the-toast.webp  | 1080×608   | #3d2010         |
| 6  | gathering   | 06-gathering.webp  | 1080×608   | #1a2a1a         |
| 7  | interlude   | 07-interlude.webp  | 1080×608   | #1a1a2e         |

**Empty states & decorative (8–13)**

| #   | Use              | Filename               | Dimensions  |
|-----|------------------|------------------------|------------|
| 8   | Chronicle empty  | chronicle.webp          | 1080×1080  |
| 9   | Circle empty     | circle.webp             | 1080×1080  |
| 10  | Passport empty   | passport.webp           | 1080×1080  |
| 11  | Passport achievements empty | passport-achievements.webp | 1080×1080  |
| 12  | Grain overlay    | grain.png (optional)    | 512×512    |
| 13  | Guilloche        | guilloche.webp          | 1080×1080  |
