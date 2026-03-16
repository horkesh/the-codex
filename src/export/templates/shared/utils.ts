import type { Entry } from '@/types/app'

/** Extract lore one-liner from metadata, falling back to first sentence of lore */
export function getOneliner(entry: Entry): string | null {
  const meta = entry.metadata as Record<string, unknown> | undefined
  const oneliner = meta?.lore_oneliner as string | undefined
  if (oneliner) return oneliner
  // Fallback: first sentence of lore
  if (entry.lore) {
    const first = entry.lore.split(/(?<=[.!?])\s+/)[0]
    return first || entry.lore
  }
  return null
}
