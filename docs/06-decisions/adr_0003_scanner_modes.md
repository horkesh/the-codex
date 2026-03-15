# ADR 0003 — POI Scanner: Two Modes (Research vs Scan)

**Date**: 2026-03-15
**Status**: Accepted

## Decision

Split the POI scanner (`POIModal`) into two distinct modes with separate AI backends:

- **Research mode** — for Instagram intelligence (screenshot upload/paste + @handle lookup) → Claude Haiku
- **Scan mode** — for in-person / camera photo → Gemini 2.0 Flash

## Context

The original scanner had three tabs (Screenshot, Photo, Handle) all routing through the same Claude-based edge function. Claude refused photo analysis (see ADR 0002). Switching entirely to Gemini broke Instagram screenshot analysis quality (JSON reliability issues). The solution is a clean split at the UX level matching the underlying AI split.

## Research mode

- Screenshot drop zone: upload or paste (Ctrl+V) an Instagram profile screenshot
- Handle input: enter `@username` → fetches profile picture via `unavatar.io/instagram/{handle}?fallback=false` → runs same analysis pipeline
- Sends `source_type: 'instagram_screenshot'` → Claude Haiku in the edge function
- Extracts `display_name` and `instagram_handle` from the screenshot text

Limitation: handle lookup only works for public Instagram profiles (unavatar.io can only proxy public avatars).

## Scan mode

- Single drop zone: tap to open camera (mobile) or file picker (desktop); also accepts paste
- Sends `source_type: 'photo'` → Gemini 2.0 Flash in the edge function
- Does not extract display_name/instagram_handle (no text to read)

## Client-side image compression

Both modes compress images client-side before uploading:
- Max dimension: 1024px
- Format: JPEG at 0.82 quality
- Implementation: Canvas API in `compressImage()` in `src/hooks/useVerdictIntake.ts`
- Rationale: PNG screenshots can be 5–7MB base64 which exceeds Supabase Edge Function body limits. Compressed JPEG is ~100–300KB.

## Hook API

`useVerdictIntake` exports:
- `handleAnalyzeFile(file: File, sourceType: VerdictSourceType)` — explicit source type, no coupling to UI tab state
- `handleAnalyzeHandle(handle: string)` — always uses `instagram_screenshot`
- `mode` / `setMode` — `'research' | 'scan'` (replaces old `tab` / `setTab`)
