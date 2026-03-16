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
  // Convert data URL directly to blob (avoids fragile fetch-on-dataURL)
  const [header, b64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: mime })
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
