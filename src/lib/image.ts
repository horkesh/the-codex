/** Convert any image file to a WebP Blob via canvas (JPEG fallback for Safari).
 *  Handles HEIC/HEIF (iOS), WebP, PNG, JPEG and files with empty/unknown MIME types.
 *  @param maxPx   If set, down-scales so the longest edge ≤ maxPx (preserving aspect ratio)
 *  @param quality WebP quality 0–1 (default 0.85)
 */
export function imageToWebpBlob(
  file: File,
  { maxPx, quality = 0.85 }: { maxPx?: number; quality?: number } = {},
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = maxPx ? Math.min(1, maxPx / Math.max(img.naturalWidth, img.naturalHeight)) : 1
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.naturalWidth  * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Try WebP first, fall back to JPEG if the browser doesn't support WebP encoding
      // (Safari < 16 returns a PNG or null when asked for WebP)
      canvas.toBlob(
        (webpBlob) => {
          if (webpBlob && webpBlob.type === 'image/webp') {
            resolve(webpBlob)
          } else {
            canvas.toBlob(
              (jpgBlob) => jpgBlob ? resolve(jpgBlob) : reject(new Error('Canvas toBlob failed')),
              'image/jpeg',
              quality,
            )
          }
        },
        'image/webp',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image failed to load')) }
    img.src = objectUrl
  })
}

/** @deprecated Use imageToWebpBlob instead */
export const imageToJpegBlob = imageToWebpBlob

/** Returns raw base64 (no data-URL prefix) + actual MIME type for AI APIs.
 *  Produces WebP when supported, JPEG otherwise. */
export async function imageToBase64WithMime(
  file: File,
  options?: { maxPx?: number; quality?: number },
): Promise<{ base64: string; mimeType: string }> {
  const blob = await imageToWebpBlob(file, options)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      resolve({ base64: dataUrl.split(',')[1], mimeType: blob.type })
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** @deprecated Use imageToBase64WithMime instead — returns base64 string only, assumes image/webp. */
export async function imageToJpegBase64(
  file: File,
  options?: { maxPx?: number; quality?: number },
): Promise<string> {
  const { base64 } = await imageToBase64WithMime(file, options)
  return base64
}
