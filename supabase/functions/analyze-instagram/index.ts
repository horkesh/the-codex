const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { url, mode, screenshot_base64, screenshot_mime_type } = await req.json()
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
            media_type: screenshot_mime_type || 'image/png',
            data: screenshot_base64,
          },
        },
        {
          type: 'text',
          text: 'Extract profile information from this Instagram profile screenshot. Return a single-line minified JSON object with no newlines inside string values. Fields: display_name, username, bio, apparent_location, post_count, follower_count, following_count, recent_post_themes (array of 3 short strings), vibe (2 sentences max), suggested_approach (1 sentence), notable_details (1 sentence). No markdown, no code fences, just the raw JSON.',
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
        max_tokens: 1024,
        messages: [{ role: 'user', content: messageContent }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    const rawText = result.content?.[0]?.text?.trim() ?? '{}'

    // Strip markdown code fences, then walk char-by-char to escape control chars in strings
    const stripped = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    let sanitized = ''
    let inString = false
    let escaped = false
    for (let i = 0; i < stripped.length; i++) {
      const ch = stripped[i]
      if (escaped) { sanitized += ch; escaped = false; continue }
      if (ch === '\\' && inString) { sanitized += ch; escaped = true; continue }
      if (ch === '"') { inString = !inString; sanitized += ch; continue }
      if (inString && ch === '\n') { sanitized += '\\n'; continue }
      if (inString && ch === '\r') continue
      if (inString && ch === '\t') { sanitized += '\\t'; continue }
      sanitized += ch
    }
    const extracted = JSON.parse(sanitized)

    return new Response(JSON.stringify(extracted), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('analyze-instagram error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
