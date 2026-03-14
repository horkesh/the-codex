const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { story_title, themes, city, country } = await req.json() as {
      story_title: string
      themes: string[]
      city?: string
      country?: string
    }

    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl) throw new Error('SUPABASE_URL not set')

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')

    if (!story_title) throw new Error('story_title is required')

    const locationHint = [city, country].filter(Boolean).join(', ')
    const themesStr = themes && themes.length > 0 ? themes.join(', ') : 'travel, sophistication, camaraderie'

    const stampPrompt = [
      'Circular passport stamp design.',
      'Vintage travel stamp aesthetic.',
      `Theme: ${story_title}.`,
      locationHint ? `Location: ${locationHint}.` : '',
      'Intricate guilloche border pattern in gold.',
      themesStr + '.',
      'Circular composition.',
      'Dark background.',
      'Gold and ivory colors.',
      'Heraldic illustration style.',
      'No text.',
      'Detailed engraving style.',
      'Ultra high quality.',
    ]
      .filter(Boolean)
      .join(' ')

    // Call Imagen 4
    const imagenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: stampPrompt }],
          parameters: { aspectRatio: '1:1', sampleCount: 1 },
        }),
      }
    )

    if (!imagenResponse.ok) {
      const errText = await imagenResponse.text()
      throw new Error(`Imagen API error: ${imagenResponse.status} — ${errText}`)
    }

    const imagenResult = await imagenResponse.json()
    const base64Image: string = imagenResult?.predictions?.[0]?.bytesBase64Encoded
    if (!base64Image) throw new Error('No image returned from Imagen')

    // Upload to Supabase Storage
    const imageBytes = Uint8Array.from(atob(base64Image), c => c.charCodeAt(0))
    const filename = `stamp-${Date.now()}.webp`

    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/story-stamps/${filename}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          'Content-Type': 'image/webp',
        },
        body: imageBytes,
      }
    )

    if (!uploadResponse.ok) {
      const errText = await uploadResponse.text()
      throw new Error(`Storage upload error: ${uploadResponse.status} — ${errText}`)
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/story-stamps/${filename}`

    return new Response(JSON.stringify({ stamp_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-story-stamp error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
