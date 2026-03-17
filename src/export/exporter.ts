import { toPng } from 'html-to-image'

/** Convert a data URL string to a Blob */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
}

const settle = (ms: number) => new Promise(r => setTimeout(r, ms))

/** Extract data URL from an already-loaded img via canvas (no network) */
function imgToDataUrl(img: HTMLImageElement): string | null {
  if (!img.naturalWidth) return null
  try {
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    const ctx = c.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    return c.toDataURL('image/png')
  } catch {
    return null // cross-origin without CORS — canvas tainted
  }
}

/** Fetch URL and convert to data URL */
async function fetchDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: 'cors' })
    if (!res.ok) return null
    const blob = await res.blob()
    return new Promise<string>(resolve => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

/**
 * Inline all external images in the element tree as data URLs.
 * For <img>: try canvas extraction first (instant, cached), fall back to fetch.
 * For background-image: fetch and inline.
 * Returns a restore function.
 */
async function inlineAllImages(element: HTMLElement): Promise<() => void> {
  const restorers: Array<() => void> = []
  const pending: Promise<void>[] = []

  // 1. Inline <img> src
  const imgs = element.querySelectorAll<HTMLImageElement>('img[src]')
  for (const img of imgs) {
    const src = img.src
    if (!src || src.startsWith('data:') || src.startsWith('blob:') || !src.startsWith('http')) continue

    // Try canvas first (no network, uses browser cache)
    const canvasUrl = imgToDataUrl(img)
    if (canvasUrl) {
      const original = img.src
      img.src = canvasUrl
      restorers.push(() => { img.src = original })
      continue
    }

    // Fall back to fetch
    pending.push(
      fetchDataUrl(src).then(dataUrl => {
        if (dataUrl) {
          const original = img.src
          img.src = dataUrl
          restorers.push(() => { img.src = original })
        }
      })
    )
  }

  // 2. Inline CSS background-image
  const styledEls = element.querySelectorAll<HTMLElement>('[style]')
  for (const el of [element, ...styledEls]) {
    const bgImage = el.style.backgroundImage
    if (!bgImage || !bgImage.startsWith('url(')) continue
    const urlMatch = bgImage.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/)
    if (!urlMatch) continue

    pending.push(
      fetchDataUrl(urlMatch[1]).then(dataUrl => {
        if (dataUrl) {
          const original = el.style.backgroundImage
          el.style.backgroundImage = `url(${dataUrl})`
          restorers.push(() => { el.style.backgroundImage = original })
        }
      })
    )
  }

  await Promise.all(pending)
  return () => restorers.forEach(fn => fn())
}

const EXPORT_OPTS = {
  pixelRatio: 3,
  skipFonts: false,
  fontEmbedCSS: '',
  includeQueryParams: false,
}

/** Export a DOM element to a PNG blob — in-place capture with retries */
export async function exportToPng(element: HTMLElement): Promise<Blob> {
  // Inline all images so html-to-image doesn't need to fetch anything
  const restore = await inlineAllImages(element)

  try {
    // Let browser paint the inlined data URLs
    await settle(150)

    // Try up to 3 times
    for (let attempt = 0; attempt < 3; attempt++) {
      const dataUrl = await toPng(element, EXPORT_OPTS)
      const blob = dataUrlToBlob(dataUrl)
      // If result is > 20KB, it likely captured successfully
      if (blob.size > 20_000) return blob
      // Otherwise wait longer and retry
      await settle(300)
    }

    // Last resort — return whatever we got
    const dataUrl = await toPng(element, EXPORT_OPTS)
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
