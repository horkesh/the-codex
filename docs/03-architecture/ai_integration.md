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
Generates "The Lore" — a cinematic 2–4 paragraph narrative for an entry.

Input:
```json
{
  "entry_type": "mission",
  "title": "Budapest Protocol",
  "date": "2023-10-15",
  "location": "Budapest, Hungary",
  "description": "Four days in Budapest. Thermal baths, ruin bars, and a goulash incident.",
  "participants": ["Keys & Cocktails", "Beard & Bass", "Lorekeeper"],
  "metadata": { "duration_days": 4, "highlights": ["Thermal baths", "Ruin bars"] }
}
```

System prompt tone: The Lorekeeper's voice. Cinematic, dry wit, masculine warmth. Like a dispatch from a secret society's archivist. Never corny. Always specific.

Output:
```json
{
  "lore": "Budapest received them the way she receives all visitors who arrive with no agenda..."
}
```

#### `generate-wrapped`
Generates the Annual Wrapped narrative — intro, highlights, per-gent notes, closing line.

Input: Full year's entries + stats per gent.
Output: Structured copy for the Wrapped export template.

#### `generate-calling-card-bio`
A one-line bio for a Gent's calling card. Sharp, character-revealing.

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

#### `generate-achievement-stamp`
Special achievement stamps with unique visual identity. More ornate than mission stamps.

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
| Entry published | Claude: generate-lore | Immediately after creation |
| Mission published | Gemini: generate-stamp | For each city in the mission |
| Entry published | Gemini: generate-cover | If no user photo uploaded |
| Year-end Wrapped | Claude: generate-wrapped | Manual trigger in Ledger |
| First load of Calling Card | Gemini: generate-portrait | Once per Gent, cached |

## Cost estimate (3 users, light usage)

- Claude Opus: ~50 entries/year × ~500 tokens output = 25K tokens = ~$0.375/year
- Gemini images: ~50 stamps + 50 covers/year = 100 images = negligible
- Total AI cost: effectively free at this scale
