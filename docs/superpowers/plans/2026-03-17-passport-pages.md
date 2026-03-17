# Passport Pages Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build three passport page templates (Visa Stamp, Debrief Notes, ID Page) matching the physical Pasoš design, update the cover to use the real cover image, integrate into Studio, and redesign the in-app visa view.

**Architecture:** Three new React template components in `src/export/templates/` using the existing forwardRef + inline styles pattern. A shared guilloche SVG border component reused across all three. PassportCover updated to use the extracted cover PNG. VisaPage.tsx redesigned to render the VisaStampPage component inline. Studio gets new template registrations.

**Tech Stack:** React 19, TypeScript, inline CSS (matching existing template patterns — no Tailwind in export templates), SVG for guilloche borders and watermarks.

**Spec:** `docs/superpowers/specs/2026-03-17-passport-pages-design.md`

---

## File Structure

| File | Action | Task | Responsibility |
|---|---|---|---|
| `src/export/templates/shared/PassportFrame.tsx` | Create | 1 | Shared guilloche border + cream background + Europe watermark |
| `src/export/templates/VisaStampPage.tsx` | Create | 2 | Visa page with country header, photo, data fields, stamp |
| `src/export/templates/DebriefPage.tsx` | Create | 3 | Notes/observations page with debrief text |
| `src/export/templates/PassportIdPage.tsx` | Create | 4 | Gent identity page |
| `src/components/passport/PassportCover.tsx` | Modify | 5 | Use real cover image + personalization overlay |
| `src/pages/Studio.tsx` | Modify | 6 | Register new templates + TemplateRenderer cases |
| `src/pages/VisaPage.tsx` | Modify | 7 | Redesign to use visa aesthetic inline |

---

## Task 1: Shared Passport Frame

**Files:**
- Create: `src/export/templates/shared/PassportFrame.tsx`

A reusable wrapper that provides the cream background, guilloche border, and Europe map watermark shared by all three page types.

- [ ] **Step 1: Create PassportFrame component**

```tsx
// Renders the cream background, SVG guilloche border frame, and faint Europe watermark.
// Children are rendered inside the framed area with padding.
// Props: header (optional string for "VIZE-ВИЗЕ-VISAS" or "BILJEŠKE-ЗАБЕЛЕЖКЕ-OBSERVATIONS")
```

Component structure:
- Root div: 1080x1350px, `position: relative`, cream background `#F5F0E1`
- **Guilloche border**: SVG `<rect>` with a repeating wave pattern stroke. Use an inline SVG with `<pattern>` element creating a small repeating sine wave tile. Border color: `rgba(100, 160, 120, 0.2)`. Place as an absolute-positioned SVG frame with ~30px margin from edges.
- **Europe map watermark**: A simplified inline SVG path of Europe's outline, centered, `opacity: 0.06`, color `#64A078`. Keep the path minimal (major coastlines only, ~20 control points).
- **Header text** (if provided): rendered above the border frame in navy `#1B3A5C`, small caps, centered, serif font.
- **Children slot**: rendered inside the border frame with `padding: 60px 50px`.
- **Page footer**: "THE GENTS CHRONICLES" in 8px, centered at bottom, `color: rgba(27,58,92,0.3)`.

- [ ] **Step 2: Verify build + commit**

```
npx tsc --noEmit
git add src/export/templates/shared/PassportFrame.tsx
git commit -m "feat(passport): shared PassportFrame — guilloche border + cream background + watermark"
```

---

## Task 2: Visa Stamp Page Template

**Files:**
- Create: `src/export/templates/VisaStampPage.tsx`

- [ ] **Step 1: Create VisaStampPage component**

Props:
```typescript
interface VisaStampPageProps {
  entry: Entry
  backgroundUrl?: string  // not used (visa has its own background) but needed for template interface
}
```

Uses `React.forwardRef<HTMLDivElement, VisaStampPageProps>`.

Layout inside `<PassportFrame header="VIZE-ВИЗЕ-VISAS">`:
- **Country emblem + VIZA header row**:
  - Left: flag emoji via `flagEmoji(entry.country_code)` at ~40px
  - Right: "VIZA" / "ВИЗА" / "ENTRY VISA" text in large serif (~60px), navy `#1B3A5C`
  - Map country to visa word: `{ HR: 'VIZA', RS: 'ВИЗА', BA: 'VIZA', default: 'ENTRY VISA' }`
