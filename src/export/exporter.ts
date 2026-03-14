import { toPng } from 'html-to-image'

// Options for all exports
const EXPORT_OPTIONS = {
  pixelRatio: 3,  // High-DPI for sharp Instagram images
  skipFonts: false,
  fontEmbedCSS: '',  // Will be populated at runtime
}

// Convert a DOM element ref to a PNG blob
export async function exportToPng(element: HTMLElement): Promise<Blob> {
  const dataUrl = await toPng(element, EXPORT_OPTIONS)
  const res = await fetch(dataUrl)
  return res.blob()
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
