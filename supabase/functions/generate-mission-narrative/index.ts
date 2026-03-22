import { GENT_VISUAL_ID, GENT_ALIASES } from "../_shared/gent-identities.ts"

const ANTHROPIC_KEY = Deno.env.get("ANTHROPIC_API_KEY") ?? ""

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

interface SceneInput {
  id: string
  title: string | null
  startTime: string | null
  endTime: string | null
  mood: string | null
  photoDescriptions: string[]
  foodDrinks: string[]
  gentsPresent: string[]
  ephemeraTexts: string[]
  venueHint: string | null
}

interface DayInput {
  label: string
  scenes: SceneInput[]
  stats: {
    photoCount: number
    sceneCount: number
    venues: string[]
    earliestPhoto: string | null
    latestPhoto: string | null
  }
}

// deno-lint-ignore no-explicit-any
type PhotoAnalysis = any

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })

  try {
    const body = await req.json()

    // Single-scene regeneration mode
    if (body.mode === "single_scene") {
      return handleSingleScene(body)
    }

    // Full mission narrative mode
    return handleFullMission(body)
  } catch (err) {
    console.error("generate-mission-narrative error:", err)
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }
})

async function handleSingleScene(body: {
  entry: { city: string; country: string }
  scene: { id: string; title: string | null; startTime: string | null; endTime: string | null; photoIds: string[] }
  photoUrls: Record<string, string>
  analyses: Record<string, PhotoAnalysis>
  directorNote: string | null
  crossContext: string | null
}): Promise<Response> {
  const { entry, scene, photoUrls, analyses, directorNote, crossContext } = body
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000)

  try {
    const sceneAnalyses = (scene.photoIds ?? [])
      .map((id: string) => analyses?.[id])
      .filter(Boolean)

    const scenePhotos = (scene.photoIds ?? [])
      .map((id: string) => photoUrls?.[id])
      .filter(Boolean)

    const prompt = `You are the chronicler of The Gents. Rewrite the narrative for this specific scene from their mission.

Scene: ${scene.title ?? "Untitled scene"}
Time: ${scene.startTime ?? "unknown"} — ${scene.endTime ?? "unknown"}
Location: ${entry.city}, ${entry.country}
${sceneAnalyses.length > 0 ? `\nPhoto intelligence:\n${sceneAnalyses.map((a: PhotoAnalysis) => `- ${a.description}${a.venue_name ? ` (${a.venue_name})` : ""}${a.food_drinks?.length ? ` [${a.food_drinks.join(", ")}]` : ""}`).join("\n")}` : ""}
${directorNote ? `\nDirector's Note (IMPORTANT — incorporate this context naturally): ${directorNote}` : ""}
${crossContext ? `\nPrevious visits: ${crossContext}` : ""}

Write 2-3 sentences capturing the essence of this moment. First person plural ("We", "The Gents"). No emojis.

<scene_narrative>Your narrative here.</scene_narrative>`

    // deno-lint-ignore no-explicit-any
    const content: any[] = [
      ...scenePhotos.slice(0, 4).map((url: string) => ({ type: "image", source: { type: "url", url } })),
      { type: "text", text: prompt },
    ]

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 200,
        messages: [{ role: "user", content }],
      }),
      signal: controller.signal,
    })

    const result = await res.json()
    const raw = result.content?.[0]?.text?.trim() ?? ""
    const match = raw.match(/<scene_narrative>([\s\S]*?)<\/scene_narrative>/)
    const narrative = match?.[1]?.trim() ?? raw.replace(/<[^>]+>/g, "").trim()

    return new Response(JSON.stringify({ narrative }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } finally {
    clearTimeout(timeout)
  }
}

async function handleFullMission(body: {
  title: string
  city: string
  country: string
  participants: string[]
  days: DayInput[]
  crossMissionContext: string | null
  weatherSummary: string | null
  moodTags: string[]
  directorNotes: string | null
  soundtrackMood: string | null
  photoUrls: string[]
}): Promise<Response> {
  const {
    title, city, country, participants, days,
    crossMissionContext, weatherSummary, moodTags,
    directorNotes, soundtrackMood, photoUrls,
  } = body

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 120000) // 2 min for Pro plan

  try {
    // Build the rich prompt with all intelligence data
    const scenesSummary = days.map(day => {
      const scenesText = day.scenes.map(s => {
        const parts = [`- ${s.title ?? "Unknown Scene"}`]
        if (s.startTime) parts.push(`(${s.startTime}${s.endTime ? "–" + s.endTime : ""})`)
        if (s.gentsPresent.length) parts.push(`[${s.gentsPresent.join(", ")}]`)
        if (s.foodDrinks.length) parts.push(`Food/drinks: ${s.foodDrinks.join(", ")}`)
        if (s.photoDescriptions.length) parts.push(`Photos show: ${s.photoDescriptions.join("; ")}`)
        if (s.ephemeraTexts.length) parts.push(`Text found: ${s.ephemeraTexts.join("; ")}`)
        return parts.join(" ")
      }).join("\n")
      return `### ${day.label} (${day.stats.photoCount} photos, ${day.stats.sceneCount} scenes)\nVenues: ${day.stats.venues.join(", ") || "Unknown"}\nActive: ${day.stats.earliestPhoto ?? "?"} – ${day.stats.latestPhoto ?? "?"}\n${scenesText}`
    }).join("\n\n")

    // Soundtrack-aware prose directives
    const soundtrackDirectives: Record<string, string> = {
      jazz: "Let the prose swing — syncopated rhythms, smoky imagery, notes that linger.",
      electronic: "The prose pulses — kinetic, precise, propulsive. Short sentences that build.",
      acoustic: "Write with warmth and intimacy. Unhurried, resonant, close-up details.",
      rock: "Raw energy. Bold declarations, vivid physical details, volume.",
      ambient: "The prose drifts — atmospheric, textured, contemplative.",
      hiphop: "Rhythmic, confident prose with internal cadence. Bold metaphors, swagger.",
      classical: "Structured, elevated prose with measured pacing. Rich vocabulary.",
    }
    const soundtrackDirective = soundtrackMood ? soundtrackDirectives[soundtrackMood] ?? "" : ""

    const hasRetiredOperative = participants.some(p => p.toLowerCase() === 'mirza')
    const gentCount = participants.length === 4 ? 'four' : participants.length === 3 ? 'three' : String(participants.length)
    const retiredDirective = hasRetiredOperative
      ? `\nRETIRED OPERATIVE: Mirza ("Retired Operative") is present in this mission. He is a former member of The Gents who has since retired from active duty. Write about him with warmth and a hint of nostalgia — acknowledge his presence as special, like a returning legend. A subtle nod is more powerful than a eulogy. He was there. That is what matters.`
      : ""

    const systemPrompt = `You are the Lorekeeper of The Gents Chronicles — a private lifestyle chronicle of ${gentCount} gentlemen (${participants.join(", ")}). You write in the voice of an intimate, literary narrator who was at every scene.

${GENT_VISUAL_ID}

Gent aliases: ${Object.entries(GENT_ALIASES).map(([k, v]) => `${k} = "${v}"`).join(", ")}

RULES:
- Use first names naturally. Reference specific venues, food, drinks, moments from scene data.
- Never fabricate details not supported by the intelligence data.
- Match mood of each scene. A chaotic bar scene gets different energy than a contemplative morning walk.
- Avoid generic filler. Every sentence must earn its place with a specific detail, name, or observation.
- No emojis. Ever.
${retiredDirective}
${directorNotes ? `\nDIRECTOR'S NOTES: ${directorNotes}` : ""}
${crossMissionContext ? `\nCROSS-MISSION CONTEXT (reference previous visits naturally):\n${crossMissionContext}` : ""}
${weatherSummary ? `\nWEATHER: ${weatherSummary}` : ""}
${moodTags?.length ? `\nMOOD TAGS (embody these, don't name them): ${moodTags.join(", ")}` : ""}
${soundtrackDirective ? `\nNARRATIVE VOICE: ${soundtrackDirective}` : ""}`

    const userPrompt = `Generate the complete narrative for this mission to ${city}, ${country}: "${title}"

