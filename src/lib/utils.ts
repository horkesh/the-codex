import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  const d = new Date(date)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

export function daysUntil(date: string | Date): number {
  const now = new Date()
  const target = new Date(date)
  now.setHours(0, 0, 0, 0)
  target.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function flagEmoji(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .split('')
    .map(char => String.fromCodePoint(0x1F1E6 - 65 + char.charCodeAt(0)))
    .join('')
}

/** Extract cover crop position from entry metadata */
export function getCoverCrop(entry: { metadata?: unknown }): { x: number; y: number; scale: number } {
  const meta = entry.metadata as Record<string, unknown> | undefined
  return {
    x: (meta?.cover_pos_x as number) ?? 50,
    y: (meta?.cover_pos_y as number) ?? 50,
    scale: (meta?.cover_scale as number) ?? 1,
  }
}
