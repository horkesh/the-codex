import { BrandMark } from './BrandMark'

interface PassportFrameProps {
  header?: string
  children: React.ReactNode
  hideBrandMark?: boolean
}

/**
 * Cream passport-page wrapper with guilloche wave border, faint Europe map
 * watermark, and optional header. Used as the outer container for passport
 * export templates. All styles are inline for html-to-image compatibility.
 */
export function PassportFrame({ header, children, hideBrandMark }: PassportFrameProps) {
  // SVG inset from edges
  const inset = 25
  const svgW = 1080 - inset * 2 // 1030
  const svgH = 1350 - inset * 2 // 1300

  return (
    <div
      style={{
        width: 1080,
        height: 1350,
        backgroundColor: '#F5F0E1',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}
    >
      {/* Header text */}
      {header && (
        <div
          style={{
            position: 'relative',
            zIndex: 3,
            paddingTop: 20,
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.15em',
            color: '#1B3A5C',
            textAlign: 'center',
            fontVariant: 'small-caps',
          }}
        >
          {header}
        </div>
      )}

      {/* Guilloche border frame */}
      <svg
        width={svgW}
        height={svgH}
        viewBox={`0 0 ${svgW} ${svgH}`}
        style={{
          position: 'absolute',
          top: inset,
          left: inset,
          zIndex: 1,
        }}
      >
        <defs>
          <pattern
            id="guilloche"
            patternUnits="userSpaceOnUse"
            width={20}
            height={20}
          >
            <path
              d="M0 10 Q5 0 10 10 Q15 20 20 10"
              stroke="rgba(100,160,120,0.25)"
              fill="none"
              strokeWidth={0.8}
            />
            <path
              d="M0 15 Q5 5 10 15 Q15 25 20 15"
              stroke="rgba(100,160,120,0.15)"
              fill="none"
              strokeWidth={0.5}
            />
          </pattern>
        </defs>
        {/* Outer border */}
        <rect
          x={0}
          y={0}
          width={svgW}
          height={svgH}
          rx={8}
          fill="none"
          stroke="url(#guilloche)"
          strokeWidth={20}
        />
        {/* Inner accent line */}
        <rect
          x={22}
          y={22}
          width={svgW - 44}
          height={svgH - 44}
          rx={4}
          fill="none"
          stroke="rgba(100,160,120,0.12)"
          strokeWidth={1}
        />
        {/* Second inner accent for depth */}
        <rect
          x={26}
          y={26}
          width={svgW - 52}
          height={svgH - 52}
          rx={3}
          fill="none"
          stroke="rgba(100,160,120,0.08)"
          strokeWidth={0.5}
        />
      </svg>

      {/* Europe map watermark */}
      <svg
        width={600}
        height={500}
        viewBox="200 140 500 380"
        style={{
          position: 'absolute',
          top: 425,
          left: 240,
          zIndex: 0,
          opacity: 0.06,
        }}
      >
        <path
          d={`M 480 180 C 460 160 430 150 420 170 C 410 190 430 200 420 220
              C 400 240 380 230 370 250 C 360 270 380 290 370 310
              C 350 330 320 320 310 340 C 300 360 280 350 270 370
              C 260 390 280 410 270 430 C 250 450 230 440 220 460
              L 240 480 C 260 470 280 490 300 480 C 320 470 340 490 360 480
              C 380 470 400 490 420 480 C 440 470 460 480 480 470
              C 500 460 520 480 540 470 C 560 460 550 440 560 420
              C 570 400 590 410 600 390 C 610 370 590 350 600 330
              C 610 310 630 320 640 300 C 650 280 630 260 640 240
              C 650 220 670 230 660 210 C 650 190 620 200 610 180
              C 590 160 560 170 540 160 C 520 150 500 170 480 180`}
          fill="none"
          stroke="#64A078"
          strokeWidth={1}
        />
      </svg>

      {/* Content area */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          padding: '60px 55px 40px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {children}
      </div>

      {/* BrandMark — fixed position across all slides */}
      {!hideBrandMark && (
        <div style={{ position: 'absolute', bottom: 28, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 3 }}>
          <BrandMark size="md" />
        </div>
      )}

      {/* Footer */}
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          width: '100%',
          textAlign: 'center',
          fontSize: 8,
          letterSpacing: '0.3em',
          color: 'rgba(27,58,92,0.25)',
          textTransform: 'uppercase',
          zIndex: 3,
        }}
      >
        THE GENTS CHRONICLES
      </div>
    </div>
  )
}
