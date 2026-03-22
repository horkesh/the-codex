// @ts-nocheck — Deno + npm:web-push type compatibility
import { createClient } from 'npm:@supabase/supabase-js'
import webpush from 'npm:web-push@3.6.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const vapidPublic = Deno.env.get('VAPID_PUBLIC_KEY') ?? ''
const vapidPrivate = Deno.env.get('VAPID_PRIVATE_KEY') ?? ''
if (vapidPublic && vapidPrivate) {
  webpush.setVapidDetails('mailto:noreply@the-codex-sepia.vercel.app', vapidPublic, vapidPrivate)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { entry_id, name, email, response } = await req.json()

    if (!entry_id || !name) {
      return new Response(JSON.stringify({ error: 'entry_id and name are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const validResponses = ['attending', 'not_attending', 'maybe']
    if (!validResponses.includes(response)) {
      return new Response(JSON.stringify({ error: 'Invalid response value' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const db = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Insert RSVP
    const { data, error } = await db
      .from('gathering_rsvps')
      .insert({ entry_id, name, email: email ?? null, response })
      .select('id')
      .single()

    if (error) throw error

    // Fire-and-forget background work (does not block RSVP response)
    const bgWork = async () => {
      try {
        // Fetch entry
        const { data: entry } = await db
          .from('entries')
          .select('created_by, title, metadata')
          .eq('id', entry_id)
          .single()
        if (!entry) return

        const creatorId = entry.created_by
        const meta = (entry.metadata ?? {}) as Record<string, unknown>

        // Increment unseen RSVP count
        const unseenCount = ((meta.rsvp_unseen_count as number) ?? 0) + 1
        const { error: updateErr } = await db.from('entries').update({
          metadata: { ...meta, rsvp_unseen_count: unseenCount },
        }).eq('id', entry_id)
        if (updateErr) console.error('Failed to update unseen count:', updateErr)

        // Circle auto-add for attending guests
        if (response === 'attending') {
          try {
            const { data: existing } = await db
              .from('people')
              .select('id')
              .eq('added_by', creatorId)
              .ilike('name', name)
              .limit(1)

            let personId: string
            if (existing && existing.length > 0) {
              personId = existing[0].id
            } else {
              const { data: newPerson } = await db
                .from('people')
                .insert({ name, category: 'poi', added_by: creatorId })
                .select('id')
                .single()
              if (!newPerson) return
              personId = newPerson.id

              const { error: linkErr } = await db
                .from('person_gents')
                .insert({ person_id: personId, gent_id: creatorId })
              if (linkErr) console.error('Failed to link person to gent:', linkErr)
            }

            const { error: appErr } = await db
              .from('person_appearances')
              .upsert(
                { entry_id, person_id: personId, noted_by: creatorId },
                { onConflict: 'person_id,entry_id' },
              )
            if (appErr) console.error('Failed to add person appearance:', appErr)
          } catch (e) {
            console.error('Circle auto-add failed:', e)
          }
        }

        // Push notification to creator
        if (vapidPublic && vapidPrivate) {
          try {
            const { data: subs } = await db
              .from('push_subscriptions')
              .select('endpoint, keys_p256dh, keys_auth')
              .eq('gent_id', creatorId)

            if (subs && subs.length > 0) {
              const bodyText = response === 'attending'
                ? `${name} is attending!`
                : response === 'maybe'
                  ? `${name} might come`
                  : `${name} can't make it`

              const payload = JSON.stringify({
                title: entry.title ?? 'Gathering',
                body: bodyText,
                url: `/chronicle/${entry_id}`,
                tag: `rsvp-${entry_id}`,
              })

              for (const sub of subs) {
                try {
                  await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys: { p256dh: sub.keys_p256dh, auth: sub.keys_auth } },
                    payload,
                  )
                } catch (pushErr: unknown) {
                  // 410 = subscription expired — clean up
                  if (pushErr && typeof pushErr === 'object' && 'statusCode' in pushErr && (pushErr as { statusCode: number }).statusCode === 410) {
                    const { error: delErr } = await db.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
                    if (delErr) console.error('Failed to delete expired subscription:', delErr)
                  }
                }
              }
            }
          } catch (e) {
            console.error('Push notification failed:', e)
          }
        }
      } catch (e) {
        console.error('Background RSVP work failed:', e)
      }
    }

    // Start background work without awaiting
    bgWork()

    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
