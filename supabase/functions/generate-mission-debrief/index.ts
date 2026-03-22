import { GENT_VISUAL_ID } from '../_shared/gent-identities.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry, photoUrls } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const participantNames =
      entry.participants?.map((p: { display_name: string }) => p.display_name).join(', ') || 'The Gents'
    const photos: string[] = Array.isArray(photoUrls) ? photoUrls.slice(0, 20) : []

    const city = entry.city || 'an undisclosed city'
    const country = entry.country || 'undisclosed'

    const lore = entry.lore || entry.description || ''

    function buildPrompt(withPhotos: boolean): string {
      const photoSection = withPhotos && photos.length > 0
        ? `You have been provided ${photos.length} photograph(s) from this mission. Study every photograph carefully. Identify locations, landmarks, restaurants, bars, activities, food, drinks, architecture, weather, time of day, mood. Identify each Gent present using the visual identification guide.`
        : `No photographs are available. Use the mission details, location, and lore to construct the debrief from context alone.${lore ? `\n\nLore: ${lore}` : ''}`

      const hasRetired = entry.participants?.some((p: { alias?: string }) => p.alias === 'operative')
      const retiredNote = hasRetired ? `\n\nNOTE: Operative Mirza is present on this mission. At the time of this operation he was still an active member of the unit — he would later be discharged. Write about him as a fully active operative. Do not reference his future departure. He was operational.` : ''

      return `You are writing a CLASSIFIED MISSION DEBRIEF for The Gents Chronicles — a private chronicle of The Gents.

These are from a mission (trip) to ${city}, ${country}.

Mission: ${entry.title}
Date: ${entry.date}
Present: ${participantNames}
${entry.location ? `Venue: ${entry.location}` : ''}${retiredNote}

${GENT_VISUAL_ID}

${photoSection}

IMPORTANT: NEVER describe the operatives' physical appearances — no bald heads, mustaches, beards, builds, hair. The visual guide is ONLY for identifying who is in photos. Write about what they DID, not what they look like.

Your task:
1. Write a 2-3 paragraph CLASSIFIED MISSION DEBRIEF in formal diplomatic language. Write as if you are an intelligence analyst filing a report. Use phrases like "Operatives deployed to...", "Surveillance confirmed...", "Field intelligence suggests...", "Subject was observed...". Reference specific details from the photos or lore.
2. List all identifiable landmarks, venues, and locations.
3. Extract 3-5 key highlights/moments from the mission.
4. Write a tongue-in-cheek 1-sentence risk assessment covering categories like: culinary exposure, nightlife threat level, budget impact, cultural enrichment.

Return in this exact format:
<debrief>The 2-3 paragraph classified narrative.</debrief>
<landmarks>Landmark 1, Landmark 2, Landmark 3</landmarks>
<highlights>First highlight|Second highlight|Third highlight</highlights>
<risk>The one-sentence risk assessment.</risk>`
    }

    // Build message content — images first, then the text prompt
    type ContentBlock =
      | { type: 'image'; source: { type: 'url'; url: string } }
      | { type: 'text'; text: string }

    async function callClaude(withPhotos: boolean): Promise<string> {
      const content: ContentBlock[] = []
      if (withPhotos && photos.length > 0) {
        for (const url of photos) {
          content.push({ type: 'image' as const, source: { type: 'url' as const, url } })
        }
      }
      content.push({ type: 'text', text: buildPrompt(withPhotos) })

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 55000)

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          messages: [{ role: 'user', content }],
        }),
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!response.ok) {
        const errBody = await response.text()
        throw new Error(`Claude API ${response.status}: ${errBody}`)
      }

      const result = await response.json()
      return result.content?.[0]?.text?.trim() ?? ''
    }

    // Try with photos first; if Claude can't fetch them (400), retry text-only
    let raw: string
    try {
      raw = await callClaude(photos.length > 0)
    } catch (e) {
      const msg = (e as Error).message
      if (photos.length > 0 && msg.includes('400')) {
        console.log('Photo URLs failed, retrying text-only')
        raw = await callClaude(false)
      } else {
        throw e
      }
    }

    // Parse structured response
    const debriefMatch = raw.match(/<debrief>([\s\S]*?)<\/debrief>/)
    const landmarksMatch = raw.match(/<landmarks>([\s\S]*?)<\/landmarks>/)
    const highlightsMatch = raw.match(/<highlights>([\s\S]*?)<\/highlights>/)
    const riskMatch = raw.match(/<risk>([\s\S]*?)<\/risk>/)

    const debrief = debriefMatch?.[1]?.trim() || raw.replace(/<[^>]+>/g, '').trim()
    const landmarks = landmarksMatch?.[1]?.trim().split(',').map((s: string) => s.trim()).filter(Boolean) || []
    const highlights = highlightsMatch?.[1]?.trim().split('|').map((s: string) => s.trim()).filter(Boolean) || []
    const risk_assessment = riskMatch?.[1]?.trim() || null

    return new Response(JSON.stringify({ debrief, landmarks, highlights, risk_assessment }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-mission-debrief error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
