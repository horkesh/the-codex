import { toPng } from 'html-to-image'

// Options for all exports
const EXPORT_OPTIONS: Record<string, unknown> = {
  pixelRatio: 3,  // High-DPI for sharp Instagram images
  skipFonts: false,
  fontEmbedCSS: '',  // Will be populated at runtime
  includeQueryParams: true,
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

/** Fetch a URL and return it as a data URL, or null on failure */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string>((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Pre-convert all external images in an element tree to inline data URLs.
 * Handles both CSS background-image and <img> src attributes.
 * Returns a restore function that reverts all changes.
 */
async function inlineAllImages(element: HTMLElement): Promise<() => void> {
  const restorers: Array<() => void> = []

  // 1. Inline CSS background-image URLs
  const styledEls = element.querySelectorAll<HTMLElement>('[style]')
  for (const el of [element, ...styledEls]) {
    const bgImage = el.style.backgroundImage
    if (!bgImage || !bgImage.startsWith('url(')) continue
    const urlMatch = bgImage.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/)
    if (!urlMatch) continue
    const dataUrl = await toDataUrl(urlMatch[1])
    if (dataUrl) {
      const original = el.style.backgroundImage
      el.style.backgroundImage = `url(${dataUrl})`
      restorers.push(() => { el.style.backgroundImage = original })
    }
  }

  // 2. Inline <img> src URLs
  const imgs = element.querySelectorAll<HTMLImageElement>('img[src]')
  for (const img of imgs) {
    const src = img.src
    if (!src || src.startsWith('data:') || src.startsWith('blob:')) continue
    // Only inline external URLs (http/https) — skip local assets
    if (!src.startsWith('http')) continue
    const dataUrl = await toDataUrl(src)
    if (dataUrl) {
      const original = img.src
      img.src = dataUrl
      restorers.push(() => { img.src = original })
    }
  }

  return () => restorers.forEach(fn => fn())
}

/** Export a DOM element to a PNG blob */
export async function exportToPng(element: HTMLElement): Promise<Blob> {
  const restore = await inlineAllImages(element)
  try {
    const dataUrl = await toPng(element, EXPORT_OPTIONS)
    return dataUrlToBlob(dataUrl)
  } finally {
    restore()
  }
}

/** Share via Web Share API (falls back to download if not supported) */
export async function shareImage(blob: Blob, filename: string): Promise<void> {
  const file = new File([blob], filename, { type: 'image/png' })

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: 'The Gents Chronicles',
    })
  } else {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }
}

/** Export and share in one call */
export async function exportAndShare(element: HTMLElement, filename: string): Promise<void> {
  const blob = await exportToPng(element)
  await shareImage(blob, filename)
}

/** Export multiple elements to PNG blobs (for carousel export) */
export async function exportMultipleToPng(elements: HTMLElement[]): Promise<Blob[]> {
  const blobs: Blob[] = []
  for (const el of elements) {
    blobs.push(await exportToPng(el))
  }
  return blobs
}

/** Share multiple images via Web Share API (falls back to individual downloads) */
export async function shareMultipleImages(blobs: Blob[], filenamePrefix: string): Promise<void> {
  const files = blobs.map((blob, i) =>
    new File([blob], `${filenamePrefix}-${i + 1}.png`, { type: 'image/png' })
  )

  if (navigator.canShare && navigator.canShare({ files })) {
    await navigator.share({ files, title: 'The Gents Chronicles' })
  } else {
    for (const file of files) {
      const url = URL.createObjectURL(file)
      const a = document.createElement('a')
      a.href = url
      a.download = file.name
      a.click()
      URL.revokeObjectURL(url)
    }
  }
}
