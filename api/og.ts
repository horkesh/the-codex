import type { VercelRequest, VercelResponse } from '@vercel/node'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''
const APP_URL = 'https://the-codex-sepia.vercel.app'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { slug } = req.query
  if (!slug || typeof slug !== 'string') {
    return res.redirect(302, '/')
  }

  const ua = req.headers['user-agent'] ?? ''
  const isBot = /facebookexternalhit|Viber|WhatsApp|Twitterbot|LinkedInBot|Slackbot|TelegramBot|Discordbot/i.test(ua)

  if (!isBot) {
    return res.redirect(302, `/g/${slug}`)
  }

  let title = 'The Gents Chronicles'
  let description = 'You are invited'
  let image = `${APP_URL}/logo-gold.webp`

  try {
    const r = await fetch(
      `${SUPABASE_URL}/rest/v1/entries?id=eq.${slug}&select=title,metadata,cover_image_url`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } },
    )
    if (r.ok) {
      const rows = (await r.json()) as Array<Record<string, unknown>>
      const [entry] = rows
      if (entry) {
        const meta = (entry.metadata ?? {}) as Record<string, unknown>
        title = (entry.title as string) ?? title
        if (meta.venue) title += ` at ${meta.venue}`
        if (meta.event_date) description = meta.event_date as string
        const pizzaMenu = meta.pizza_menu as unknown[] | undefined
        if (meta.flavour === 'pizza_party' && pizzaMenu?.length) {
          description += ` \u00b7 ${pizzaMenu.length} pizzas on the menu`
        }
        if (entry.cover_image_url) image = entry.cover_image_url as string
      }
    }
  } catch { /* defaults */ }

  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.status(200).send(`<!DOCTYPE html>
<html><head>
<meta property="og:title" content="${esc(title)}" />
<meta property="og:description" content="${esc(description)}" />
<meta property="og:image" content="${esc(image)}" />
<meta property="og:type" content="website" />
<meta property="og:url" content="${APP_URL}/g/${slug}" />
<meta http-equiv="refresh" content="0;url=/g/${slug}" />
</head><body></body></html>`)
}
