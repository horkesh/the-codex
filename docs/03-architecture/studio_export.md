# Studio Export System — The Codex

The Studio converts any Chronicle entry into an Instagram-ready image. No design tools. Log → export.

---

## Principles

1. **Dark cinematic** — Templates are dark luxury cards (`#0D0B0F` base), not the earlier ivory/light concept. AI-generated backgrounds add depth via Imagen 4.
2. **Brand consistent** — Every export carries the `THE GENTS CHRONICLES` wordmark (BrandMark component) and GoldRule dividers.
3. **Purpose-designed** — Templates are not screenshots of the app. They're designed specifically for Instagram dimensions.
4. **One click** — Select entry → select template → optionally generate AI background → export. No editing.
5. **Rendered client-side** — `html-to-image` captures an off-screen React component. No server needed.
6. **Inline styles only** — Tailwind CSS classes do not resolve inside html-to-image. All template styling is inline.

---

## Export dimensions

| Format | Pixels | Use case |
|---|---|---|
| Post (4:5 portrait) | 1080 × 1350 | **All templates** — maximises feed real estate |

All Studio export templates are 4:5 (1080×1350). Imagen aspect ratio used for AI backgrounds: `3:4` (closest supported; `background-size: cover` handles the minor crop).

---

## Templates

### Night Out Card
**Format**: Post (portrait) — 1080×1350
**Content**:
- Venue name (large, Playfair Display, 80px)
- Location with inline dash dividers (gold)
- Date (uppercase, muted)
- Ornamental dot divider
- Lore/description (italic, clamp 3 lines)
- Top + bottom GoldRule + BrandMark
- Background: `#0D0B0F` or AI-generated bar interior scene

### Mission Dispatch
**Format**: Carousel (multiple slides)
- **Slide 1 — Cover**: Mission title, dates, country flags, cover photo, gold stamp in corner
- **Slide 2–N — Days**: One slide per city if multi-city, with stamps
- **Final slide — Stats**: Duration, cities, expense per person, Gents involved
**Format**: Story (1080×1920) for a single-slide compact version

### Steak Verdict
**Format**: Post (portrait) — 1080×1350
**Content**:
- `THE VERDICT` headline (Playfair Display italic, large)
- Restaurant name + city
- Cut + doneness
- Rating (large, JetBrains Mono, gold)
- Verdict text (italic quote)
- Price per person (subtle, bottom)
- Brand mark

Aesthetic: Menu card. Cream background, dark serif typography, gold rule lines.

### PS5 Match Card
**Format**: Post (square) — 1080×1080
**Content**:
- `THE PITCH` headline
- Game name
- All matches listed in order (scoreboard rows: Player vs Player — Score)
- Session champion (large display)
- Head-to-head record per pairing (all-time)
- Brand mark

Aesthetic: Scoreboard. Dark background (exception to light rule — feels like a stadium board), gold numbers.

### Passport Page
**Format**: Story — 1080×1920
**Content**:
- Top: brand mark, passport styling
- Country/city stamps for the mission (circular, Gemini-generated)
- Mission title (Playfair Display)
- Date range
- Lore excerpt (2 sentences, italic)
- Photos (small strip)

Aesthetic: Matches the physical passport — aged cream/ivory, guilloche borders, official typography.

### Annual Wrapped Carousel
**Format**: Carousel — multiple slides at 1080×1080
- **Slide 1 — Cover**: Year. "The Gents Chronicles 20XX Wrapped." Gold on dark (exception).
- **Slide 2 — The Numbers**: Missions, nights out, steaks, PS5 sessions, gatherings, countries, people met
- **Slide 3 — Missions Map**: List of all missions with stamps
- **Slide 4 — Per Gent**: Each Gent's year — what they led
- **Slide 5 — Lore**: Claude-generated "The Year in Review" paragraph
- **Slide 6 — Closing**: Date of first entry. "The Chronicle continues."

### Calling Card (per Gent)
**Format**: Post (square) — 1080×1080
**Content**:
- Gent portrait (Gemini-generated character illustration)
- Alias (large, Playfair Display)
- Full alias (below, smaller, italic)
- One-line bio (Claude-generated)
- Stats line: `12 Missions · 6 Countries · 47 Steaks`
- Instagram: `@the.gents.chronicles`
- Brand mark

This is the "wow" card. The thing you pull out to show someone who the Gents are.

### Gathering Invite Card
**Format**: Post (portrait) — 1080×1350
**Content**:
- Top rule: fine gold line
- `YOU ARE CORDIALLY INVITED` (Instrument Sans, small caps, letter-spaced, gold)
- Event title (large, Playfair Display, centred)
- Date (Playfair Display italic, centred)
- Location (Instrument Sans, muted, centred)
- Gold crest or ornamental divider
- Host line: `Hosted by The Gents`
- `The Gents Chronicles` wordmark (bottom centre)
- Background: deep ivory/cream, subtle paper texture

Aesthetic: A luxury printed invitation card. Formal. The kind of thing you'd frame.

Share path: Downloaded as PNG → shared via WhatsApp or Instagram DM.

### Gathering Recap Carousel
**Format**: Carousel — multiple slides at 1080×1080
Generated after a Gathering is published (post-event phase complete).

- **Slide 1 — Cover**: Gathering title, date, location, cover photo (dark overlay, gold text)
- **Slide 2 — The Lore**: Claude's narrative excerpt (Playfair Display italic, cream background)
- **Slide 3–N — Photos**: One photo per slide, with subtle caption if available
- **Final slide — The Guest Book**: Selected guest messages from the QR guest book (name + message, elegant card layout)

