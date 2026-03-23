# AI Integration — The Gents Chronicles

Two models. Two jobs. Both proxied through Supabase Edge Functions.

---

## Principle

API keys never touch the client. All AI calls go:

```
Client (src/ai/*.ts)
  → POST to Supabase Edge Function URL
  → Edge Function calls Claude or Gemini API
  → Returns result to client
```

The client only knows the Edge Function URL and the Supabase anon key (already public). The AI API keys live exclusively in Supabase Edge Function secrets.

---

## Claude — Text & Narrative

Model: `claude-opus-4-6` (use opus for quality; these are infrequent calls for 3 users)
Fallback: `claude-sonnet-4-6` (faster, cheaper if needed)

### Edge Functions using Claude

#### `generate-lore`
Generates "The Lore" — narrative prose for an entry. Default: 2-3 sentences. Full Chronicle mode: 4-6 dense, meaningful sentences.

Input: Full entry object with participants, photoUrls array, and metadata (including `mood_tags`, `full_chronicle`, `lore_hints`, `time_of_day`).

**Prompt enrichment pipeline:**
1. **Time context** — EXIF time → 12h display + period (morning/evening/night) + situational hint (weekday lunch window, weekend afternoon, etc.)
2. **Type directive** — entry-type-specific narrative focus (food for Table, competition for Pitch, etc.)
3. **Mood tags** — from `metadata.mood_tags` array; Claude embodies the mood without naming it
4. **Weather** — auto-fetched from Open-Meteo archive API (geocode city → lat/lng → daily weather). Non-critical, 5s timeout per call, silently skipped on failure. Returns e.g. "overcast, 8-14°C"
5. **Director's Notes** — combined from all gents' per-gent hints (`lore_hints_{gentId}`) + legacy `lore_hints`
6. **Gent visual ID** — physical descriptions for photo identification (only when photos present)
7. **Photos** — sent as URLs before the text prompt; Claude uses vision to observe atmosphere and identify gents

**Full Chronicle mode** (`metadata.full_chronicle`): 4-6 sentences, every sentence must earn its place with a specific detail, name, sensory moment, or observation. Not longer for length's sake. `max_tokens`: 600 (vs 400 default).

Output:
```json
{
  "lore": "Budapest received them the way she receives all visitors who arrive with no agenda...",
  "oneliner": "Three men, one thermal bath, and a goulash incident that may never be spoken of again.",
  "suggested_title": "The Budapest Protocol"
}
```

#### `generate-wrapped`
Generates the Annual Wrapped narrative — intro, highlights, per-gent notes, closing line.

Input: Full year's entries + stats per gent.
Output: Structured copy for the Wrapped export template.

#### `generate-calling-card-bio`
A one-line bio for a Gent's calling card. Sharp, character-revealing.

#### `generate-mission-narrative`
Generates multi-level mission narratives from structured photo intelligence. Uses `claude-sonnet-4-6`.

Two modes:

**Full mission mode** — called after photo analysis is complete:

Input:
```json
{
  "entry_id": "uuid",
  "scenes": [...],
  "trip_context": { "city": "Budapest", "days": 4, "gents": ["keys", "bass", "lorekeeper"] },
  "cross_mission_context": "Last time in Budapest (2024): stayed at...",
  "soundtrack": "jazz"
}
```

Output:
```json
{
  "scene_narratives": { "scene_id": "1-2 sentence narrative" },
  "day_chapters": [{ "day": 1, "briefing": "...", "narrative": "...", "debrief": "..." }],
  "trip_arc": "3-4 paragraph overall narrative",
  "oneliner": "One sentence distillation",
  "title_suggestions": ["The Budapest Protocol", "Two Days in Thermal Country", "..."],
  "verdict": {
    "best_meal": "Goulash at Borkonyha",
    "best_venue": "360 Rooftop Bar",
    "most_chaotic": "...",
    "mvp_scene": "scene_id",
    "would_return": true
  }
}
```

