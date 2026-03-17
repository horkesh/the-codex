import html2canvas from 'html2canvas'

/**
 * Temporarily remove CSS transforms from all ancestors of an element.
 * Returns a restore function that puts them back.
 * This is needed because html2canvas uses getBoundingClientRect() which
 * is affected by parent transforms — a scale(0.28) preview wrapper would
 * make it capture at 302px instead of 1080px.
 */
function stripAncestorTransforms(element: HTMLElement): () => void {
  const restorers: Array<() => void> = []
  let el: HTMLElement | null = element.parentElement

  while (el) {
    // Remove transforms
    const transform = el.style.transform
    if (transform && transform !== 'none') {
      const saved = transform
      el.style.transform = 'none'
      const ref = el
      restorers.push(() => { ref.style.transform = saved })
    }
    const computed = getComputedStyle(el).transform
    if (computed && computed !== 'none' && !transform) {
      el.style.transform = 'none'
      const ref = el
      restorers.push(() => { ref.style.transform = '' })
    }

    // Remove overflow:hidden that would clip the unscaled element
    const overflow = getComputedStyle(el).overflow
    if (overflow === 'hidden') {
      const savedOverflow = el.style.overflow
      el.style.overflow = 'visible'
      const ref = el
      restorers.push(() => { ref.style.overflow = savedOverflow })
    }

    el = el.parentElement
  }

  return () => restorers.forEach(fn => fn())
}

/** Export a DOM element to a PNG blob */
export async function exportToPng(element: HTMLElement): Promise<Blob> {
  // Strip parent transforms so html2canvas sees true dimensions
  const restore = stripAncestorTransforms(element)

  try {
    const canvas = await html2canvas(element, {
      scale: 3,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    })

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/png',
        1.0
      )
    })
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
