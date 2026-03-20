import { GENT_VISUAL_ID } from "../_shared/gent-identities.ts"

const GOOGLE_AI_KEY = Deno.env.get("GOOGLE_AI_API_KEY") ?? ""

interface PhotoInput {
  id: string
  url: string
  gps_lat?: number | null
  gps_lng?: number | null
  venue_hint?: string | null
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const { photos, entry_type, city, country } = await req.json() as {
      photos: PhotoInput[]
      entry_type: string
      city: string
      country: string
    }

    if (!photos?.length) {
      return new Response(JSON.stringify({ error: "No photos provided" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    // Process photos in batches of 4 (Gemini handles multiple images well)
    const BATCH_SIZE = 4
    const results: Record<string, unknown> = {}

    for (let i = 0; i < photos.length; i += BATCH_SIZE) {
      const batch = photos.slice(i, i + BATCH_SIZE)
      const batchResults = await analyzeBatch(batch, entry_type, city, country)
      Object.assign(results, batchResults)
    }

    return new Response(JSON.stringify({ analyses: results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error("analyze-mission-photos error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

async function analyzeBatch(
  photos: PhotoInput[],
  entryType: string,
  city: string,
  country: string,
): Promise<Record<string, unknown>> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25000)

  try {
    // Build multimodal content: images + analysis prompt
    const parts: unknown[] = []

    for (const photo of photos) {
      // Fetch image and convert to base64
      const imgRes = await fetch(photo.url, { signal: controller.signal })
      if (!imgRes.ok) continue
      const imgBuf = await imgRes.arrayBuffer()
      // Chunk-based base64 encoding to avoid call-stack overflow on large images
      const bytes = new Uint8Array(imgBuf)
      let binary = ''
      for (let i = 0; i < bytes.length; i += 8192) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 8192))
      }
      const base64 = btoa(binary)
      const mimeType = imgRes.headers.get("content-type") || "image/webp"

      parts.push({
        inlineData: { mimeType, data: base64 },
      })
      parts.push({
        text: `[Photo ID: ${photo.id}]${photo.venue_hint ? ` [Nearby: ${photo.venue_hint}]` : ""}${photo.gps_lat ? ` [GPS: ${photo.gps_lat},${photo.gps_lng}]` : ""}`,
      })
    }

    parts.push({
      text: `You are analyzing photos from a trip to ${city}, ${country} (entry type: ${entryType}).

${GENT_VISUAL_ID}

For EACH photo (identified by its [Photo ID]), return a JSON object with these fields:
- scene_type: one of "restaurant", "bar", "street", "landmark", "transport", "hotel", "market", "nature", "interior", "group_shot", "food", "selfie", "other"
- venue_name: name of venue/place if visible from signage, menus, or context (null if unknown). Use the [Nearby] hint if it matches what you see.
- description: one sentence describing what's happening in the photo
- gents_present: array of first names of identified Gents (from the visual guide above). Empty array if none visible.
- food_drinks: array of specific items visible (e.g. "wagyu tataki", "gin & tonic", "Turkish coffee"). Empty array if none.
- ephemera: array of objects {type, text, context} for any readable text — menus, signs, tickets, receipts, boarding passes, labels. type is one of "menu", "sign", "ticket", "receipt", "boarding_pass", "label", "other".
- mood: one of "energetic", "relaxed", "chaotic", "intimate", "adventurous", "festive", "contemplative"
- time_of_day_visual: one of "morning", "afternoon", "golden_hour", "evening", "night" — inferred from lighting
- quality_score: 1-10 rating of photographic quality and narrative interest
- highlight_reason: if quality_score >= 8, explain why this is a standout photo (null otherwise)
- unnamed_characters: array of objects {description, role, approximate_age, distinguishing} for any non-Gent people visible who play a role in the scene (serving, talking, etc). Skip crowds/passersby. Empty array if none.

Return ONLY a JSON object where keys are Photo IDs and values are the analysis objects. No markdown, no explanation.`,
    })

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_KEY}`

    const res = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error("Gemini error:", err)
      return {}
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ""

    // Extract JSON from response (may be wrapped in ```json ... ```)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return {}

    return JSON.parse(jsonMatch[0])
  } catch (err) {
    console.error("Batch analysis error:", err)
    return {}
  } finally {
    clearTimeout(timeout)
  }
}
