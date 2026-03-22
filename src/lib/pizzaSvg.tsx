type ToppingShape = 'blob' | 'circle' | 'halfmoon' | 'leaf' | 'ring' | 'strip' | 'square' | 'chunk' | 'shred'

interface ToppingDef {
  shape: ToppingShape
  color: string
  label: string
}

export const TOPPING_REGISTRY: Record<string, ToppingDef> = {
  mozzarella:  { shape: 'blob',     color: '#FFF8DC', label: 'Mozzarella' },
  pepperoni:   { shape: 'circle',   color: '#C41E3A', label: 'Pepperoni' },
  mushroom:    { shape: 'halfmoon', color: '#C4A882', label: 'Mushroom' },
  basil:       { shape: 'leaf',     color: '#4A7C59', label: 'Basil' },
  olive:       { shape: 'ring',     color: '#2D2D2D', label: 'Olive' },
  tomato:      { shape: 'circle',   color: '#E74C3C', label: 'Tomato' },
  onion:       { shape: 'ring',     color: '#DDA0DD', label: 'Onion' },
  pepper:      { shape: 'strip',    color: '#FFD700', label: 'Pepper' },
  ham:         { shape: 'square',   color: '#E8919A', label: 'Ham' },
  pineapple:   { shape: 'chunk',    color: '#F4D03F', label: 'Pineapple' },
  chilli:      { shape: 'strip',    color: '#FF4500', label: 'Chilli' },
  gorgonzola:  { shape: 'blob',     color: '#B8C9D6', label: 'Gorgonzola' },
  parmesan:    { shape: 'shred',    color: '#F5DEB3', label: 'Parmesan' },
  ricotta:     { shape: 'blob',     color: '#FFFAF0', label: 'Ricotta' },
  prosciutto:  { shape: 'strip',    color: '#D4756B', label: 'Prosciutto' },
  nduja:       { shape: 'blob',     color: '#CC4422', label: 'Nduja' },
  artichoke:   { shape: 'leaf',     color: '#8FBC8F', label: 'Artichoke' },
  anchovy:     { shape: 'strip',    color: '#8B7355', label: 'Anchovy' },
  egg:         { shape: 'circle',   color: '#FFEFD5', label: 'Egg' },
}

export const TOPPING_KEYS = Object.keys(TOPPING_REGISTRY)

/** Simple seeded PRNG for deterministic topping placement */
function seededRandom(seed: string): () => number {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 0x45d9f3b)
    h = Math.imul(h ^ (h >>> 13), 0x45d9f3b)
    h = (h ^ (h >>> 16)) >>> 0
    return h / 0x100000000
  }
}

interface PizzaSvgProps {
  toppings: string[]
  size: number
  seed?: string
  className?: string
}

export function PizzaSvg({ toppings, size, seed = 'pizza', className }: PizzaSvgProps) {
  const r = size / 2
  const crustWidth = r * 0.12
  const sauceR = r - crustWidth - r * 0.04
  const toppingZone = sauceR * 0.82
  const rand = seededRandom(seed)

  const toppingElements: React.ReactNode[] = []
  const placed: Array<{ x: number; y: number }> = []
  const minDist = size * 0.08

  for (const key of toppings) {
    const def = TOPPING_REGISTRY[key]
    if (!def) continue
    const count = Math.floor(rand() * 3) + 2
    for (let i = 0; i < count; i++) {
      let x = 0, y = 0, attempts = 0
      do {
        const angle = rand() * Math.PI * 2
        const dist = rand() * toppingZone
        x = r + Math.cos(angle) * dist
        y = r + Math.sin(angle) * dist
        attempts++
      } while (attempts < 20 && placed.some(p => Math.hypot(p.x - x, p.y - y) < minDist))
      if (attempts < 20) {
        placed.push({ x, y })
        const idx = toppingElements.length
        toppingElements.push(renderTopping(def, x, y, size * 0.05, rand(), idx))
      }
    }
  }

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={className} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id={`crust-${seed}`} cx="50%" cy="50%" r="50%">
          <stop offset="78%" stopColor="#D4A843" />
          <stop offset="90%" stopColor="#C49332" />
          <stop offset="100%" stopColor="#A67B28" />
        </radialGradient>
        <radialGradient id={`cheese-${seed}`} cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#FFF5D6" />
          <stop offset="100%" stopColor="#F0E0A0" />
        </radialGradient>
      </defs>
      <circle cx={r} cy={r} r={r - 1} fill={`url(#crust-${seed})`} />
      <circle cx={r} cy={r} r={sauceR} fill="#C41E3A" />
      <circle cx={r} cy={r} r={sauceR - 2} fill={`url(#cheese-${seed})`} opacity={0.7} />
      {toppingElements}
    </svg>
  )
}

function renderTopping(def: ToppingDef, x: number, y: number, baseSize: number, rotation: number, key: number): React.ReactNode {
  const rot = rotation * 360
  const s = baseSize
  switch (def.shape) {
    case 'circle':
      return <circle key={key} cx={x} cy={y} r={s} fill={def.color} opacity={0.9} />
    case 'blob':
      return <ellipse key={key} cx={x} cy={y} rx={s * 1.2} ry={s * 0.8} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'ring':
      return <circle key={key} cx={x} cy={y} r={s} fill="none" stroke={def.color} strokeWidth={s * 0.4} opacity={0.85} />
    case 'leaf':
      return <ellipse key={key} cx={x} cy={y} rx={s * 0.5} ry={s * 1.3} fill={def.color} opacity={0.9} transform={`rotate(${rot} ${x} ${y})`} />
    case 'strip':
      return <rect key={key} x={x - s * 0.3} y={y - s * 1.2} width={s * 0.6} height={s * 2.4} rx={s * 0.3} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'square':
      return <rect key={key} x={x - s * 0.7} y={y - s * 0.7} width={s * 1.4} height={s * 1.4} rx={s * 0.2} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'halfmoon':
      return <path key={key} d={`M ${x - s} ${y} A ${s} ${s} 0 0 1 ${x + s} ${y} Z`} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'chunk':
      return <polygon key={key} points={`${x},${y - s} ${x + s * 0.8},${y + s * 0.5} ${x - s * 0.8},${y + s * 0.5}`} fill={def.color} opacity={0.85} transform={`rotate(${rot} ${x} ${y})`} />
    case 'shred':
      return <rect key={key} x={x - s * 0.15} y={y - s * 1} width={s * 0.3} height={s * 2} rx={s * 0.1} fill={def.color} opacity={0.7} transform={`rotate(${rot} ${x} ${y})`} />
    default:
      return <circle key={key} cx={x} cy={y} r={s} fill={def.color} opacity={0.8} />
  }
}
