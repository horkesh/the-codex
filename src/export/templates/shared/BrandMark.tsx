interface BrandMarkProps {
  size?: 'sm' | 'md' | 'lg'
}

const SIZES = {
  sm: { gents: '8px',  chronicles: '6px'  },
  md: { gents: '10px', chronicles: '8px'  },
  lg: { gents: '12px', chronicles: '10px' },
}

export function BrandMark({ size = 'md' }: BrandMarkProps) {
  const { gents, chronicles } = SIZES[size]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
      <span style={{
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        color: '#C9A84C',
        lineHeight: '1',
        fontSize: gents,
        fontWeight: 600,
      }}>
        THE GENTS
      </span>
      <span style={{
        fontFamily: 'var(--font-body)',
        letterSpacing: '0.35em',
        textTransform: 'uppercase',
        color: '#6B6460',
        lineHeight: '1',
        fontSize: chronicles,
        fontWeight: 400,
      }}>
        CHRONICLES
      </span>
    </div>
  )
}
