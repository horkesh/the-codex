interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: 48,
  md: 64,
  lg: 80,
}

export function BrandMark({ size = 'md' }: BrandMarkProps) {
  const px = SIZES[size]

  return (
    <img
      src="/logo-gold.webp"
      alt="The Gents Chronicles"
      style={{
        width: `${px}px`,
        height: `${px}px`,
        objectFit: 'contain',
        opacity: 0.85,
      }}
    />
  )
}
