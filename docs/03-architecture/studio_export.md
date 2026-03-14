# Studio Export System — The Codex

The Studio converts any Chronicle entry into an Instagram-ready image. No design tools. Log → export.

---

## Principles

1. **Light backgrounds** — Instagram performs better with light-coloured posts. Studio templates use ivory/white with gold accents, not the dark app UI.
2. **Brand consistent** — Every export carries the `THE GENTS CHRONICLES` wordmark. Playfair Display + Instrument Sans.
3. **Purpose-designed** — Templates are not screenshots of the app. They're designed specifically for Instagram dimensions.
4. **One click** — Select entry → select template → download. No editing.
5. **Rendered client-side** — `html-to-image` captures an off-screen React component. No server needed.

---

## Export dimensions

| Format | Pixels | Use case |
|---|---|---|
| Post (square) | 1080 × 1080 | Standard post |
| Post (portrait) | 1080 × 1350 | Taller post — more feed real estate |
| Story | 1080 × 1920 | Story / reel cover |
| Carousel slide | 1080 × 1080 | One slide of a multi-slide post |

---

## Templates

### Night Out Card
**Format**: Post (portrait) — 1080×1350
**Content**:
- Entry date (top left, small, Mono font, gold)
- Venue name (large, Playfair Display)
- City (Instrument Sans, muted)
- Vibe rating (5 gold stars, partially filled)
- Special moment quote (italic, large, centre)
- Gents who were there (small avatars at bottom)
- Brand mark (bottom right)
- Background: soft ivory with subtle grain

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
- Background: dark navy or deep charcoal with grain
- `T MINUS` (small caps, gold, top)
- Number of days (very large, Playfair Display, gold) — e.g., `14`
- `DAYS TO` (small caps, gold)
- Event title (large, Playfair Display italic, ivory)
- Location (Instrument Sans, muted)
- Date (Mono font, gold, bottom)
- The Gents Chronicles wordmark (bottom centre)

Example: "14 DAYS TO HERZEGOVINA SUMMER"

Share path: Exported from Studio → shared as an Instagram story to build anticipation.

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
// This component is rendered off-screen (position: fixed, opacity: 0, left: -9999px)
// Only rendered when export is triggered

interface NightOutCardProps {
  entry: Entry
  gents: Gent[]
}

export function NightOutCard({ entry, gents }: NightOutCardProps) {
  // Always renders at 1080×1350 — no responsive sizing
  return (
    <div
      style={{ width: 1080, height: 1350, fontFamily: 'Playfair Display' }}
      className="bg-ivory relative overflow-hidden"
    >
      {/* Template content */}
    </div>
  )
}
```

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
