# ADR 0004: Mission Intelligence Pipeline

## Status
Accepted (2026-03-20)

## Context
Mission entries previously received the same treatment as other entry types — upload photos, get one paragraph of lore. For multi-day trips with 20+ photos, this was inadequate. The single paragraph couldn't capture the arc of a trip, individual venues, or the day-by-day progression.

## Decision
Mission entries now run a dedicated multi-stage intelligence pipeline:

1. **EXIF extraction**: GPS coordinates + timestamps extracted from every photo (not just the first)
2. **Scene clustering**: Photos grouped into "scenes" by temporal proximity (45min gap) + GPS distance (500m)
3. **AI photo analysis**: Gemini Flash vision analyzes each photo individually (venue, food, gents, ephemera, mood, quality)
4. **Narrative generation**: Claude Sonnet generates per-scene, per-day, and trip-level narratives using structured photo intelligence
5. **Intel assembly**: All data assembled into `MissionIntel` JSON stored in `entry.metadata.mission_intel`

### Why not extend the existing lore pipeline?
The existing `generate-lore` edge function sends 4-8 photos to Claude with a text prompt. For missions, we need:
- Per-photo analysis (not just a few representative photos)
- Structured intelligence (venue names, food items, GPS routes) — not just narrative
- Multi-level narrative (scene → day → trip) — not just one paragraph
- Cross-mission memory — referencing previous visits to the same city

### Why Gemini for photo analysis?
Claude refuses appearance-related scoring and categorization. Gemini Flash handles per-photo structured JSON extraction reliably and is faster for batch vision tasks.

### Why store in entry.metadata instead of a separate table?
- Single source of truth — no sync issues between entry and intel
- Works with existing entry CRUD — no new table, no new RLS policies
- JSON structure can evolve without migrations (versioned via `version` field)
- The Story table (`stories`) is kept for backward compatibility and manual story arcs, but auto-creation is deprecated for missions

## Consequences
- Mission entry creation takes longer (30-60s vs instant) — mitigated by progress overlay
- More API calls per mission (Gemini + Claude) — cost is acceptable for 3 users
- `entry.metadata` gets large for missions with many photos — JSONB handles this fine
- Non-mission entry types are completely unchanged
