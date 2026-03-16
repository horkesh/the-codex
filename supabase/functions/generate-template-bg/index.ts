import { GENT_APPEARANCES, GENT_VISUAL_ID } from '../_shared/gent-identities.ts'

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

// Noir style — matches the abstract geometric portrait aesthetic
const NOIR_STYLE = 'Abstract artistic rendition. Minimalist geometric forms, cinematic noir lighting, moody desaturated color palette, high-end digital art, dramatic shadows and highlights, sophisticated composition.'

// Step 1: Analyze the cover photo — describe the scene using known gent identities
async function analyzeScene(
  coverBase64: string,
  mimeType: string,
  apiKey: string,
): Promise<string> {
  const gentDescriptions = Object.entries(GENT_APPEARANCES)
    .map(([name, desc]) => `- ${name.charAt(0).toUpperCase() + name.slice(1)}: ${desc}`)
    .join('\n')

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
              { text: `You are analyzing a photograph for an art generation pipeline. Your job is to produce a detailed scene description that will be used to recreate this exact scene as an artistic rendition.

${GENT_VISUAL_ID}

Known appearances:
${gentDescriptions}

Describe this photograph in precise detail for an image generation model. Include:
1. **People**: For each person visible, identify them by name if they match a known Gent (use their full appearance description). For unknown people, describe their appearance in similar detail. Describe each person's exact position, pose, body angle, and what they are doing.
2. **Setting**: The environment, furniture, surfaces, lighting conditions, background elements.
3. **Objects**: Food, drinks, devices, décor — anything on the table or in hands.
4. **Composition**: Camera angle, framing, depth of field, spatial arrangement.

Output a single dense paragraph that could be used directly as an image generation prompt. Do not include any preamble or explanation — just the scene description.` },
            ],
          }],
          generationConfig: { maxOutputTokens: 1024 },
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`Scene analysis error: ${response.status} ${await response.text()}`)
    }

    const result = await response.json()
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    if (!text) throw new Error('Scene analysis returned empty description')

    console.log('Scene analysis:', text.slice(0, 200))
    return text
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('Scene analysis timed out after 20s')
    throw e
  } finally {
    clearTimeout(timeout)
  }
}

// Step 2: Generate the noir rendition via Imagen using the scene description
async function generateNoirScene(
  sceneDescription: string,
  aspectRatio: string,
  apiKey: string,
): Promise<string> {
  const imagePrompt = `${sceneDescription}\n\nStyle: ${NOIR_STYLE} Faithfully preserve every person's facial features, hair, facial hair, and distinguishing characteristics exactly as described. Dark elegant background, no text or words.`

  const imageResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
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
  const base64Image = imageResult.predictions?.[0]?.bytesBase64Encoded
  if (!base64Image) throw new Error('No image returned from Imagen')

  return base64Image
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
    let coverDownloadError: string | null = null
    if (cover_image_url) {
      try {
        const controller = new AbortController()
        setTimeout(() => controller.abort(), 10_000)
        const imgRes = await fetch(cover_image_url, { signal: controller.signal })
        if (imgRes.ok) {
          coverMimeType = imgRes.headers.get('content-type') ?? 'image/jpeg'
          const buf = new Uint8Array(await imgRes.arrayBuffer())
          let binary = ''
          for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i])
          coverBase64 = btoa(binary)
        } else {
          coverDownloadError = `HTTP ${imgRes.status} ${imgRes.statusText}`
        }
      } catch (e) {
        coverDownloadError = (e as Error).message
      }
    }

    let base64Image: string
    let sceneDescription: string | null = null
    const mode = coverBase64 ? 'restyle' : 'from_scratch'

    if (coverBase64) {
      // Two-step restyle: analyze scene → generate noir rendition
      sceneDescription = await analyzeScene(coverBase64, coverMimeType, googleApiKey)
      base64Image = await generateNoirScene(sceneDescription, aspectRatio, googleApiKey)
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

    return new Response(JSON.stringify({
      bg_url: publicUrl,
      _debug: {
        mode,
        cover_image_url: cover_image_url ?? null,
        cover_downloaded: !!coverBase64,
        cover_download_error: coverDownloadError,
        scene_description: sceneDescription?.slice(0, 500) ?? null,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    const stack = error instanceof Error ? error.stack : undefined
    console.error('generate-template-bg error:', msg, stack)
    return new Response(JSON.stringify({ error: msg, stack }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
