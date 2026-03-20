import type { TempoPoint } from '@/types/app'

interface Props {
  points: TempoPoint[]
  className?: string
}

export function TripTempoGraph({ points, className }: Props) {
  if (points.length < 3) return null

  const WIDTH = 320
  const HEIGHT = 48
  const PADDING = 4

  // Group by day for boundary markers
  const days = [...new Set(points.map(p => p.day))].sort()

  // Normalize x-axis across all points (time-based)
  const times = points.map(p => new Date(p.time).getTime())
  const minT = Math.min(...times)
  const maxT = Math.max(...times)
  const range = maxT - minT || 1

  const barWidth = Math.max(2, (WIDTH - PADDING * 2) / points.length - 1)

  return (
    <div className={className}>
      <p className="text-[9px] font-body uppercase tracking-[0.2em] text-ivory/20 mb-1.5">Trip Tempo</p>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-12" preserveAspectRatio="none">
        {/* Day boundary lines */}
        {days.slice(1).map(day => {
          const firstInDay = points.find(p => p.day === day)
          if (!firstInDay) return null
          const x = PADDING + ((new Date(firstInDay.time).getTime() - minT) / range) * (WIDTH - PADDING * 2)
          return (
            <line
              key={day}
              x1={x} y1={0} x2={x} y2={HEIGHT}
              stroke="rgba(245,240,232,0.08)"
              strokeWidth={0.5}
              strokeDasharray="2,2"
            />
          )
        })}

        {/* Intensity bars */}
        {points.map((p, i) => {
          const x = PADDING + ((times[i] - minT) / range) * (WIDTH - PADDING * 2)
          const h = Math.max(1, p.intensity * (HEIGHT - PADDING * 2))
          const y = HEIGHT - PADDING - h
          const opacity = 0.2 + p.intensity * 0.6
          return (
            <rect
              key={i}
              x={x - barWidth / 2}
              y={y}
              width={barWidth}
              height={h}
              rx={barWidth / 2}
              fill={`rgba(201,168,76,${opacity})`}
            />
          )
        })}
      </svg>
    </div>
  )
}
