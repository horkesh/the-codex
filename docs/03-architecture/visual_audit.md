# Visual elements audit — The Gents Chronicles

Re-examination of all visual elements and where we can improve. Use this when quota allows (empty-state images) and for incremental polish.

---

## 1. What’s already strong

- **Design system** (colour, gold, typography, motion principles) is clearly defined and mostly followed.
- **Entry-type images** — WebP in place; used in EntryTypeSelector, EntryCard, EntryHero when no cover.
- **Landing** — Logo, glow, ornamental divider, tagline; feels on-brand.
- **Passport cover** — Compass rose, spine accents, stats row, “Open Passport” CTA.
- **Bottom nav** — Gold pill highlight, blur, safe area; clear active state.
- **Grain** — Implemented via inline SVG noise in `globals.css` (no external image); respects `prefers-reduced-motion`.
- **Scrollbar** — Gold-dim thumb, transparent track; on-brand.
- **FAB (Chronicle)** — Gold, glow, Plus icon; clear primary action.

---

## 2. Empty states — illustrations wired

Prompts 8–11 in `entry_type_image_prompts.md` define assets for empty states. **UI is wired;** images appear when files are present and hide on load error (no broken icon).

| Location | Current | Improvement |
|--------|--------|-------------|
| **Chronicle** (`Chronicle.tsx`) | Text “The Chronicle awaits…” + button only | Add `public/empty-states/chronicle.webp` (or .png) above the text; ~240–320px wide, centered. |
| **Circle — Contacts** (`Circle.tsx`) | `Users` icon + “Your circle is empty” + button | Add `public/empty-states/circle.webp` above the text (optional per doc). |
| **Circle — On the Radar** | `Radar` icon + “No one on the radar yet” + button | Reuse circle illustration or keep icon; both are fine. |
| **Passport — StampGrid** (`StampGrid.tsx`) | “No stamps yet” / “No achievement stamps yet” text only | Add `public/empty-states/passport.webp` for stamps tab and `public/empty-states/passport-achievements.webp` for achievements tab; show above the empty text. |
| **Studio** | “The Studio is Ready” + short copy when no entries | No prompt exists; optional future illustration or leave as-is. |

**Implementation pattern:** For each empty state, add an `<img>` (or Next/Image if you add it) above the message, e.g. `src="/empty-states/chronicle.webp"`, `alt=""`, `className="w-64 max-w-[85%] h-auto"` (or similar), and ensure the container stays centered and responsive.

---

## 3. Textures — grain and guilloche

- **Grain** — Design system mentions `url('/grain.png')`; app uses **inline SVG noise** in `body::after`. No change required unless you prefer a raster grain asset (prompt 12). If you add `public/textures/grain.png`, you could switch `background-image` to that URL and keep the same animation/opacity.
- **Guilloche** — Design system says “passport pages and stamp backgrounds”. **Wired on Passport cover.** PassportCover has a tiled background layer `url('/textures/guilloche.webp')` at 6% opacity behind the passport body. Add `public/textures/guilloche.webp` to enable. Stamp cards / stamp detail could still use guilloche as border or corner ornament in a future pass.

---

## 4. Design system vs implementation

| Issue | Where | Recommendation |
|-------|--------|-----------------|
| **Body font name** | `globals.css`: `--font-body: 'Plus Jakarta Sans'` but file is `InstrumentSans-Variable.woff2` | Rename variable to `'Instrument Sans'` (or keep loading Instrument Sans and fix the comment/name) so it matches the design system and avoids confusion. |
| **Gathering colour** | `design_system.md` lists 6 entry types; `globals.css` has `--color-gathering` | Add `--color-gathering` to the design system doc (e.g. `#1a2a1a`). |
| **Borders** | Design system: `--border-gold` (gold-dim), hover `--color-gold-muted`. Many components use `border-white/6`, `border-gold/25` | Acceptable; white/6 reads as “subtle edge” and gold/20–30 on hover is consistent. Optional: introduce Tailwind theme tokens that map to `--color-gold-dim` / `--color-gold-muted` and use them for cards/topbar for a single source of truth. |
| **TopBar border** | `border-white/[0.04]` | Could switch to a gold-dim equivalent (e.g. `border-gold/10`) for brand consistency if you want the header to feel more “gold-tinted.” |

---

## 5. Small polish items

- **Landing — error message**  
  `Landing.tsx` uses inline `style={{ color: '#c0392b' }}` for the code error. Prefer `className="text-[--color-error]"` or a utility so it uses the design system `--color-error`.

- **FAB safe area**  
  Chronicle FAB uses `style={{ bottom: '90px' }}`. On devices with a home indicator, consider `bottom: calc(90px + env(safe-area-inset-bottom))` so the FAB doesn’t sit under the nav or indicator.

- **Favicon / apple-touch-icon**  
  `index.html` points to `/logo.png`. When you have a WebP or optimized PNG, you can keep `/logo.png` for compatibility or add a `<link rel="icon" type="image/webp" href="/logo.webp">` for supporting browsers to save a bit of payload.

- **Logo in app**  
  TopBar and Landing use `/logo.png`. Same as above: optional WebP with `<picture>` for modern browsers.

---

## 6. Consistency checks (no change required)

- **Cards** — EntryCard, Card (default/elevated/entry), PassportCover, StampCard, StoryCard use consistent slate + gold borders and hovers.
- **Tabs** — Passport, Circle use same pattern: uppercase, tracking, gold underline when active, border-white/5 for the bar.
- **Inputs** — Input, code input on Landing, form fields use slate background, white/10 border, gold focus ring.
- **Badge** — Entry type badges use ENTRY_TYPE_META and gold/30 border; consistent across feed and detail.
- **Entry hero** — Uses ENTRY_TYPE_IMAGES for fallback; gradient overlay and typography are consistent.

---

## 7. Suggested order of work (when quota allows)

1. **Generate and add empty-state images (8–11)** — Drop chronicle.webp, circle.webp, passport.webp, passport-achievements.webp into `public/empty-states/`; UI already wired (§2).
2. **Optional: grain/guilloche (12–13)** — Generate; add guilloche.webp to `public/textures/` to enable passport cover texture. Grain: only if replacing SVG noise (§3).
3. **Doc and token tweaks** — ~~Fix body font variable name, add `--color-gathering` to design system~~ **Done.** Optionally unify border tokens (§4).
4. **Quick polish** — ~~Landing error colour, FAB safe area, TopBar border~~ **Done.** Optional: WebP for logo/favicon (§5).

No need to change the overall visual direction; the audit is about filling gaps (empty states, textures) and aligning tokens/docs with what’s already implemented.
