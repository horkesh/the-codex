import html2canvas from 'html2canvas'

/** Export a DOM element to a PNG blob using html2canvas */
export async function exportToPng(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    scale: 3,                    // 3x for sharp Instagram images
    useCORS: true,               // fetch cross-origin images with CORS
    allowTaint: false,           // don't taint canvas with non-CORS images
    backgroundColor: null,       // transparent — template provides its own bg
    logging: false,
    width: element.scrollWidth,
    height: element.scrollHeight,
    // Ignore elements outside the target
    ignoreElements: (el) => {
      // Skip the scaled preview wrapper's siblings if somehow traversed
      if (el.getAttribute?.('data-html2canvas-ignore') === 'true') return true
      return false
    },
  })

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
      'image/png',
      1.0
    )
  })
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
