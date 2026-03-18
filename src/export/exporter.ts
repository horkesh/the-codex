import html2canvas from 'html2canvas'

const EXPORT_TIMEOUT_MS = 30_000

/** Export a DOM element to a PNG blob (with 30s timeout) */
export async function exportToPng(element: HTMLElement): Promise<Blob> {
  const canvasPromise = html2canvas(element, {
    scale: 3,
    useCORS: true,
    allowTaint: false,
    backgroundColor: null,
    logging: false,
  })

  let timer: ReturnType<typeof setTimeout>
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('Export timed out — try again')), EXPORT_TIMEOUT_MS)
  })

  const canvas = await Promise.race([canvasPromise, timeoutPromise])
  clearTimeout(timer!)

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
export async function exportMultipleToPng(
  elements: HTMLElement[],
  onProgress?: (current: number, total: number) => void
): Promise<Blob[]> {
  const blobs: Blob[] = []
  for (let i = 0; i < elements.length; i++) {
    blobs.push(await exportToPng(elements[i]))
    onProgress?.(i + 1, elements.length)
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
