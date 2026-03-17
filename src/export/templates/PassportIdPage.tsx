import React from 'react'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'

interface PassportIdPageProps {
  gent: {
    display_name: string
    alias: string
    full_alias: string
    avatar_url: string | null
  }
  backgroundUrl?: string
}

const SIGNATURE_DRINKS: Record<string, string> = {
  keys: 'COCKTAILS',
  bass: 'BEER',
  lorekeeper: 'BEER',
}

function todayFormatted(): string {
  const d = new Date()
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

export const PassportIdPage = React.forwardRef<HTMLDivElement, PassportIdPageProps>(
  ({ gent }, ref) => {
    const drink = SIGNATURE_DRINKS[gent.alias.toLowerCase()] ?? '—'
    const initials = gent.display_name.charAt(0).toUpperCase()

    const fields: [string, string][] = [
      ['NAME:', gent.display_name.toUpperCase()],
      ["GENT'S STATION:", gent.full_alias.toUpperCase()],
      ['SIGNATURE DRINK:', drink],
      ['ISSUE DATE:', todayFormatted()],
    ]

    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
        <PassportFrame>
          {/* Portrait section */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: 40 }}>
            {gent.avatar_url ? (
              <img
                src={gent.avatar_url}
                alt={gent.display_name}
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #C9A84C',
                  boxShadow: '0 0 20px rgba(201,168,76,0.3)',
                }}
              />
            ) : (
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  border: '4px solid #C9A84C',
                  boxShadow: '0 0 20px rgba(201,168,76,0.3)',
                  background: 'rgba(201,168,76,0.15)',
                  fontSize: 48,
                  color: '#C9A84C',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {initials}
              </div>
            )}

            <div
              style={{
                marginTop: 12,
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: '0.2em',
                color: '#C9A84C',
                textTransform: 'uppercase',
                textAlign: 'center',
              }}
            >
              {gent.alias}
            </div>
          </div>

          {/* Data fields */}
          <div
            style={{
              marginTop: 50,
              display: 'flex',
              flexDirection: 'column',
              gap: 28,
              paddingLeft: 40,
            }}
          >
            {fields.map(([label, value]) => (
              <div key={label} style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
                <div
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#1B3A5C',
                    letterSpacing: '0.05em',
                    textTransform: 'uppercase',
                    width: 280,
                    flexShrink: 0,
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontFamily: 'Georgia, serif',
                    fontSize: 16,
                    color: '#2C2C2C',
                  }}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Bottom section */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'flex-end',
              alignItems: 'center',
              paddingBottom: 20,
            }}
          >
            {/* BrandMark rendered by PassportFrame */}
            <div style={{ height: 80 }} />
          </div>
        </PassportFrame>
      </div>
    )
  }
)

PassportIdPage.displayName = 'PassportIdPage'
