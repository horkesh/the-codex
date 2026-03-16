const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ASPECT_RATIOS: Record<string, string> = {
  '1:1':  '1:1',
  '4:5':  '3:4',   // Imagen doesn't support 4:5 — closest is 3:4, CSS cover handles the diff
  '9:16': '9:16',
}

// Prompts for generating from scratch (no cover image available)
const TYPE_PROMPTS: Record<string, (location: string) => string> = {
  mission:     (loc) => `Dark cinematic photograph of three stylish well-dressed men exploring ${loc || 'a city'} at night, seen from behind or at a slight distance, city lights and architecture around them, atmospheric shadows, dramatic urban lighting. Style: fine art travel photography, film noir, rich blacks.`,
  night_out:   (_)   => `Moody upscale bar interior, three stylish men seated or standing at a dark polished bar, deep amber candlelight, brass fixtures, shallow depth of field, bokeh highlights. Shot from behind or at distance, faces not prominent. Style: editorial nightlife photography.`,
  steak:       (_)   => `Elegant fine dining table, two or three well-dressed men sharing a meal, candlelight, dark marble, wine glasses mid-toast. Hands and forearms visible, rich warm tones, dramatic shadows. Style: high-end food photography, cinematic.`,
  playstation: (_)   => `Three friends in a dark living room, facing away from camera, lit by screens and deep blue-purple LED glow, controllers in hand, relaxed and focused. Cinematic, moody. Style: atmospheric lifestyle photography.`,
  toast:       (_)   => `Three men raising crystal whisky glasses in a dimly lit room, amber liquid catching the light, dramatic rim lighting, hands and glasses prominent, bokeh background, smoky atmosphere. Style: luxury spirits photography, deep blacks, amber gold tones.`,
  gathering:   (loc) => `Elegant private event space${loc ? ` in ${loc}` : ''}, three well-dressed men conversing warmly, warm candlelight, deep shadows, intimate atmosphere. Shot at middle distance, faces partially lit. Style: luxury events photography, dark moody.`,
  interlude:   (_)   => `A lone figure standing at a rain-streaked dark window overlooking city lights at night, silhouette against the glow, contemplative mood, deep shadows, cinematic. Style: film noir, melancholic, rich blacks.`,
}

// Style directives when restyling an existing cover image via Gemini
const RESTYLE_PROMPTS: Record<string, string> = {
  mission:     'Cinematic travel photography. Deep shadows, dramatic urban lighting, film noir colour grade, rich blacks and warm highlights.',
  night_out:   'Moody editorial nightlife photography. Deep amber tones, candlelight warmth, shallow depth of field bokeh, dark polished atmosphere.',
  steak:       'High-end food and dining photography. Warm candlelight, rich amber tones, dramatic shadows, cinematic depth, dark marble elegance.',
  playstation: 'Atmospheric gaming photography. Cool blue-purple LED glow, deep shadows, screen-lit ambiance, cinematic mood.',
  toast:       'Luxury spirits photography. Deep blacks, amber gold tones, dramatic rim lighting, smoky atmosphere, crystal clarity.',
  gathering:   'Luxury events photography. Warm candlelight, intimate atmosphere, deep shadows, elegant soft focus.',
  interlude:   'Film noir photography. Melancholic mood, deep shadows, rain-streaked atmosphere, rich blacks, contemplative tone.',
}

// Restyle an existing photo using Gemini 2.5 Flash (true image-to-image transform)
async function restyleWithGemini(
  coverBase64: string,
  mimeType: string,
  entryType: string,
  apiKey: string,
): Promise<string> {
  const styleDirective = RESTYLE_PROMPTS[entryType] ?? RESTYLE_PROMPTS['mission']

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20_000)

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inline_data: { mime_type: mimeType, data: coverBase64 } },
              { text: `Restyle this photograph with a dark cinematic noir aesthetic. ${styleDirective} Apply deep noir colour grading with dramatic shadows and high contrast. Keep the EXACT same scene, subjects, composition, and framing — only transform the mood, lighting, and colour palette. The result should look like the same photo shot by a high-end editorial photographer with noir lighting. Output only the restyled image.` },
            ],
          }],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
            maxOutputTokens: 8192,
          },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Gemini restyle error: ${response.status} ${await response.text()}`)
    }

    const result = await response.json()
    const parts = result.candidates?.[0]?.content?.parts ?? []
    const imagePart = parts.find((p: { inlineData?: { data: string } }) => p.inlineData?.data)

    if (!imagePart?.inlineData?.data) {
      throw new Error('Gemini returned no image in restyle response')
    }

    return imagePart.inlineData.data
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Gemini restyle timed out after 20s')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry_type, title, location, city, country, aspect, cover_image_url } = await req.json()
    const googleApiKey = Deno.env.get('GOOGLE_AI_API_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    if (!googleApiKey) throw new Error('GOOGLE_AI_API_KEY not set')

    const { createClient } = await import('npm:@supabase/supabase-js@2')
    const db = createClient(supabaseUrl, supabaseServiceKey)

    const locationStr = location || city || (country ? `${country}` : '')
    const aspectRatio = ASPECT_RATIOS[aspect] ?? '1:1'

    // If cover image exists, download it for restyling
    let coverBase64: string | null = null
    let coverMimeType = 'image/jpeg'
    if (cover_image_url) {
      try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 10_000)
        const imgRes = await fetch(cover_image_url, { signal: controller.signal })
        if (imgRes.ok) {
          coverMimeType = imgRes.headers.get('content-type') ?? 'image/jpeg'
          const buf = await imgRes.arrayBuffer()
          coverBase64 = btoa(String.fromCharCode(...new Uint8Array(buf)))
        }
      } catch {
        // Fall through to generate from scratch if download fails
      }
    }

    let base64Image: string

    if (coverBase64) {
      // Restyle mode: use Gemini to transform the original photo
      base64Image = await restyleWithGemini(coverBase64, coverMimeType, entry_type, googleApiKey)
    } else {
      // From-scratch mode: use Imagen to generate a new background
      const promptFn = TYPE_PROMPTS[entry_type] ?? TYPE_PROMPTS['mission']
      const imagePrompt = `${promptFn(locationStr)} Dark, cinematic, high contrast, suitable as full-bleed text background. Aspect ratio optimised for Instagram.`

      const imageResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: {
              sampleCount: 1,
              aspectRatio,
              safetyFilterLevel: 'block_only_high',
            },
          }),
        }
      )

      if (!imageResponse.ok) {
        throw new Error(`Imagen error: ${imageResponse.status} ${await imageResponse.text()}`)
      }

      const imageResult = await imageResponse.json()
      base64Image = imageResult.predictions?.[0]?.bytesBase64Encoded
      if (!base64Image) throw new Error('No image returned from Imagen')
    }

    const imageBytes = Uint8Array.from(atob(base64Image), (c) => c.charCodeAt(0))
    const fileName = `template-bgs/${entry_type}-${Date.now()}.webp`

    const { error: uploadError } = await db.storage
      .from('covers')
      .upload(fileName, imageBytes, { contentType: 'image/webp', upsert: true })

    if (uploadError) throw new Error(`Storage upload error: ${uploadError.message}`)

    const { data: { publicUrl } } = db.storage.from('covers').getPublicUrl(fileName)

    return new Response(JSON.stringify({ bg_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('generate-template-bg error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
