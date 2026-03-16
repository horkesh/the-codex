const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Landmark hints for known cities — Claude uses these to add a small silhouette
const CITY_LANDMARKS: Record<string, string> = {
  'Budapest': 'Hungarian Parliament or Chain Bridge silhouette',
  'Belgrade': 'Belgrade Fortress or Church of Saint Sava dome silhouette',
  'Sarajevo': 'Sebilj fountain or minaret silhouette',
  'Split': 'Diocletian Palace bell tower silhouette',
  'Ljubljana': 'Ljubljana Castle or Triple Bridge silhouette',
  'Milano': 'Milan Cathedral (Duomo) spire silhouette',
  'Makarska': 'St. Mark church bell tower or coastline silhouette',
  'Budva': 'Old Town fortification or coastal silhouette',
  'Istanbul': 'mosque dome and minaret silhouette',
  'Vienna': 'St. Stephen Cathedral spire silhouette',
  'Prague': 'Charles Bridge tower silhouette',
  'Rome': 'Colosseum arch or dome of St. Peter silhouette',
  'Paris': 'Eiffel Tower silhouette',
  'London': 'Big Ben tower silhouette',
  'New York': 'Statue of Liberty or Empire State silhouette',
  'Dubai': 'Burj Khalifa silhouette',
  'Tokyo': 'Tokyo Tower or pagoda silhouette',
  'Barcelona': 'Sagrada Familia spire silhouette',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { stamp } = await req.json()
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not set')

    const city = stamp.city || 'Unknown'
    const country = stamp.country || ''
    const countryCode = stamp.country_code?.toUpperCase() || ''
    const year = new Date(stamp.date_earned).getFullYear()
    const landmarkHint = CITY_LANDMARKS[city] || `a subtle iconic landmark or national symbol silhouette for ${city}`

    const prompt = `Generate a complete, valid SVG for a circular passport stamp. The stamp must be exactly 400x400px with the design centered.

Design specifications:
- **Outer border**: Double circle border. Outer circle at r=190, inner at r=180. Stroke: #B8963E (aged gold), width 2px each.
- **Guilloche pattern**: Between r=180 and r=170, create a decorative ring using a repeating pattern. Use 36 small circles (r=3) evenly spaced around the ring at r=175. Color: #B8963E opacity 0.4.
- **Inner decorative ring**: At r=165, another thin circle, stroke #B8963E opacity 0.3, width 0.5px. At r=100, another thin circle same style.
- **City name**: "${city.toUpperCase()}" curved along the top arc of the stamp (centered at top, following r=150). Font: Georgia or serif, bold, 18px, fill #B8963E. Use a textPath on an arc.
- **Country name**: "${country.toUpperCase()}" curved along the bottom arc (centered at bottom, following r=150). Font: Georgia or serif, 11px, fill #B8963E opacity 0.7. Use a textPath on a bottom arc.
- **Year**: "${year}" centered in the stamp, font: Georgia, 28px, bold, fill #B8963E.
- **Country code**: "${countryCode}" small text above the year, font: Georgia, 10px, letter-spacing 4px, fill #B8963E opacity 0.5.
- **Landmark**: Below the year, include ${landmarkHint} as a simple SVG path, max 40px tall, fill #B8963E opacity 0.3. Keep it minimal — just the recognizable outline.
- **Small decorative elements**: Two small star/diamond shapes at 3 o'clock and 9 o'clock positions on the r=155 ring, fill #B8963E.
- **Background**: Transparent (no background rectangle).
- **Overall feel**: Official government visa stamp, aged gold ink on paper, authoritative and elegant.

Rules:
- Return ONLY the SVG code, nothing else — no markdown, no backticks, no explanation.
- Start with <svg and end with </svg>.
- Use viewBox="0 0 400 400".
- All text must be actual SVG text elements (not paths), readable and crisp.
- The SVG must be self-contained with no external references.
- Use textPath with arc paths for curved text.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.status}`)
    }

    const result = await response.json()
    let svg = result.content?.[0]?.text?.trim() ?? ''

    // Clean up — ensure we have just the SVG
    const svgStart = svg.indexOf('<svg')
    const svgEnd = svg.lastIndexOf('</svg>')
    if (svgStart >= 0 && svgEnd >= 0) {
      svg = svg.slice(svgStart, svgEnd + 6)
    }

    if (!svg.startsWith('<svg')) {
      throw new Error('Claude did not return valid SVG')
    }

    // Upload SVG to storage
    const svgBytes = new TextEncoder().encode(svg)
    const fileName = `${stamp.id}/stamp-${Date.now()}.svg`

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const storageClient = createClient(supabaseUrl, supabaseServiceKey)

    const { error: uploadError } = await storageClient.storage
      .from('stamps')
      .upload(fileName, svgBytes, { contentType: 'image/svg+xml', upsert: true })

    if (uploadError) throw new Error(`Storage upload: ${uploadError.message}`)

    const { data: { publicUrl } } = storageClient.storage.from('stamps').getPublicUrl(fileName)

    return new Response(JSON.stringify({ stamp_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-stamp error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
