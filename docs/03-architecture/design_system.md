# Design System — The Gents Chronicles

## Philosophy

High class. Dark luxury. The kind of interface that feels like holding a first-edition book in a leather chair. Gold, obsidian, ivory. No gradients unless they're subtle. No colour for colour's sake.

The old Gents palette (ember red + teal) belongs to The Toast. This is a different app — calmer, more permanent, more prestigious.

---

## Colour palette

### Core surfaces
```css
--color-obsidian:    #0d0b0f;   /* App background — warm obsidian */
--color-slate-dark:  #141019;   /* Card background */
--color-slate-mid:   #1e1a28;   /* Elevated surface */
--color-slate-light: #2c2638;   /* Hover state, borders */
```

### Gold system
```css
--color-gold:        #c9a84c;   /* Primary accent — stamps, headings, CTAs */
--color-gold-light:  #e8c97d;   /* Hover state, highlights */
--color-gold-muted:  #a67c35;   /* Subdued gold — metadata, secondary */
--color-gold-dim:    #6b5128;   /* Very subtle — borders, dividers */
```

### Text
```css
--color-ivory:       #f5f0e8;   /* Primary text */
--color-ivory-muted: #c8c0b0;   /* Secondary text */
--color-ivory-dim:   #7a7268;   /* Tertiary text, placeholders */
```

### Semantic / Entry types
```css
--color-mission:    #3d2b6b;    /* Deep purple — Missions */
--color-night-out:  #0f2038;    /* Navy — Nights Out */
--color-steak:      #3d1a0a;    /* Deep brown — Steaks */
--color-playstation:#0a2420;    /* Dark teal-green — PlayStation */
--color-toast:      #3d2010;    /* Warm amber-brown — Toast sessions */
--color-interlude:  #1a1a2e;    /* Neutral dark — Interludes */
```

### Status
```css
--color-success:    #2d6a4f;
--color-error:      #7d1c1c;
--color-warning:    #6b4e1a;
```

---

## Typography

### Fonts
- **Display**: Playfair Display (Google Fonts) — headings, passport titles, entry names
- **Body**: Instrument Sans (Google Fonts) — body text, labels, UI
- **Mono**: JetBrains Mono (Google Fonts) — stats, numbers, dates, codes

### Scale
```css
--text-xs:    0.75rem;    /* 12px — captions, metadata */
--text-sm:    0.875rem;   /* 14px — secondary labels */
--text-base:  1rem;       /* 16px — body */
--text-lg:    1.125rem;   /* 18px — large body */
--text-xl:    1.25rem;    /* 20px — small headings */
--text-2xl:   1.5rem;     /* 24px — section headings */
--text-3xl:   1.875rem;   /* 30px — page headings */
--text-4xl:   2.25rem;    /* 36px — hero headings */
--text-5xl:   3rem;       /* 48px — passport page title */
--text-6xl:   3.75rem;    /* 60px — maximum display */
```

### Weights
- Display headings: 700 (bold) or 400 italic (Playfair)
- Section headings: 600
- Body: 400
- Labels/metadata: 300 or 400
- Numbers/stats: JetBrains Mono 600

---

## Spacing

8px base unit. All spacing multiples of 4px.

```css
--space-1:  4px
--space-2:  8px
--space-3:  12px
--space-4:  16px
--space-6:  24px
--space-8:  32px
--space-12: 48px
--space-16: 64px
--space-24: 96px
```

---

## Borders & Radius

```css
--radius-sm:   4px    /* Badges, small chips */
--radius-md:   8px    /* Cards, inputs */
--radius-lg:   12px   /* Large cards */
--radius-xl:   16px   /* Modals, sheets */
--radius-full: 9999px /* Pills, avatars */

--border-gold:     1px solid var(--color-gold-dim);
--border-gold-glow: 1px solid var(--color-gold-muted);
```

---

## Shadows & Glow

```css
--shadow-card:  0 4px 24px rgba(0, 0, 0, 0.4);
--shadow-modal: 0 8px 48px rgba(0, 0, 0, 0.6);
--glow-gold:    0 0 20px rgba(201, 168, 76, 0.15);
--glow-gold-strong: 0 0 40px rgba(201, 168, 76, 0.3);
```

---

## Component patterns

### Card
```
Background:  --color-slate-dark
Border:      1px solid --color-gold-dim
Radius:      --radius-lg
Shadow:      --shadow-card
Padding:     --space-6
```

On hover: border upgrades to `--color-gold-muted`, subtle glow.

### Button — Primary (Gold)
```
Background:  --color-gold
Text:        --color-obsidian
Radius:      --radius-md
Font:        Instrument Sans 600
Padding:     12px 24px
```

On hover: `--color-gold-light`

### Button — Ghost
```
Background:  transparent
Border:      1px solid --color-gold-dim
Text:        --color-ivory-muted
```

On hover: border → `--color-gold`, text → `--color-ivory`

### Badge (entry type)
Each entry type has its own badge colour (see semantic palette above).
Playfair Display italic, small caps. e.g. *Mission*, *The Table*, *The Pitch*.

---

## Visual textures

### Grain overlay
Same technique as Grand Tour — subtle animated noise on the app background.
```css
.grain::after {
  content: '';
  position: fixed;
  inset: 0;
  background-image: url('/grain.png');  /* or CSS noise */
  opacity: 0.03;
  pointer-events: none;
  animation: grain 8s steps(10) infinite;
}
```

### Guilloche pattern
Used on passport pages and stamp backgrounds.
SVG-based repeating pattern. Gold on dark. Applied as background-image.
Reference: existing patterns in `Gentlemen/Passport/` folder.

### Gold foil effect
Applied to passport stamps and achievement reveals.
CSS shimmer animation over gold elements.

---

## Motion principles

- **Page transitions**: Framer Motion `AnimatePresence`, fade + slight Y translate (16px → 0)
- **Card entrance**: Stagger (0.08s between cards), fade + scale (0.95 → 1)
- **Stamp reveal**: Spring animation. Scale up from 0, slight rotation, bounce.
- **Achievement unlock**: Full-screen moment. Confetti (gold particles). Then stamp settles.
- **No decorative loops**: Animation serves purpose. Nothing spins forever.

---

## Icons

Use Lucide React. Consistent stroke weight (1.5). Ivory coloured by default, gold on active.

---

## Instagram export design

All Studio export templates must:
- Use dark background (`#0D0B0F`) — cinematic dark luxury, NOT ivory/light
- Use gold accents from the brand palette
- Include the brand wordmark: `THE GENTS CHRONICLES` via `BrandMark` component
- Use consistent 80px padding on most templates
- Output at 1080×1080 (post), 1080×1920 (story), 1080×1350 (portrait post)
- Never look like a screenshot of the app — they're purpose-designed cards
- Use inline styles only — Tailwind classes don't resolve inside html-to-image
- Support `backgroundUrl?: string` prop → render `BackgroundLayer` as first child
- No emojis — use CSS ornamental elements (dividers, corner marks, dot bullets)

---

## Dark-only

No light mode. This is intentional and permanent. The app is meant to feel like a private members' club after dark, not a daylight productivity tool.
