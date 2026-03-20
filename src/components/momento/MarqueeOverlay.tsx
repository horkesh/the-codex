/**
 * Marquee overlay — clean minimal gold frame aesthetic.
 * Thin gold border inset with elegant typography.
 * Rendered on top of live camera feed (transparent background).
 */
import type { Gent } from '@/types/app'

interface MarqueeOverlayProps {
  city?: string | null
  country?: string | null
  date: string // DD/MM/YYYY
  time: string // HH:MM
  gents: Gent[]
}

const FONT_DISPLAY = "'Playfair Display', Georgia, serif"
const FONT_BODY = "'Instrument Sans', 'Helvetica Neue', Arial, sans-serif"
const GOLD = '#C9A84C'
const GOLD_DIM = 'rgba(201,168,76,0.35)'
const IVORY = '#F0EDE8'
const IVORY_DIM = 'rgba(240,237,232,0.6)'

export function MarqueeOverlay({ city, country, date, time, gents }: MarqueeOverlayProps) {
  const location = [city, country].filter(Boolean).join(', ')
  const inset = 16

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Subtle gradient at top and bottom for readability */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
      }} />

      {/* Gold inset border */}
      <div style={{
        position: 'absolute',
        top: inset,
        left: inset,
        right: inset,
        bottom: inset,
        border: `1px solid ${GOLD_DIM}`,
        pointerEvents: 'none',
        zIndex: 11,
      }} />

      {/* Corner accents — small gold L-shapes at each corner */}
      {[
        { top: inset - 1, left: inset - 1 },
        { top: inset - 1, right: inset - 1 },
        { bottom: inset - 1, left: inset - 1 },
        { bottom: inset - 1, right: inset - 1 },
      ].map((pos, i) => (
        <div key={i} style={{
          position: 'absolute',
          ...pos,
          width: '20px',
          height: '20px',
          zIndex: 12,
        }}>
          {/* Horizontal line */}
          <div style={{
            position: 'absolute',
            [('top' in pos && pos.top !== undefined) ? 'top' : 'bottom']: 0,
            [('left' in pos && pos.left !== undefined) ? 'left' : 'right']: 0,
            width: '20px',
            height: '1.5px',
            backgroundColor: GOLD,
          }} />
          {/* Vertical line */}
          <div style={{
            position: 'absolute',
            [('top' in pos && pos.top !== undefined) ? 'top' : 'bottom']: 0,
            [('left' in pos && pos.left !== undefined) ? 'left' : 'right']: 0,
            width: '1.5px',
            height: '20px',
            backgroundColor: GOLD,
          }} />
        </div>
      ))}

      {/* Top content — centered */}
      <div style={{
        position: 'absolute',
        top: inset + 16,
        left: inset + 16,
        right: inset + 16,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        zIndex: 13,
      }}>
        {/* Logo mark */}
        <img
          src="/logo-gold.webp"
          alt=""
          style={{
            width: '28px',
            height: '28px',
            objectFit: 'contain',
            opacity: 0.75,
          }}
        />

        {/* Time */}
        <span style={{
          fontFamily: FONT_DISPLAY,
          fontSize: '16px',
          color: IVORY,
          fontWeight: '300',
          letterSpacing: '0.05em',
        }}>
          {time}
        </span>
      </div>

      {/* Bottom content */}
      <div style={{
        position: 'absolute',
        bottom: inset + 16,
        left: inset + 16,
        right: inset + 16,
        zIndex: 13,
      }}>
        {/* Location — centered */}
        <div style={{
          textAlign: 'center',
          marginBottom: '14px',
        }}>
          {location && (
            <>
              <p style={{
                fontFamily: FONT_DISPLAY,
                fontSize: '20px',
                fontWeight: '600',
                color: IVORY,
                margin: 0,
                lineHeight: 1.2,
              }}>
                {city || country}
              </p>
              {city && country && (
                <p style={{
                  fontFamily: FONT_BODY,
                  fontSize: '10px',
                  color: IVORY_DIM,
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                  margin: '4px 0 0',
                }}>
                  {country}
                </p>
              )}
            </>
          )}
        </div>

        {/* Date + Gents row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: FONT_BODY,
            fontSize: '10px',
            color: IVORY_DIM,
            letterSpacing: '0.15em',
          }}>
            {date}
          </span>

          {/* Gent avatars */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
          }}>
            {gents.map((g, i) => (
              <div
                key={g.id}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: `1px solid ${GOLD}`,
                  overflow: 'hidden',
                  marginLeft: i > 0 ? '-4px' : 0,
                  position: 'relative',
                  zIndex: gents.length - i,
                  backgroundColor: '#1e1a28',
                }}
              >
                {g.avatar_url ? (
                  <img
                    src={g.avatar_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: GOLD,
                    fontFamily: FONT_BODY,
                    fontWeight: '600',
                  }}>
                    {g.name?.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
