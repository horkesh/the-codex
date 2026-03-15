import { createContext, useContext } from 'react'

export type FilterId = 'raw' | 'chronicle' | 'pitch' | 'noir' | 'velvet' | 'havana' | 'dusk' | 'fade' | 'tokyo' | 'amber' | 'ember' | 'frost' | 'haze' | 'slate' | 'midnight' | 'sepia'

export interface PhotoFilter {
  id: FilterId
  name: string
  /** CSS filter string applied to the image element */
  css: string
  /** Radial-gradient for the vignette overlay (absolute inset-0 div) */
  vignette: string
}

export const PHOTO_FILTERS: PhotoFilter[] = [
  {
    id: 'raw',
    name: 'Raw',
    css: 'brightness(1.02) contrast(1.02)',
    vignette: 'radial-gradient(ellipse at center, transparent 58%, rgba(0,0,0,0.42) 100%)',
  },
  {
    id: 'chronicle',
    name: 'Chronicle',
    css: 'contrast(1.08) saturate(0.78) brightness(0.94) sepia(0.12)',
    vignette: 'radial-gradient(ellipse at center, transparent 52%, rgba(18,6,2,0.62) 100%)',
  },
  {
    id: 'pitch',
    name: 'The Pitch',
    css: 'contrast(1.12) saturate(0.88) brightness(0.93) hue-rotate(-8deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,8,20,0.68) 100%)',
  },
  {
    id: 'noir',
    name: 'Noir',
    css: 'grayscale(0.6) contrast(1.18) brightness(0.88)',
    vignette: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.78) 100%)',
  },
  {
    // Deep, crushed blacks, rich saturation — velvet rope nightclub
    id: 'velvet',
    name: 'Velvet',
    css: 'contrast(1.22) saturate(1.12) brightness(0.84)',
    vignette: 'radial-gradient(ellipse at center, transparent 35%, rgba(5,0,12,0.85) 100%)',
  },
  {
    // Warm golden, tropical evenings, old stock film
    id: 'havana',
    name: 'Havana',
    css: 'contrast(1.06) saturate(1.18) brightness(0.96) sepia(0.22) hue-rotate(8deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 50%, rgba(30,10,0,0.60) 100%)',
  },
  {
    // Blue hour, twilight purple cast — golden hour just passed
    id: 'dusk',
    name: 'Dusk',
    css: 'contrast(1.1) saturate(0.72) brightness(0.90) hue-rotate(-22deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 48%, rgba(0,5,22,0.72) 100%)',
  },
  {
    // Lifted blacks, low contrast, bleached matte — editorial print
    id: 'fade',
    name: 'Fade',
    css: 'contrast(0.88) saturate(0.72) brightness(1.06)',
    vignette: 'radial-gradient(ellipse at center, transparent 62%, rgba(0,0,0,0.32) 100%)',
  },
  {
    // High contrast, cool cyan tinge — neon city at night
    id: 'tokyo',
    name: 'Tokyo',
    css: 'contrast(1.16) saturate(1.06) brightness(0.88) hue-rotate(-15deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 44%, rgba(0,10,18,0.76) 100%)',
  },
  {
    // Golden hour warmth, orange-amber cast — summer evening
    id: 'amber',
    name: 'Amber',
    css: 'contrast(1.06) saturate(0.92) brightness(0.97) sepia(0.30) hue-rotate(12deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 52%, rgba(28,10,0,0.58) 100%)',
  },
  {
    // Candlelit warmth, deep crimson undertone — intimate dinner
    id: 'ember',
    name: 'Ember',
    css: 'contrast(1.14) saturate(1.24) brightness(0.86) sepia(0.18) hue-rotate(-5deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 38%, rgba(20,2,0,0.80) 100%)',
  },
  {
    // Crisp desaturated cool — winter morning clarity
    id: 'frost',
    name: 'Frost',
    css: 'contrast(1.04) saturate(0.48) brightness(1.08) hue-rotate(-10deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,8,16,0.38) 100%)',
  },
  {
    // Soft dreamy warmth, gentle bloom — lazy afternoon
    id: 'haze',
    name: 'Haze',
    css: 'contrast(0.92) saturate(0.82) brightness(1.10) sepia(0.14)',
    vignette: 'radial-gradient(ellipse at center, transparent 56%, rgba(12,6,0,0.42) 100%)',
  },
  {
    // Cool desaturated grey-blue — modern editorial
    id: 'slate',
    name: 'Slate',
    css: 'contrast(1.10) saturate(0.38) brightness(0.94) hue-rotate(-18deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 46%, rgba(4,6,14,0.70) 100%)',
  },
  {
    // Deep dark blue, crushed shadows — late-night atmosphere
    id: 'midnight',
    name: 'Midnight',
    css: 'contrast(1.20) saturate(0.68) brightness(0.78) hue-rotate(-28deg)',
    vignette: 'radial-gradient(ellipse at center, transparent 34%, rgba(0,2,16,0.88) 100%)',
  },
  {
    // Classic warm monochrome — vintage photograph
    id: 'sepia',
    name: 'Sepia',
    css: 'contrast(1.04) saturate(0.30) brightness(0.96) sepia(0.52)',
    vignette: 'radial-gradient(ellipse at center, transparent 48%, rgba(22,12,4,0.65) 100%)',
  },
]

export const DEFAULT_FILTER_ID: FilterId = 'chronicle'

const FILTER_MAP: Record<FilterId, PhotoFilter> = Object.fromEntries(
  PHOTO_FILTERS.map((f) => [f.id, f]),
) as Record<FilterId, PhotoFilter>

export function getFilter(id: FilterId | null | undefined): PhotoFilter {
  return FILTER_MAP[id!] ?? FILTER_MAP[DEFAULT_FILTER_ID]
}

/**
 * React context for propagating a filter CSS string into Studio export templates
 * without threading a prop through every template file.
 * Empty string = no filter (default when no Provider wraps the tree).
 */
export const PhotoFilterContext = createContext<string>('')
export const usePhotoFilterCss = () => useContext(PhotoFilterContext)
