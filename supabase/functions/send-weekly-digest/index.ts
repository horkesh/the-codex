const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface Entry {
  type: string
  title: string
  city: string | null
  country: string | null
  lore: string | null
  created_at: string
}

interface AuthUser {
  id: string
  email: string
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = req.headers.get('content-length') !== '0' ? await req.json().catch(() => ({})) : {}
    const testMode: boolean = body?.test_mode ?? false

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    if (!supabaseUrl) throw new Error('SUPABASE_URL not set')

    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY not set')

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) throw new Error('RESEND_API_KEY not set')

    const supabaseHeaders = {
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      apikey: serviceKey,
    }

    // Date range
    const now = new Date()
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const fourteenDaysAhead = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString()

    // Query recent published entries
    const entriesRes = await fetch(
      `${supabaseUrl}/rest/v1/entries?status=eq.published&created_at=gte.${sevenDaysAgo}&select=type,title,city,country,lore,created_at&order=created_at.desc`,
      { headers: supabaseHeaders }
    )
    if (!entriesRes.ok) throw new Error(`Entries query failed: ${entriesRes.status}`)
    const recentEntries: Entry[] = await entriesRes.json()

    // Query upcoming gatherings (type = gathering, status = gathering_pre)
    const gatheringsRes = await fetch(
      `${supabaseUrl}/rest/v1/entries?type=eq.gathering&status=eq.gathering_pre&select=type,title,city,country,lore,created_at,metadata`,
      { headers: supabaseHeaders }
    )
    if (!gatheringsRes.ok) throw new Error(`Gatherings query failed: ${gatheringsRes.status}`)
    const allGatherings: Array<Entry & { metadata?: { event_date?: string } }> = await gatheringsRes.json()

    // Filter gatherings with event_date in next 14 days
    const upcomingGatherings = allGatherings.filter(g => {
      const eventDate = g.metadata?.event_date
      if (!eventDate) return false
      return eventDate >= now.toISOString() && eventDate <= fourteenDaysAhead
    })

    // Fetch gents
    const gentsRes = await fetch(
      `${supabaseUrl}/rest/v1/gents?select=id,display_name`,
      { headers: supabaseHeaders }
    )
    if (!gentsRes.ok) throw new Error(`Gents query failed: ${gentsRes.status}`)
    const gents: Array<{ id: string; display_name: string }> = await gentsRes.json()

    // Fetch auth users to get emails
    const authUsersRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
      },
    })
    if (!authUsersRes.ok) throw new Error(`Auth users query failed: ${authUsersRes.status}`)
    const authData = await authUsersRes.json()
    const authUsers: AuthUser[] = authData?.users ?? []

    // Map gent ids to emails
    const gentEmails: Array<{ display_name: string; email: string }> = gents.flatMap(g => {
      const user = authUsers.find(u => u.id === g.id)
      return user?.email ? [{ display_name: g.display_name, email: user.email }] : []
    })

    // Build digest prompt
    const entrySummaries =
      recentEntries.length > 0
        ? recentEntries
            .map(e => {
              const loc = [e.city, e.country].filter(Boolean).join(', ') || 'undisclosed'
              return `- ${e.title} (${e.type}) in ${loc}`
            })
            .join('\n')
        : 'No new entries this week.'

    const gatheringSummaries =
      upcomingGatherings.length > 0
        ? upcomingGatherings
            .map(g => {
              const loc = [g.city, g.country].filter(Boolean).join(', ') || 'undisclosed'
              const dateStr = g.metadata?.event_date
                ? new Date(g.metadata.event_date).toLocaleDateString('en-GB', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })
                : 'date TBC'
              return `- ${g.title} in ${loc} on ${dateStr}`
            })
            .join('\n')
        : 'No upcoming gatherings in the next two weeks.'

    const claudePrompt = `Write a Monday morning digest for The Gents — three sophisticated gentlemen. Warm, witty, brief.
This week:
${entrySummaries}

Upcoming:
${gatheringSummaries}

Close with a single line of encouragement or wit. 100-150 words total. No emojis. No hashtags.`

    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        messages: [{ role: 'user', content: claudePrompt }],
      }),
    })

    if (!claudeResponse.ok) throw new Error(`Claude API error: ${claudeResponse.status}`)

    const claudeResult = await claudeResponse.json()
    const digestText = claudeResult.content?.[0]?.text?.trim() ?? ''

    // Format the week label
    const formattedDate = now.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Send emails
    let sentCount = 0

    if (!testMode && gentEmails.length > 0) {
      for (const { display_name, email } of gentEmails) {
        const emailRes = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'The Codex <digest@thecodex.app>',
            to: [email],
            subject: `The Chronicle — Week of ${formattedDate}`,
            html: `<div style="background:#0d0b0f;color:#f5f0e8;font-family:Georgia,serif;padding:40px;max-width:600px;margin:0 auto;"><h2 style="color:#c9a84c;font-size:14px;letter-spacing:0.3em;text-transform:uppercase;">The Chronicle</h2><p style="font-size:16px;line-height:1.7;">${digestText.replace(/\n/g, '<br>')}</p></div>`,
          }),
        })

        if (emailRes.ok) {
          sentCount++
        } else {
          const errText = await emailRes.text()
          console.error(`Failed to send to ${email}: ${errText}`)
        }
      }
    } else if (testMode) {
      // In test mode, count the gents but don't send
      sentCount = 0
    }

    return new Response(
      JSON.stringify({ sent: sentCount, digest: digestText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('send-weekly-digest error:', error)
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
