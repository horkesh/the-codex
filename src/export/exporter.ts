import { toPng } from 'html-to-image'

// Options for all exports
const EXPORT_OPTIONS: Record<string, unknown> = {
  pixelRatio: 3,  // High-DPI for sharp Instagram images
  skipFonts: false,
  fontEmbedCSS: '',  // Will be populated at runtime
  // Inline all images as data URLs to avoid CORS issues with external backgrounds
  includeQueryParams: true,
  cacheBust: true,
}

/** Convert a data URL string to a Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

/**
 * Pre-convert all background-image URLs in an element tree to inline data URLs.
 * This fixes cross-origin image export issues with html-to-image.
 */
async function inlineBackgroundImages(element: HTMLElement): Promise<() => void> {
  const restorers: Array<() => void> = []
  const els = element.querySelectorAll<HTMLElement>('[style]')

  for (const el of [element, ...els]) {
    const bgImage = el.style.backgroundImage
    if (!bgImage || !bgImage.startsWith('url(')) continue
    const urlMatch = bgImage.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/)
    if (!urlMatch) continue
    const url = urlMatch[1]

    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const blob = await res.blob()
      const reader = new FileReader()
      const dataUrl = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string)
        reader.readAsDataURL(blob)
      })
      const original = el.style.backgroundImage
      el.style.backgroundImage = `url(${dataUrl})`
      restorers.push(() => { el.style.backgroundImage = original })
    } catch {
      // skip — will export without this background
    }
  }

  return () => restorers.forEach(fn => fn())
}

// Convert a DOM element ref to a PNG blob
export async function exportToPng(element: HTMLElement): Promise<Blob> {
  // Inline external background images before export
  const restore = await inlineBackgroundImages(element)
  try {
    const dataUrl = await toPng(element, EXPORT_OPTIONS)
    return dataUrlToBlob(dataUrl)
  } finally {
    restore()
  }
}

// Share via Web Share API (falls back to download if not supported)
export async function shareImage(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'The Gents Chronicles',
    })
  } else {
    // Fallback: trigger download
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}

// Export and share in one call
export async function exportAndShare(element: HTMLElement, filename: string): Promise<void> {
  const blob = await exportToPng(element)
  await shareImage(blob, filename)
}