### Countdown Card
**Format**: Story — 1080×1920
Generated from a Gathering entry in `gathering_pre` state (before the event).

**Content**:
- `Until` label (gold, spaced)
- Number of days (240px, Playfair Display, gold glow)
- `Days` label (muted, spaced)
- GoldRule
- Event title + date + location
- BrandMark (absolute bottom)
- Background: `#0D0B0F` or AI-generated scene

### Toast Card (4 variants)
**Format**: Post (portrait) — 1080×1350
**Variants**:
- **V1 Classic**: Centred occasion label + title + spirit, ornamental divider, lore at bottom
- **V2 Cocktail Menu**: Ghost spirit watermark (140px, 8% opacity), bottom-aligned title/dram/oneliner
- **V3 Quote**: Large decorative quote mark, lore-forward centre layout, title below gold rule
- **V4 Date Stamp**: Bold day/month block (left-aligned), occasion badge, bottom-aligned content
All variants use `getMeta(entry)` to extract spirit/dram/occasion from metadata.
Background: `#0D0B0F` or AI-generated whisky glass scene

### Year in Review
**Format**: Post (portrait) — 1080×1350
**Content**:
- Header: BrandMark (sm) + "Year in Review" label
- Year hero (160px Playfair Display)
- Stats grid (2×3): Missions, Countries, Cities, Nights Out, Steaks, Toasts
- Total chronicles count
- Top destination city (large, gold)
- Top 5 cities with flag emojis and visit counts
- Stamp grid (3×3, up to 9 stamps, sepia tinted)
- Footer: GoldRule + "The Chronicle Continues"
- Background: `#0d0b0f` with radial gold glow
Registered in `annual` type alongside WrappedCard.

### Interlude Card _(new)_
**Format**: Post (square) — 1080×1080
**Content**:
- Corner bracket marks (thin gold lines at 4 corners)
- Large decorative opening quotation mark (muted gold)
- Pull quote: `entry.lore` if present, else `entry.title`
- Thin gold rule
- Entry title (if lore shown above) + date
- BrandMark (absolute bottom centre)
- Background: `#0D0B0F` or AI-generated rainy window / city night scene

---

## Technical implementation

### html-to-image flow

```typescript
// src/export/exporter.ts
import { toPng } from 'html-to-image'

export async function exportTemplate(
  templateRef: React.RefObject<HTMLDivElement>,
  filename: string,
  width: number,
  height: number
): Promise<void> {
  const dataUrl = await toPng(templateRef.current!, {
    width,
    height,
    pixelRatio: 2,  // 2x for retina
    style: {
      fontFamily: "'Playfair Display', 'Instrument Sans', serif",
    }
  })

  const link = document.createElement('a')
  link.download = `${filename}.png`
  link.href = dataUrl
  link.click()
}
```

### Template component pattern

```tsx
// src/export/templates/NightOutCard.tsx
interface NightOutCardProps {
  entry: Entry
  backgroundUrl?: string   // AI-generated image URL from generate-template-bg
}

export const NightOutCard = React.forwardRef<HTMLDivElement, NightOutCardProps>(
  ({ entry, backgroundUrl }, ref) => {
    return (
      <div ref={ref} style={{ width: '1080px', height: '1350px', backgroundColor: '#0D0B0F', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* 1. BackgroundLayer always first — zIndex 0+1 */}
        <BackgroundLayer url={backgroundUrl} gradient="strong" />

        {/* 2. All content siblings at zIndex 2 */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          {/* template content — ALL inline styles, no Tailwind */}
        </div>
      </div>
    )
  }
)
```

### AI background flow

```
User clicks "Generate AI Background"
  → src/ai/templateBg.ts → supabase.functions.invoke('generate-template-bg')
  → Edge function → Imagen 4 API → base64 image
  → Upload to covers/template-bgs/{type}-{ts}.webp in Supabase Storage
  → Return public URL
  → Studio sets bgUrl state → passes as backgroundUrl prop to template
  → BackgroundLayer renders the image behind all content
```

Imagen 4 supports: `1:1`, `3:4`, `9:16`. Does NOT support `4:5`. All templates are now 1080×1350 → always use `3:4`. CSS `background-size: cover` handles the minor crop difference.

AI prompts include the gents naturally in every scene — three stylish men placed contextually (at a bar, exploring a city, gaming, toasting). Seen from behind or at distance; never portrait close-ups (that's `generate-portrait`).

### Fonts in exports

Google Fonts don't load reliably in html-to-image. Strategy:
- Self-host Playfair Display and Instrument Sans in `public/fonts/`
- Load via `@font-face` in `globals.css`
- Ensures fonts are available when html-to-image captures

### Share (Web Share API)

On mobile, after generating the PNG, offer "Share" button using Web Share API if available:

```typescript
if (navigator.share && navigator.canShare({ files: [file] })) {
  await navigator.share({ files: [file], title: 'The Gents Chronicles' })
} else {
  // Fallback to download
  triggerDownload(dataUrl, filename)
}
```

---

## Studio page UI

The Studio is not a template editor — it's a launcher.

Layout:
1. Select entry (list of published entries, searchable)
2. Or: select special type (Calling Cards, Annual Wrapped)
3. Or: select a published Gathering → also offers Recap Carousel
4. Available templates for that entry type appear
5. Preview card (thumbnail of what the export will look like)
6. Tap **Export** → generates → download/share prompt

No editing of templates in-app. If a template needs changing, edit the React component.

**Countdown Card** is available from the Gathering detail screen (not the Studio) — accessible while the Gathering is still in `gathering_pre` state, as a quick share action.
