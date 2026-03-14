const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { url, mode, screenshot_base64 } = await req.json()
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    let messageContent: unknown[]

    if (mode === 'screenshot') {
      if (!screenshot_base64) throw new Error('screenshot_base64 required for screenshot mode')
      messageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/jpeg',
            data: screenshot_base64,
          },
        },
        {
          type: 'text',
          text: 'Extract profile information from this Instagram profile screenshot. Return JSON with: display_name, username, bio, apparent_location, post_count, follower_count, following_count, recent_post_themes (array of 3 strings), vibe (one paragraph), suggested_approach (one sentence), notable_details.',
        },
      ]
    } else {
      if (!url) throw new Error('url required for event/profile mode')

      // Fetch page HTML
      const html = await fetch(url).then(r => r.text())

      // Extract OG meta tags
      const ogTags: Record<string, string> = {}
      const ogRegex = /<meta[^>]+property="og:([^"]+)"[^>]+content="([^"]+)"/gi
      let match
      while ((match = ogRegex.exec(html)) !== null) {
        ogTags[match[1]] = match[2]
      }

      // Also try alternate attribute order
      const ogRegex2 = /<meta[^>]+content="([^"]+)"[^>]+property="og:([^"]+)"/gi
      while ((match = ogRegex2.exec(html)) !== null) {
        ogTags[match[2]] = match[1]
      }

      // Extract JSON-LD
      const jsonLdMatches: string[] = []
      const jsonLdRegex = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
      while ((match = jsonLdRegex.exec(html)) !== null) {
        jsonLdMatches.push(match[1].trim())
      }

      const extractedText = [
        `OG Title: ${ogTags['title'] || 'N/A'}`,
        `OG Description: ${ogTags['description'] || 'N/A'}`,
        `OG Image: ${ogTags['image'] || 'N/A'}`,
        jsonLdMatches.length > 0 ? `JSON-LD: ${jsonLdMatches.slice(0, 2).join('\n')}` : '',
      ]
        .filter(Boolean)
        .join('\n')

      if (mode === 'event') {
        messageContent = [
          {
            type: 'text',
            text: `Extract event information from this Instagram page data. Return JSON only with these fields: venue_name, location, city, country, event_date (ISO string or null), estimated_price (string or null), dress_code (string or null), vibe (one sentence), confidence (number 0-1).

Page data:
${extractedText}`,
          },
        ]
      } else {
        // profile mode
        messageContent = [
          {
            type: 'text',
            text: `Extract profile information from this Instagram page data. Return JSON only with these fields: display_name, username, bio, apparent_location, apparent_interests (array of strings), vibe (one paragraph), suggested_approach (one sentence), notable_details.

Page data:
${extractedText}`,
          },
        ]
      }
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const rawText = result.content?.[0]?.text?.trim() ?? '{}'

    // Parse JSON from Claude's response — strip markdown code fences if present
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')
    const extracted = JSON.parse(jsonText)

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('analyze-instagram error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