**Single scene mode** (Director's Cut) — regenerates one scene incorporating a director's note:

Input:
```json
{
  "scene": { ... },
  "director_note": "Focus on the rain — we got completely soaked",
  "entry_context": { ... }
}
```

Output: `{ "narrative": "Updated scene narrative" }`

Soundtrack directive shapes prose: `jazz` → smoky, deliberate; `electronic` → kinetic, fragmented; `acoustic` → intimate, unhurried; etc.

---

## Gemini — Image Generation

Model: `gemini-2.5-flash-preview-image-generation`
Pattern: Established in The Toast and Grand Tour — same integration.

### Edge Functions using Gemini

#### `generate-stamp`
Creates a passport stamp image for a city/country.

Prompt template:
```
A circular passport stamp for [CITY], [COUNTRY].
Official government stamp aesthetic. Guilloche border pattern.
Gold ink on cream paper.
Include: city name, country name, [YEAR].
Style: aged, authoritative, elegant.
No modern digital feel. Like a 1960s diplomatic passport.
```

Output: Base64 image → stored in Supabase Storage `stamps/` bucket → URL returned.

#### `generate-cover`
Entry cover image. Style depends on entry type.

Mission: Cinematic landscape/cityscape of the destination. No people. Golden hour light.
Night Out: Dark interior, candlelight, sophisticated. No faces.
Steak: Close-up of perfectly cooked steak, restaurant setting. Cinematic lighting.
PlayStation: Abstract neon geometry. Game-inspired. No logos.

#### `generate-portrait`
Each Gent's portrait for their calling card. Stylized, not photorealistic. Oil painting or graphic novel aesthetic. No actual photo of real person — generated character portrait matching their persona.

#### `analyze-mission-photos`
Gemini 2.5 Flash vision analysis of mission photos. Processes in batches of 4. Returns structured per-photo intelligence.

Input:
```json
{
  "photos": [
    { "url": "https://storage.url/...", "photo_id": "uuid", "taken_at": "2026-03-05T14:32:00Z", "gps_lat": 47.4979, "gps_lng": 19.0402 }
  ],
  "gent_identities": "Keys & Cocktails: tall, dark curly hair...",
  "entry_context": { "city": "Budapest", "country": "Hungary" }
}
```

Output (per photo):
```json
{
  "photo_id": "uuid",
  "scene_type": "restaurant | bar | outdoor | transport | hotel | landmark | street",
  "venue_name": "Borkonyha Wineyard Restaurant",
  "description": "Three men seated at a white-tablecloth restaurant...",
  "gents_present": ["keys", "bass"],
  "food_drinks": ["goulash", "red wine", "bread basket"],
  "ephemera": ["Menu text: 'Borkonyha...'", "Sign: 'Open 12-22'"],
  "mood": "relaxed | celebratory | intense | candid | adventurous",
  "time_of_day_visual": "afternoon",
  "quality_score": 8.2,
  "highlight_reason": "Great light, all three gents visible, landmark in background",
  "unnamed_characters": 2
}
```

#### `generate-achievement-stamp`
Special achievement stamps with unique visual identity. More ornate than mission stamps.

#### `scan-person-verdict`
Vision analysis of a photo or Instagram screenshot. Both modes use **Gemini 2.5 Flash** via a shared `callGemini()` helper, with separate prompts per `source_type`. Single prompt handles eligibility check + full verdict.

Input:
```json
{ "photo_base64": "...", "mime_type": "image/webp", "source_type": "photo" }
```

`source_type` values: `"photo"` (camera/gallery) or `"instagram_screenshot"` (profile/post/story screenshot — also extracts `display_name` and `instagram_handle`).

`mime_type` must match the actual image encoding. Client uses `imageToBase64WithMime()` which returns the real MIME type (WebP preferred, JPEG fallback on Safari/iOS).

Returns HTTP 422 if no person is identifiable (ineligible image). Otherwise returns:
```json
{
  "eligible": true,
  "appearance": "...",
  "trait_words": ["confident", "well-dressed"],
  "score": 8.5,
  "verdict_label": "Circle Material",
  "confidence": 0.85,
  "vibe": "...",
  "style_read": "...",
  "why_interesting": "...",
  "best_opener": "...",
  "green_flags": ["..."],
  "watchouts": ["..."]
}
```

Score thresholds: ≥ 9.0 → `Immediate Interest`; 8.0–8.9 → `Circle Material`; 6.5–7.9 → `On the Radar`; < 6.5 → `Observe Further`. Score ≥ 8.0 routes to `contact`; < 8.0 routes to `person_of_interest`.

#### `generate-person-portrait`
AI portrait for a person in The Circle. Same prompt protocol as `generate-portrait` (Gent portraits).

Input:
```json
{ "appearance": "...", "traits": ["confident", "well-dressed"], "scan_id": "uuid" }
```

Output: Portrait uploaded to `portraits/scans/{scan_id}/portrait-{ts}.png` → URL returned.
```json
{ "portrait_url": "https://storage.url/portraits/scans/..." }
```

---

## Calling flow (client-side)

```typescript
// src/ai/lore.ts
export async function generateLore(entry: Entry): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-lore', {
    body: {
      entry_type: entry.type,
      title: entry.title,
      date: entry.date,
      location: entry.location,
      description: entry.description,
      participants: entry.participants.map(p => p.full_alias),
      metadata: entry.metadata,
    },
  })
  if (error) throw error
  return data.lore
}
```

```typescript
// src/ai/stamp.ts
export async function generateStampImage(city: string, country: string, year: number): Promise<string> {
  const { data, error } = await supabase.functions.invoke('generate-stamp', {
    body: { city, country, year },
  })
  if (error) throw error
  return data.image_url  // Supabase Storage URL
}
```

---

## Edge Function pattern (Deno)

```typescript
// supabase/functions/generate-lore/index.ts
import { serve } from 'https://deno.land/std/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

serve(async (req) => {
  const { entry_type, title, date, location, description, participants, metadata } = await req.json()

  const message = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 1024,
    system: `You are the Lorekeeper — archivist of The Gents Chronicles.
You write cinematic, dry-wit narratives of the Gents' experiences.
Voice: authoritative, masculine warmth, specific details over generalities.
Never cliché. Always specific. 2-4 paragraphs.`,
    messages: [{
      role: 'user',
      content: `Write the Lore for this entry:
Type: ${entry_type}
Title: ${title}
Date: ${date}
Location: ${location}
Description: ${description}
Participants: ${participants.join(', ')}
Additional context: ${JSON.stringify(metadata)}`
    }]
  })

  return new Response(
    JSON.stringify({ lore: message.content[0].text }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
```

---

## When AI is called

| Action | AI triggered | When |
|---|---|---|
| Mission photos uploaded | Gemini: analyze-mission-photos | Staged pipeline; batches of 4 photos |
| Mission photos uploaded | Claude: generate-mission-narrative | After photo analysis completes |
| Non-mission entry published | Claude: generate-lore | Immediately after creation |
| Mission published | Gemini: generate-stamp | For each city in the mission |
| Entry published | Gemini: generate-cover | If no user photo uploaded |
| Year-end Wrapped | Claude: generate-wrapped | Manual trigger in Ledger |
| First load of Calling Card | Gemini: generate-portrait | Once per Gent, cached |
| Verdict intake — photo uploaded | Gemini: scan-person-verdict (photo) | Blocks review step; 422 = ineligible |
| Verdict intake — Instagram screenshot | Gemini: scan-person-verdict (instagram_screenshot) | Blocks review step; extracts handle/name |
| Verdict intake — scan created | Gemini: generate-person-portrait | Non-blocking background; shimmer in review |
| Scene Director's Cut | Claude: generate-mission-narrative (single scene) | On director's note submit in SceneEditor |

## Cost estimate (3 users, light usage)

- Claude Opus: ~50 entries/year × ~500 tokens output = 25K tokens = ~$0.375/year
- Gemini images: ~50 stamps + 50 covers/year = 100 images = negligible
- Total AI cost: effectively free at this scale
