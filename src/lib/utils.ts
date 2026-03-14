import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(new Date(date))
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
