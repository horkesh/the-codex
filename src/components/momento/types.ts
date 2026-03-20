import type { Gent } from '@/types/app'

/** Shared props for all Momento overlay templates */
export interface OverlayProps {
  city?: string | null
  country?: string | null
  date: string
  time: string
  gents: Gent[]
}
