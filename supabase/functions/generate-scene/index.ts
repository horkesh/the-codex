const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Participant {
  display_name: string
  portrait_description?: string
}

const SCENE_PROMPTS: Record<string, string> = {
  mission:
    'Cinematic travel scene, three stylish well-dressed men exploring {city}, {country}. Wide establishing shot. Natural light. Rich colors. Editorial quality. Ultra-realistic photography style.',
  night_out:
    'Moody upscale bar interior at night, three stylish men in smart-casual attire seen from behind or at distance, ambient candlelight, bokeh, cinematic color grade, editorial quality.',
  steak:
    'Elegant steakhouse interior, three men at a corner table with wine glasses, warm golden lighting, white tablecloth, rich wood paneling. Seen from across the restaurant. Editorial photography.',
  playstation:
    'Cinematic living room setup, three men gaming on a large screen, neon accent lighting, modern luxury apartment, controllers in hand, competitive focus. Wide shot.',
  toast:
    'Intimate whisky bar or private lounge, three men with crystal glasses raised in a toast, warm amber lighting from a fireplace, bookshelves, leather armchairs. Seen at middle distance.',
  gathering:
    'Elegant private gathering in a luxury venue, stylish guests mingling, warm candlelight, floral arrangements, sophisticated atmosphere. Three men as hosts near the entrance. Wide shot.',
  interlude:
    'Cinematic quiet moment. Three men sitting at an outdoor café or rooftop terrace. Golden hour light. One city in background. Contemplative atmosphere. Long lens, slightly defocused background.',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { entry_type, title, location, city, country, participants } = await req.json() as {
      entry_type: string
      title: string
      location: string | null
      city: string | null
      country: string | null
      participants: Participant[]
    }

    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl) throw new Error('SUPABASE_URL not set')

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')

    // Build scene prompt
    const basePrompt =
      SCENE_PROMPTS[entry_type] ||
      SCENE_PROMPTS['interlude']

    const scenePrompt = basePrompt
      .replace('{city}', city || location || 'the city')
      .replace('{country}', country || '')

    // Call Imagen 4
    const imagenResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt: scenePrompt }],
          parameters: { aspectRatio: '3:4', sampleCount: 1 },
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
    const filename = `scene-${Date.now()}.webp`

    const uploadResponse = await fetch(
      `${supabaseUrl}/storage/v1/object/scene-images/${filename}`,
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

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/scene-images/${filename}`

    return new Response(JSON.stringify({ scene_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-scene error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
