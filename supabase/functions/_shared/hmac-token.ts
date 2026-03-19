/**
 * Shared HMAC token utilities for Toast Bridge authentication.
 * Used by generate-toast-token and receive-toast-session edge functions.
 */

export async function generateToken(
  secret: string,
  gentId: string,
): Promise<string> {
  const payload = {
    gent_id: gentId,
    exp: Math.floor(Date.now() / 1000) + 900,
    iat: Math.floor(Date.now() / 1000),
  }

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )

  const payloadB64 = btoa(JSON.stringify(payload))
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadB64))
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))

  return `${payloadB64}.${sigB64}`
}

export async function verifyToken(
  secret: string,
  token: string,
): Promise<{ gent_id: string } | null> {
  try {
    const [payloadB64, sigB64] = token.split('.')
    if (!payloadB64 || !sigB64) return null

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const sigBytes = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0))
    const valid = await crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(payloadB64))
    if (!valid) return null

    const payload = JSON.parse(atob(payloadB64))
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    return { gent_id: payload.gent_id }
  } catch {
    return null
  }
}