INTELLIGENCE DATA:
${scenesSummary}

Return your response in this exact XML format:

${days.map(day => day.scenes.map(s =>
  `<scene id="${s.id}">1-2 sentences narrating this specific scene</scene>`
).join("\n")).join("\n")}

${days.map((day, i) =>
  `<day${i + 1}_briefing>One-line morning mood-setter for ${day.label}.</day${i + 1}_briefing>
<day${i + 1}>2-4 sentences narrating the full day as a chapter.</day${i + 1}>
<day${i + 1}_debrief>One-line evening wrap-up. Tone: reflective, wry.</day${i + 1}_debrief>`
).join("\n")}

<arc>3-4 paragraphs telling the story of the entire trip.</arc>

<oneliner>One punchy sentence distilling the entire mission.</oneliner>

<title1>Suggested title option 1 (3-7 words)</title1>
<title2>Suggested title option 2 (3-7 words)</title2>
<title3>Suggested title option 3 (3-7 words)</title3>

<verdict_best_meal>Best meal of the trip: name and one-sentence reason</verdict_best_meal>
<verdict_best_venue>Best venue: name and one-sentence reason</verdict_best_venue>
<verdict_chaos>Most chaotic moment: one sentence</verdict_chaos>
<verdict_mvp_scene>MVP scene ID and one-sentence reason</verdict_mvp_scene>
<verdict_return>Would The Gents return? Yes/No and reason (tongue-in-cheek)</verdict_return>`

    // Build message content with photos for vision
    // deno-lint-ignore no-explicit-any
    const content: any[] = []
    for (const url of photoUrls.slice(0, 8)) {
      content.push({ type: "image", source: { type: "url", url } })
    }
    content.push({ type: "text", text: userPrompt })

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content }],
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const err = await res.text()
      return new Response(JSON.stringify({ error: `Claude API error: ${err}` }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      })
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ""

    // Parse all XML sections
    const extract = (tag: string) => {
      const m = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`))
      return m?.[1]?.trim() ?? null
    }

    // Scene narratives
    const sceneNarratives: Record<string, string> = {}
    for (const day of days) {
      for (const scene of day.scenes) {
        const narrative = extract(`scene id="${scene.id}"`)
        if (narrative) sceneNarratives[scene.id] = narrative
      }
    }

    // Day chapters
    const dayChapters = days.map((_, i) => ({
      briefing: extract(`day${i + 1}_briefing`),
      narrative: extract(`day${i + 1}`),
      debrief: extract(`day${i + 1}_debrief`),
    }))

    // Overall
    const arc = extract("arc")
    const oneliner = extract("oneliner")
    const titles = [extract("title1"), extract("title2"), extract("title3")].filter(Boolean)

    // Verdict
    const verdict = {
      bestMeal: extract("verdict_best_meal"),
      bestVenue: extract("verdict_best_venue"),
      chaos: extract("verdict_chaos"),
      mvpScene: extract("verdict_mvp_scene"),
      wouldReturn: extract("verdict_return"),
    }

    return new Response(JSON.stringify({
      sceneNarratives,
      dayChapters,
      arc,
      oneliner,
      titles,
      verdict,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  } finally {
    clearTimeout(timeout)
  }
}
