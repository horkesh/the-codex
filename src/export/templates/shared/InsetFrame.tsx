/**
 * Decorative inset frame — thin gold border with darkened/blurred outer edge.
 * The gold line sits 24px from the edge. Everything outside it is darkened
 * via a massive box-shadow, giving a gallery mat / vignette effect.
 * Blur is applied to the outer strips via backdrop-filter (degrades
 * gracefully in html2canvas which ignores it — the darkening still works).
 */
export function InsetFrame() {
  const inset = 24

  return (
    <>
      {/* Dark + blur strips covering the 24px edge area */}
      {/* Top */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: inset,
        backgroundColor: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      {/* Bottom */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, height: inset,
        backgroundColor: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      {/* Left */}
      <div style={{
        position: 'absolute', top: inset, bottom: inset, left: 0, width: inset,
        backgroundColor: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      {/* Right */}
      <div style={{
        position: 'absolute', top: inset, bottom: inset, right: 0, width: inset,
        backgroundColor: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: 'none', zIndex: 3,
      }} />
      {/* Gold border line */}
      <div style={{
        position: 'absolute',
        inset,
        border: '1.5px solid rgba(201,168,76,0.25)',
        pointerEvents: 'none',
        zIndex: 4,
      }} />
    </>
  )
}