- **Cover photo**: entry's `cover_image_url` rendered as a polaroid:
  - White border 6px, rotated 5deg
  - Small translucent "tape" strip: a 30x8px div with `background: rgba(200,190,170,0.5)` positioned across the top corner, rotated slightly
  - Size: ~200x160px, `object-fit: cover`
  - Position: right side, overlapping the data fields slightly
- **Data fields** (left-aligned, monospace labels in navy, values in dark):
  - `DESTINATION:` → `entry.city?.toUpperCase()`
  - `DATE OF TRIP:` → formatted as "MONTH YEAR" (e.g., "JULY 2021")
  - `NUMBER OF GENTS:` → `entry.participants?.length ?? 0`
  - Label style: `fontFamily: 'Georgia, serif', fontSize: '13px', fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.05em'`
  - Value style: `fontFamily: 'Georgia, serif', fontSize: '15px', color: '#2C2C2C'`
- **Mission stamp**: bottom area. If stamp SVG URL available (from `entry.metadata?.stamp_image_url`), render the SVG stamp image at ~120px, rotated -5deg. Otherwise, render a CSS-based fallback stamp: rounded rectangle border in `#8B4513`, rotated -8deg, with entry title + date inside.

- [ ] **Step 2: Verify build + commit**

```
npx tsc --noEmit
git add src/export/templates/VisaStampPage.tsx
git commit -m "feat(passport): VisaStampPage template — visa with photo, data, stamp"
```

---

## Task 3: Debrief/Notes Page Template

**Files:**
- Create: `src/export/templates/DebriefPage.tsx`

- [ ] **Step 1: Create DebriefPage component**

Props: `{ entry: Entry, backgroundUrl?: string }`
Uses `React.forwardRef`.

Layout inside `<PassportFrame header="BILJEŠKE-ЗАБЕЛЕЖКЕ-OBSERVATIONS">`:
- **Mission title**: `entry.title` in serif 28px, navy `#1B3A5C`, centered
- **Location + Date**: `entry.city, entry.country · formatted date` in 13px serif, centered, lighter navy
- **Divider**: thin gold line, 60% width, centered, `margin: 20px auto`
- **Debrief text**: `entry.metadata.mission_debrief` in body font 14px, `color: #2C2C2C`, justified, `lineHeight: 1.7`
- **Landmarks section** (if `entry.metadata.landmarks` exists):
  - Small header "LOCATIONS IDENTIFIED" in 10px small caps, navy
  - Comma-separated list in 12px
- **Risk Assessment** (if `entry.metadata.risk_assessment` exists):
  - Bordered box: `border: 1px solid rgba(139,69,19,0.3)`, `padding: 12px`
  - Header "RISK ASSESSMENT" in 9px small caps
  - Text in 12px italic
- If no debrief exists, show "AWAITING FIELD REPORT" centered in large faded text

- [ ] **Step 2: Verify build + commit**

```
npx tsc --noEmit
git add src/export/templates/DebriefPage.tsx
git commit -m "feat(passport): DebriefPage template — notes page with classified debrief"
```

---

## Task 4: ID Page Template

**Files:**
- Create: `src/export/templates/PassportIdPage.tsx`

- [ ] **Step 1: Create PassportIdPage component**

This template is NOT entry-linked — it's gent-specific. Props:
```typescript
interface PassportIdPageProps {
  gent: { display_name: string; alias: string; full_alias: string; avatar_url: string | null }
  backgroundUrl?: string
}
```

Uses `React.forwardRef`.

Layout inside `<PassportFrame>` (no header):
- **Portrait**: gent's avatar in a 140px circle, centered, with a gold ring border. Below: alias in a small banner (curved text or simple caps text).
- **Data fields** (same style as visa page, but different labels):
  - `NAME:` → gent's display_name
  - `GENT'S STATION:` → gent's full_alias (e.g., "Lore Keeper")
  - `SIGNATURE DRINK:` → hardcoded per alias: `{ keys: 'Cocktails', bass: 'Beer', lorekeeper: 'Beer' }`
  - `ISSUE DATE:` → today's date formatted
- **Bottom**: BrandMark logo (`public/logo-gold.webp`) at 48px, centered
- **Footer**: "THE.GENTS.CHRONICLES" in 10px, centered

- [ ] **Step 2: Verify build + commit**

```
npx tsc --noEmit
git add src/export/templates/PassportIdPage.tsx
git commit -m "feat(passport): PassportIdPage template — gent identity page"
```

---

## Task 5: Passport Cover Update

**Files:**
- Modify: `src/components/passport/PassportCover.tsx`

