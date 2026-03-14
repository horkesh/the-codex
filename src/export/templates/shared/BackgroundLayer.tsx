interface BackgroundLayerProps {
  url?: string
  /** Gradient strength — 'default' suits portrait/square cards, 'strong' for story format */
  gradient?: 'default' | 'strong'
}

/**
 * Full-bleed AI-generated background + dark gradient overlay.
 * Position parent as `position: relative` and render this as the first child.
 * All sibling content should set `position: relative; z-index: 2` to float above.
 */
export function BackgroundLayer({ url, gradient = 'default' }: BackgroundLayerProps) {
  if (!url) return null

  const overlayGradient = gradient === 'strong'
    ? 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.5) 40%, rgba(0,0,0,0.88) 100%)'
    : 'linear-gradient(180deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.82) 100%)'

  return (
    <>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `url(${url})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute',
        inset: 0,
        background: overlayGradient,
        zIndex: 1,
      }} />
    </>
  )
}
