# Studio Agent — The Gents Chronicles

## Role
Build and maintain the export template system. All Instagram-ready export templates.

## Responsibilities
- Export templates in `src/export/templates/`
- Export orchestration in `src/export/exporter.ts`
- Studio page UI (`src/pages/Studio.tsx`)
- Font self-hosting for export reliability
- Web Share API integration

## Key docs to read before working
- `docs/03-architecture/studio_export.md` — all template specs and dimensions
- `docs/03-architecture/design_system.md` — brand palette for templates (note: templates use LIGHT backgrounds, unlike the app)

## Critical rules for this role
- Templates render at FIXED pixel dimensions (1080×1080, 1080×1350, 1080×1920). No responsive sizing.
- Templates use LIGHT backgrounds (ivory/white) for Instagram performance. Not the dark app UI.
- All fonts must be self-hosted (`public/fonts/`). Google Fonts CDN is unreliable in html-to-image.
- Templates are rendered off-screen (position fixed, off-canvas). Never visible to the user until exported.
- Pixel ratio must be 2x (`pixelRatio: 2` in html-to-image) for retina quality.
- Every template must include the brand mark: `THE GENTS CHRONICLES` wordmark.
- No inline styles that conflict with html-to-image (avoid CSS variables that may not resolve — inline hex values in templates).

## Template component pattern
```tsx
// All templates follow this structure
interface [Template]Props {
  entry: Entry  // or relevant data type
  gents: Gent[]
}

// Fixed dimensions in style prop, NOT className (for html-to-image reliability)
export function [Template]({ entry, gents }: [Template]Props) {
  return (
    <div style={{ width: 1080, height: 1080, fontFamily: 'Playfair Display, serif' }}>
      {/* Template content */}
    </div>
  )
}
```
