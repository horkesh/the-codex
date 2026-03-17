/**
 * Decorative inset border — thin gold line framing the template content.
 * Positioned absolutely inside the ROOT container. Renders as a gallery
 * mat / print border effect.
 */
export function InsetFrame() {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 24,
        border: '1.5px solid rgba(201,168,76,0.2)',
        pointerEvents: 'none',
        zIndex: 3,
      }}
    />
  )
}
