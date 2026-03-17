# Passport V2 Redesign — Design Spec

## Overview

Fix three problems with the current passport implementation:
1. **Cover** doesn't look passport-like — missing Gents emblem visibility, multi-language text, chip icon
2. **In-app Visa Page** is a wall of text — needs structured visa layout matching the physical Pasoš
3. **Export Template** needs to be a proper Instagram-ready visa page (1080x1350)

## Reference

Physical passport: `docs/passport-ref/visa-ref-makarska.png` — the target layout for visa pages.

---

## Part 1: PassportCover Fix

### Current Problems
- The `passport-cover.png` background has the Gents emblem but overlay elements crowd it
- Missing "PASOŠ / ПАСОШ / PUTOVNICA / PASSPORT" multi-language text
- Missing chip icon (bottom-right)
- Doesn't feel like a passport

### What to Keep
- Avatar, display name, alias
- Stats (stamp count, country count)
- Travel Intelligence section
- "Open Passport" button

### Changes
- Add multi-language passport text below the stats: "PASOŠ · ПАСОШ · PUTOVNICA · PASSPORT" in gold, small caps
- Add chip icon (SVG) in bottom-right area, matching the physical passport
- Add subtle leather texture: `repeating-linear-gradient` with slight gold variation
- Add embossed border feel: `box-shadow: inset 0 0 60px rgba(201,168,76,0.05)`
- Ensure the spacer (`pt-[58%]`) keeps the emblem area clear — the Gents emblem in the background image should be fully visible

### Files
- Modify: `src/components/passport/PassportCover.tsx`

---

## Part 2: In-App Visa Page Rebuild

### Current Problem
Flat cream page with paragraphs of text. No visual structure, no passport feel.

### Target Layout (matching visa-ref-makarska.png)
Mobile-width page with cream background and decorative border:

1. **Header**: "VIZE-ВИЗЕ-VISAS" in small caps, navy `#1B3A5C`, centered
2. **Visa card** (cream `#F5F0E1` with guilloche-inspired CSS border):
   - **Row 1**: Country flag emoji (40px) + "VIZA" / "ВИЗА" / "ENTRY VISA" in large serif (~40px), navy
     - Country-specific: `{ HR: 'VIZA', RS: 'ВИЗА', BA: 'VIZA', HU: 'VIZA', default: 'ENTRY VISA' }`
   - **Polaroid photo**: entry's `cover_image_url`, white border, rotated ~5deg, tape strip across top corner. Positioned right side. ~140x110px on mobile.
   - **Data fields** (below, left-aligned):
     - `DESTINATION:` → city name (uppercase)
     - `DATE OF TRIP:` → "MONTH YEAR" format
     - `NUMBER OF GENTS:` → participant count (e.g. "2" or "3+1")
     - Label: 10px, bold, navy, uppercase, tracked. Value: 14px, dark.
   - **Lore one-liner**: italic Playfair Display, muted brown, centered. From `entry.metadata.lore_oneliner` or first sentence of lore.
   - **Mission stamp**: SVG stamp image (from stamp record), ~110px, rotated -6deg, centered at bottom. Fallback: CSS stamp with entry title + date.

3. **Below the visa card** (scrollable, dark background matching app theme):
   - **Photo strip**: horizontal scroll of up to 6 entry photos
   - **Mission Debrief** (expandable):
     - Collapsed: "Read Mission Debrief" button (if debrief exists) or "Generate Mission Debrief" button
     - Expanded: classified header, debrief text, landmarks pills, highlights, risk assessment
     - Same functionality as current — just moved below the visa card
   - **"View Full Entry"** button at bottom

### Navigation
- Back button returns to passport stamps view
- Everything else stays the same (debrief generation, photo loading)

### Files
- Modify: `src/pages/VisaPage.tsx` — full visual rebuild, keep all data logic

---

## Part 3: Export Template Rebuild (VisaStampPage)

### Target
Instagram-ready 1080x1350 (4:5) visa page matching the physical passport.

### Layout (inside PassportFrame with guilloche border + Europe watermark)
1. **Header**: "VIZE-ВИЗЕ-VISAS" (via PassportFrame header prop)
2. **Row 1**: Country flag + "VIZA" header (same logic as in-app)
3. **Polaroid photo**: cover_image_url, white border, rotated, tape effect. ~200x150px.
4. **Data fields**: DESTINATION, DATE OF TRIP, NUMBER OF GENTS — same style as in-app but sized for export
5. **Lore one-liner**: italic, centered, muted brown
6. **Mission stamp**: SVG stamp image or CSS fallback, rotated, bottom area
7. **Footer**: BrandMark or "THE GENTS CHRONICLES"

### Key Difference from In-App
- Uses inline styles (not Tailwind) — export templates must use inline CSS for html-to-image compatibility
- Uses PassportFrame wrapper for guilloche border + Europe watermark
- No interactive elements (no buttons, no expandable sections)
- Fixed 1080x1350 dimensions

### Files
- Modify: `src/export/templates/VisaStampPage.tsx` — full rebuild matching new design

---

## Non-goals
- No page-flip animation
- No changes to stamp grid, achievements, stories tabs
- No changes to debrief AI generation logic
- No new edge functions
- No changes to DebriefPage or PassportIdPage export templates
