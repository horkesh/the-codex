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

/** Small delay for browser paint */
const settle = (ms: number) => new Promise(r => setTimeout(r, ms))

/**
 * Clone an element to a clean off-screen container, wait for all images
 * to load, capture it, then clean up. This avoids html-to-image capturing
 * sibling elements, parent transforms, or stacking context bleed.
 */
async function captureIsolated(element: HTMLElement): Promise<Blob> {
  // Create off-screen container
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
  document.body.appendChild(container)

  try {
    // Deep clone the element
    const clone = element.cloneNode(true) as HTMLElement
    // Force exact dimensions (no parent scaling)
    clone.style.width = element.scrollWidth + 'px'
    clone.style.height = element.scrollHeight + 'px'
    clone.style.transform = 'none'
    clone.style.position = 'relative'
    container.appendChild(clone)

    // Wait for all images in the clone to load
    const imgs = clone.querySelectorAll<HTMLImageElement>('img')
    const imgLoads = Array.from(imgs).map(img => {
      if (img.complete) return Promise.resolve()
      return new Promise<void>((resolve) => {
        img.onload = () => resolve()
        img.onerror = () => resolve() // don't block on failed images
      })
    })
    await Promise.all(imgLoads)

    // Also handle background-image URLs — fetch and inline them
    const styledEls = clone.querySelectorAll<HTMLElement>('[style]')
    const bgFetches: Promise<void>[] = []
    for (const el of [clone, ...styledEls]) {
      const bgImage = el.style.backgroundImage
      if (!bgImage || !bgImage.startsWith('url(')) continue
      const urlMatch = bgImage.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/)
      if (!urlMatch) continue
      bgFetches.push(
        fetch(urlMatch[1], { mode: 'cors' })
          .then(r => r.ok ? r.blob() : null)
          .then(blob => {
            if (!blob) return
            return new Promise<void>(resolve => {
              const reader = new FileReader()
              reader.onload = () => {
                el.style.backgroundImage = `url(${reader.result})`
                resolve()
              }
              reader.readAsDataURL(blob)
            })
          })
          .catch(() => {}) // skip on failure
      )
    }
    await Promise.all(bgFetches)

    // Let browser paint
    await settle(100)

    // Capture the clean clone
    const dataUrl = await toPng(clone, {
      pixelRatio: 3,
      skipFonts: false,
      fontEmbedCSS: '',
      includeQueryParams: false,
    })

    return dataUrlToBlob(dataUrl)
  } finally {
    document.body.removeChild(container)
  }
}

/** Export a DOM element to a PNG blob */
export async function exportToPng(element: HTMLElement): Promise<Blob> {
  return captureIsolated(element)
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
