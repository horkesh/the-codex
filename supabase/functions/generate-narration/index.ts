const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

import { createClient } from 'npm:@supabase/supabase-js'

const NOIR_PROMPT = `You are a hardboiled narrator from a 1940s noir film. Rewrite the following text in your voice. Rules:
- Short, punchy sentences. World-weary. Cynical but poetic.
- You've seen it all. Nothing surprises you, but everything amuses you.
- Use noir metaphors: the city is always watching, the night has teeth, trust is a currency nobody carries.
- Keep all the specific details (names, places, food, drinks, times) — just retell them in your voice.
- Do NOT add details that aren't in the original. Only restyle the language.
- Keep it roughly the same length as the original. Don't pad.
- No quotation marks around the output. Just the rewritten text.`

async function noirRewrite(text: string, anthropicKey: string): Promise<string> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1000,
        messages: [{ role: 'user', content: `${NOIR_PROMPT}\n\nOriginal text:\n${text}` }],
      }),
    })
    if (!res.ok) return text // fallback to original on failure
    const data = await res.json()
    const rewritten = data.content?.[0]?.text?.trim()
    return rewritten || text
  } catch {
    return text // fallback to original
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { text, entry_id, voice = 'onyx', noir = true } = await req.json()
    if (!text || !entry_id) {
      return new Response(JSON.stringify({ error: 'text and entry_id required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Ensure bucket exists (idempotent — no-op if already created)
    await db.storage.createBucket('narrations', { public: true }).catch(() => {})

    // Check cache — use public URL for public bucket
    const filePath = `${entry_id}.mp3`
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/narrations/${filePath}`

    // Check if file exists by HEAD request
    const headRes = await fetch(publicUrl, { method: 'HEAD' }).catch(() => null)
    if (headRes?.ok) {
      return new Response(JSON.stringify({ audio_url: publicUrl }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Noir rewrite (if enabled and Anthropic key available)
    let narrationText = text
    if (noir) {
      const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
      if (anthropicKey) {
        narrationText = await noirRewrite(text, anthropicKey)
      }
    }

    // Generate via OpenAI TTS
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) throw new Error('OPENAI_API_KEY not set')

    const ttsRes = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'tts-1',
        voice,
        input: narrationText,
      }),
    })

    if (!ttsRes.ok) {
      const err = await ttsRes.text()
      throw new Error(`OpenAI TTS failed: ${ttsRes.status} ${err}`)
    }

    const audioBlob = await ttsRes.arrayBuffer()

    // Upload to Storage
    const { error: uploadErr } = await db.storage
      .from('narrations')
      .upload(filePath, audioBlob, {
        contentType: 'audio/mpeg',
        upsert: true,
      })
    if (uploadErr) console.error('Upload error:', uploadErr)

    return new Response(JSON.stringify({ audio_url: publicUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
