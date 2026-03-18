import { motion } from 'framer-motion'
import { fadeUp } from '@/lib/animations'

// Approximate city → SVG coordinates (x: 0-1000, y: 0-500 on a simple world projection)
const CITY_COORDS: Record<string, { x: number; y: number }> = {
  // Europe
  'London': { x: 470, y: 148 },
  'Paris': { x: 480, y: 160 },
  'Berlin': { x: 505, y: 148 },
  'Rome': { x: 505, y: 175 },
  'Barcelona': { x: 475, y: 175 },
  'Amsterdam': { x: 488, y: 145 },
  'Prague': { x: 510, y: 155 },
  'Vienna': { x: 515, y: 158 },
  'Budapest': { x: 520, y: 160 },
  'Zagreb': { x: 515, y: 165 },
  'Belgrade': { x: 525, y: 168 },
  'Sarajevo': { x: 520, y: 170 },
  'Mostar': { x: 518, y: 172 },
  'Dubrovnik': { x: 518, y: 174 },
  'Ljubljana': { x: 510, y: 163 },
  'Munich': { x: 500, y: 155 },
  'Istanbul': { x: 545, y: 175 },
  'Athens': { x: 530, y: 185 },
  'Lisbon': { x: 450, y: 180 },
  'Madrid': { x: 460, y: 178 },
  'Stockholm': { x: 510, y: 125 },
  'Copenhagen': { x: 500, y: 135 },
  'Oslo': { x: 498, y: 122 },
  'Podgorica': { x: 522, y: 174 },
  'Tirana': { x: 525, y: 178 },
  'Skopje': { x: 528, y: 175 },
  'Tuzla': { x: 520, y: 168 },
  'Banja Luka': { x: 516, y: 166 },
  'Split': { x: 514, y: 170 },
  'Novi Sad': { x: 524, y: 165 },
  // Middle East / Africa
  'Dubai': { x: 610, y: 218 },
  'Marrakech': { x: 455, y: 198 },
  'Cairo': { x: 555, y: 205 },
  // Americas
  'New York': { x: 275, y: 175 },
  'Miami': { x: 260, y: 210 },
  'Los Angeles': { x: 175, y: 195 },
  // Asia
  'Tokyo': { x: 835, y: 185 },
  'Bangkok': { x: 745, y: 235 },
  'Singapore': { x: 750, y: 270 },
}

interface TravelMapProps {
  cities: Array<{ city: string; country: string; countryCode: string }>
}

export function TravelMap({ cities }: TravelMapProps) {
  const pins = cities
    .map(c => ({ ...c, coords: CITY_COORDS[c.city] }))
    .filter((c): c is typeof c & { coords: { x: number; y: number } } => !!c.coords)

  if (pins.length === 0) return null

  return (
    <section className="bg-obsidian px-6 py-16">
      <p className="text-[10px] font-body tracking-[0.3em] uppercase text-gold/50 text-center mb-8">
        Missions Abroad
      </p>

      <motion.div
        variants={fadeUp}
        initial="initial"
        whileInView="animate"
        viewport={{ once: true }}
        className="max-w-2xl mx-auto"
      >
        <svg viewBox="0 0 1000 500" className="w-full" style={{ opacity: 0.9 }}>
          <rect x={0} y={0} width={1000} height={500} fill="transparent" />

          {/* Continental outlines (simplified ellipses) */}
          <ellipse cx={500} cy={160} rx={80} ry={50} fill="none" stroke="rgba(201,168,76,0.08)" strokeWidth={1} />
          <ellipse cx={510} cy={280} rx={60} ry={90} fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth={1} />
          <ellipse cx={700} cy={200} rx={150} ry={80} fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth={1} />
          <ellipse cx={250} cy={230} rx={100} ry={120} fill="none" stroke="rgba(201,168,76,0.06)" strokeWidth={1} />

          {/* Grid lines */}
          {Array.from({ length: 5 }, (_, i) => (
            <line key={`h${i}`} x1={0} y1={100 + i * 80} x2={1000} y2={100 + i * 80} stroke="rgba(201,168,76,0.04)" strokeWidth={0.5} />
          ))}
          {Array.from({ length: 9 }, (_, i) => (
            <line key={`v${i}`} x1={100 + i * 100} y1={0} x2={100 + i * 100} y2={500} stroke="rgba(201,168,76,0.04)" strokeWidth={0.5} />
          ))}

          {/* Pins */}
          {pins.map((pin, i) => (
            <g key={`${pin.city}-${i}`}>
              <circle cx={pin.coords.x} cy={pin.coords.y} r={8} fill="rgba(201,168,76,0.15)" />
              <circle cx={pin.coords.x} cy={pin.coords.y} r={3.5} fill="#C9A84C" />
              <circle cx={pin.coords.x} cy={pin.coords.y} r={1.5} fill="#0a0a0f" />
              <text
                x={pin.coords.x}
                y={pin.coords.y - 12}
                textAnchor="middle"
                fill="rgba(201,168,76,0.6)"
                fontSize={9}
                fontFamily="'Instrument Sans', 'Helvetica Neue', Arial, sans-serif"
                letterSpacing="0.08em"
              >
                {pin.city.toUpperCase()}
              </text>
            </g>
          ))}
        </svg>
      </motion.div>
    </section>
  )
}