- [ ] **Step 1: Replace CSS cover with real image**

Read the current PassportCover.tsx. Replace the compass rose SVG and CSS-styled background with:
- Background image: `url(/passport-cover.png)`, `backgroundSize: cover`, `backgroundPosition: center`
- Remove the `CompassRose` component entirely
- Keep the gent info overlay (name, alias, avatar) — reposition over the cover image
- Keep stats box (stamp count, country count)
- Keep travel intel section
- Keep "Open Passport" button
- Avatar: position near the bottom area of the cover, before the stats

The cover image already has "THE GENTS" and the emblem — the gent overlay adds personalization.

- [ ] **Step 2: Verify build + commit**

```
npx tsc --noEmit
git add src/components/passport/PassportCover.tsx
git commit -m "feat(passport): cover uses real Pasoš cover image with gent overlay"
```

---

## Task 6: Studio Integration

**Files:**
- Modify: `src/pages/Studio.tsx`

- [ ] **Step 1: Add TemplateId entries and imports**

Add to the `TemplateId` union type:
```typescript
| 'visa_stamp_page'
| 'debrief_page'
| 'passport_id_page'
```

Add imports:
```typescript
import { VisaStampPage } from '@/export/templates/VisaStampPage'
import { DebriefPage } from '@/export/templates/DebriefPage'
import { PassportIdPage } from '@/export/templates/PassportIdPage'
```

- [ ] **Step 2: Add to TEMPLATES_BY_TYPE**

Add to the `mission` array:
```typescript
{ id: 'visa_stamp_page', label: 'Visa Stamp', dims: '1080×1350', bgAspect: '3:4' },
{ id: 'debrief_page', label: 'Debrief Notes', dims: '1080×1350', bgAspect: '3:4' },
```

Add a new `passport` entry for the ID page (standalone):
```typescript
passport: [
  { id: 'passport_id_page', label: 'ID Page', dims: '1080×1350', bgAspect: '3:4' },
],
```

- [ ] **Step 3: Add TemplateRenderer cases**

Add switch cases in `TemplateRenderer`:
```typescript
case 'visa_stamp_page':
  return <VisaStampPage ref={innerRef} entry={entry} />
case 'debrief_page':
  return <DebriefPage ref={innerRef} entry={entry} />
case 'passport_id_page':
  // Need to get gent data — use a default or pass from parent
  return <PassportIdPage ref={innerRef} gent={...} />
```

For PassportIdPage, the gent data needs to come from somewhere. The simplest approach: import `useAuthStore` in `TemplateRenderer` (or pass gent down from Studio). Since TemplateRenderer is a plain function component inside Studio.tsx, it can access hooks. Add `useAuthStore` and pass gent data.

- [ ] **Step 4: Verify build + commit**

```
npx tsc --noEmit
git add src/pages/Studio.tsx
git commit -m "feat(passport): register visa, debrief, ID templates in Studio"
```

---

## Task 7: Redesign In-App Visa Page

**Files:**
- Modify: `src/pages/VisaPage.tsx`

- [ ] **Step 1: Update VisaPage to use visa aesthetic**

The current VisaPage uses a dark gradient. Redesign it to match the cream passport aesthetic:
- Replace `bg-gradient-to-br from-[#1a1610]...` with cream background `bg-[#F5F0E1]`
- Text colors: navy `text-[#1B3A5C]` instead of ivory/gold
- Keep all existing functionality (debrief generation, photo strip, landmarks)
- Add the guilloche border as a decorative CSS element (simplified for in-app — doesn't need to be as precise as the export template)
- Photo strip stays scrollable
- Debrief section: navy text on cream instead of ivory on dark
- Mission stamp: show the SVG stamp inline
- "VIZE-ВИЗЕ-VISAS" header at top of content area
- Cover photo in polaroid style (white border, slight rotation)

This is a visual reskin of the existing page — all logic, handlers, and data flow stay the same.

- [ ] **Step 2: Verify build + commit**

```
npx tsc --noEmit
git add src/pages/VisaPage.tsx
git commit -m "feat(passport): redesign in-app visa page — cream passport aesthetic"
```

---

## Task 8: Final — /simplify + docs + push

- [ ] **Step 1: Full build**
```
npx tsc --noEmit
```

- [ ] **Step 2: Update CLAUDE.md**
Document: passport cover image, VisaStampPage template, DebriefPage template, PassportIdPage template, Studio integration.

- [ ] **Step 3: Push**
```
git push
```
