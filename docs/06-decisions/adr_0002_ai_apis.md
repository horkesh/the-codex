# ADR 0002 — AI APIs: Claude for Text, Gemini for Images

**Date**: 2026-03-13
**Status**: Accepted

## Decision

Use Anthropic Claude (claude-opus-4-6) for all text generation. Use Google Gemini (gemini-2.5-flash-preview-image-generation) for all image generation. Both proxied through Supabase Edge Functions.

## Context

The app requires:
1. Narrative text ("The Lore") — cinematic, personality-driven prose
2. Annual Wrapped copy — reflective, warm, specific
3. Calling card bios — sharp, one-line character summaries
4. Passport stamp images — circular, official, guilloche-style
5. Entry cover images — atmospheric, stylized
6. Portrait illustrations — character art per Gent

The user has active API subscriptions to Anthropic, Google Gemini, and OpenAI.

## Considered alternatives

**GPT-4 for text**:
- Competent at narrative writing
- Weaker than Claude at maintaining a consistent voice/persona
- The Lore and Wrapped require a specific "Lorekeeper" character voice — Claude handles persona-based writing better
- Verdict: Claude is the right choice for this specific use case

**Claude for images (claude-sonnet-4-5 multimodal)**:
- Claude can describe images but cannot generate them
- Not applicable

**DALL-E for images**:
- Works well
- The Grand Tour and The Toast already use Gemini for image generation
- Changing would require learning a new integration
- Verdict: Keep Gemini — proven, working, no reason to switch

**Single API for everything**:
- Would simplify the integration
- No single API does both text (personality-driven narrative) and image generation at the quality needed
- The hybrid approach uses each model at its strength

## Consequences

- Two API keys to manage (ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY)
- Two Edge Function patterns (one for each API)
- Best output quality for each task type
- Very low cost at 3-user scale (estimated < $5/year total)
- Consistent with existing project patterns (Gemini already in The Toast and Grand Tour)
