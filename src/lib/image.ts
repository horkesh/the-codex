/** Convert any image file to a JPEG Blob via canvas.
 *  Handles HEIC/HEIF (iOS), WebP, PNG, and files with empty/unknown MIME types.
 *  @param maxPx   If set, down-scales so the longest edge ≤ maxPx (preserving aspect ratio)
 *  @param quality JPEG quality 0–1 (default 0.92)
 */
export function imageToJpegBlob(
  file: File,
  { maxPx, quality = 0.92 }: { maxPx?: number; quality?: number } = {},
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
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Image failed to load')) }
    img.src = objectUrl
  })
}

/** Like imageToJpegBlob but returns raw base64 (no data-URL prefix) for AI APIs. */
export async function imageToJpegBase64(
  file: File,
  options?: { maxPx?: number; quality?: number },
): Promise<string> {
  const blob = await imageToJpegBlob(file, options)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      resolve(dataUrl.split(',')[1]) // strip the data:image/jpeg;base64, prefix
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
