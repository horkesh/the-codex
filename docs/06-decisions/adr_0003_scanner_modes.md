# ADR 0003 — POI Scanner: Two Modes (Research vs Scan)

**Date**: 2026-03-15
**Status**: Accepted
**Updated**: 2026-03-23

## Decision

Split the POI scanner (`POIModal`) into two distinct modes with a **single AI backend** (Gemini 2.5 Flash) and separate prompts:

- **Research mode** — for Instagram intelligence (screenshot upload/paste) → Gemini 2.5 Flash with Instagram-aware prompt
- **Scan mode** — for in-person / camera photo → Gemini 2.5 Flash with standard prompt

### 2026-03-23 Update: Unified on Gemini

Originally, Research mode used Claude Haiku and Scan mode used Gemini. Claude was switched out because:
1. Claude scored Instagram screenshots significantly lower than Gemini scored direct photos of the same person
2. Screenshots often contain full-size photos (posts, stories), not just tiny profile pic thumbnails — Claude was penalizing for the Instagram UI chrome around the image
3. Gemini handles appearance scoring without refusals (see ADR 0002)

Both modes now call a shared `callGemini()` function in the edge function, with `source_type` selecting the prompt variant.

## Research mode

- Screenshot drop zone: upload or paste (Ctrl+V) an Instagram profile screenshot
- Sends `source_type: 'instagram_screenshot'` → Gemini with Instagram-aware prompt
- Extracts `display_name` and `instagram_handle` from visible text (null for non-profile screenshots)
- Handles posts, stories, profiles, and DM photos — focuses on the main visible person

Handle lookup was removed (unavatar.io Instagram provider is dead).

## Scan mode

- Single drop zone: tap to open camera (mobile) or file picker (desktop); also accepts paste
- Sends `source_type: 'photo'` → Gemini with standard prompt
- Does not extract display_name/instagram_handle (no text to read)

## Client-side image compression

Both modes compress images client-side before uploading:
- Max dimension: 1024px
- Format: WebP at 0.82 quality (JPEG fallback on Safari/iOS where WebP encoding is unsupported)
- Implementation: `imageToBase64WithMime()` in `src/lib/image.ts` — returns both base64 and the actual MIME type
- The real MIME type is sent to the edge function (not hardcoded) — fixes mobile Safari errors where `canvas.toBlob('image/webp')` silently produces PNG
- Rationale: PNG screenshots can be 5–7MB base64 which exceeds Supabase Edge Function body limits. Compressed output is ~100–300KB.

## Hook API

`useVerdictIntake` exports:
- `handleAnalyzeFile(file: File, sourceType: VerdictSourceType)` — explicit source type, no coupling to UI tab state
- `mode` / `setMode` — `'research' | 'scan'` (replaces old `tab` / `setTab`)
