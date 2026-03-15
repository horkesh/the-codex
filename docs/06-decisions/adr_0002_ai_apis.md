# ADR 0002 — AI APIs: Claude for Text & Instagram, Gemini for Photos & Images

**Date**: 2026-03-13
**Updated**: 2026-03-15
**Status**: Accepted (updated)

## Decision

Use Anthropic Claude for narrative text and Instagram screenshot analysis. Use Google Gemini for photo/camera scan analysis and all image generation.

## Routing by feature

| Feature | Model | Endpoint |
|---|---|---|
| Lore, Wrapped, calling cards | `claude-sonnet-4-6` | Anthropic Messages API |
| Instagram screenshot scan | `claude-haiku-4-5-20251001` | Anthropic Messages API |
| Photo/camera POI scan | `gemini-2.0-flash` | Gemini generateContent |
| Portrait generation | `imagen-4.0-generate-001` | Imagen `:predict` endpoint |
| Entry cover / scene / stamp images | `imagen-4.0-generate-001` | Imagen `:predict` endpoint |

## Context

The app requires:
1. Narrative text (Lore, Wrapped, bios) — cinematic, personality-driven prose
2. Person analysis from Instagram screenshots — extract profile info + social intelligence
3. Person analysis from camera/photo — appearance scoring, vibe read, openers
4. Image generation — portraits, entry covers, passport stamps

## Why Claude for Instagram screenshots, not photos

Claude reliably extracts structured data (names, handles, traits) from Instagram screenshots and outputs clean JSON. However, Claude refuses prompts that ask it to **score a person's appearance** or **suggest openers for meeting someone**, describing them as "social/romantic evaluation framework that commodifies individuals." This refusal is prompt-level — the image content is irrelevant. Photo scan prompts by nature include scoring, so they cannot be routed through Claude.

## Why Gemini 2.0 Flash for photo scan, not 2.5 Flash

`gemini-2.5-flash` is a preview model that intermittently returns non-2xx HTTP errors at the Google API level. These errors escape our catch block and Supabase returns them as infrastructure-level failures. `gemini-2.0-flash` is GA, stable, and faster. Do not use `gemini-2.5-flash` in production.

## Why Imagen 4 for image generation

`imagen-4.0-generate-001` produces the best quality portrait and scene images. The previous model (`gemini-2.5-flash-image`) was a preview model that was deprecated. Imagen 4 uses the `:predict` endpoint (not `:generateContent`) with a different request format: `{ instances: [{ prompt }], parameters: { sampleCount, aspectRatio, safetyFilterLevel } }` and response in `predictions[0].bytesBase64Encoded`.

## Edge Function rules for Gemini calls

All `fetch()` calls to the Gemini API in Edge Functions must:
1. Use an `AbortController` with a 20-second timeout — Supabase free tier kills functions at ~25s at the infrastructure level
2. Return `status: 200` in all Response constructors, including catch blocks, so the Supabase JS SDK always sees the error in `data.error` not `error.message`

## Consequences

- Two API keys: `ANTHROPIC_API_KEY`, `GOOGLE_AI_API_KEY`
- Split routing logic in `scan-person-verdict` edge function by `source_type`
- Very low cost at 3-user scale (estimated < $5/year total)
