import { useStore } from '@xyflow/react'

const RINGS = [
  { radius: 220, label: 'Inner Circle', color: 'rgba(201,168,76,0.12)' },
  { radius: 380, label: 'Outer Circle', color: 'rgba(201,168,76,0.08)' },
  { radius: 520, label: 'Acquaintance', color: 'rgba(255,255,255,0.05)' },
  { radius: 640, label: 'POI',          color: 'rgba(255,255,255,0.03)' },
]

export function RingGuides() {
  const transform = useStore(s => s.transform)
  const [tx, ty, scale] = transform

  return (
    <svg
      className="absolute inset-0 pointer-events-none"
      style={{ width: '100%', height: '100%', overflow: 'visible' }}
    >
      {RINGS.map(({ radius, label, color }) => {
        const cx = tx
        const cy = ty
        const r = radius * scale

        return (
          <g key={label}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={1}
              strokeDasharray="6 4"
            />
            {scale > 0.4 && (
              <text
                x={cx}
                y={cy - r - 4}
                textAnchor="middle"
                fill={color}
                fontSize={Math.max(9, 10 * Math.min(scale, 1))}
                fontFamily="'Instrument Sans', sans-serif"
                style={{ letterSpacing: '0.1em', textTransform: 'uppercase' }}
              >
                {label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
