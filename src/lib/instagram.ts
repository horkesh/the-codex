/**
 * Normalizes an Instagram handle to lowercase, no @ symbol, no URL prefix.
 *
 * Examples:
 *   "@Username"                              → "username"
 *   "username"                               → "username"
 *   "https://instagram.com/username/"        → "username"
 *   "https://www.instagram.com/username?hl=" → "username"
 *
 * Returns null if the input is empty after stripping.
 */
export function normalizeInstagramHandle(raw: string): string | null {
  if (!raw?.trim()) return null
  let s = raw.trim()
  // Strip URL prefix (https://instagram.com/ or https://www.instagram.com/)
  s = s.replace(/^https?:\/\/(www\.)?instagram\.com\/?/i, '')
  // Take first path segment, drop query params and trailing slashes
  s = s.split('/')[0].split('?')[0]
  // Strip leading @
  s = s.replace(/^@/, '')
  s = s.toLowerCase().trim()
  return s || null
}

/**
 * Returns the canonical Instagram profile URL for a normalized handle.
 */
export function getInstagramProfileUrl(handle: string): string {
  return `https://www.instagram.com/${handle}/`
}
