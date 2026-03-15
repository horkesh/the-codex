// @ts-nocheck — Deno + npm:web-push type compatibility
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const vapidPublic  = Deno.env.get('VAPID_PUBLIC_KEY')
    const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY')
    const supabaseUrl  = Deno.env.get('SUPABASE_URL')
    const serviceKey   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!vapidPublic || !vapidPrivate) throw new Error('VAPID keys not configured')
    if (!supabaseUrl || !serviceKey)   throw new Error('Supabase env not configured')

    webpush.setVapidDetails('mailto:admin@thecodex.app', vapidPublic, vapidPrivate)

    const body = await req.json() as {
      title: string
      body: string
      url?: string
      tag?: string
      senderGentId?: string
    }

    const headers = {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    }

    // Fetch subscriptions — exclude sender at the SQL level
    const cols = 'endpoint,gent_id,keys_p256dh,keys_auth'
    const filter = body.senderGentId
      ? `select=${cols}&gent_id=neq.${body.senderGentId}`
      : `select=${cols}`
    const subsRes = await fetch(`${supabaseUrl}/rest/v1/push_subscriptions?${filter}`, { headers })
    if (!subsRes.ok) throw new Error(`Subscriptions query failed: ${subsRes.status}`)
    const targets: Array<{
      gent_id: string
      endpoint: string
      keys_p256dh: string
      keys_auth: string
    }> = await subsRes.json()

    const payload = JSON.stringify({
      title: body.title,
      body:  body.body,
      url:   body.url ?? '/',
      tag:   body.tag ?? 'codex',
    })

    const results = await Promise.allSettled(
      targets.map((sub) =>
        webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
          payload,
        ).catch(async (err: { statusCode?: number }) => {
          // 404/410 = subscription expired — remove it
          if (err.statusCode === 404 || err.statusCode === 410) {
            await fetch(
              `${supabaseUrl}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`,
              { method: 'DELETE', headers },
            )
          }
          throw err
        }),
      ),
    )

    const sent   = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return new Response(
      JSON.stringify({ sent, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error) {
    console.error('send-push error:', error)
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
