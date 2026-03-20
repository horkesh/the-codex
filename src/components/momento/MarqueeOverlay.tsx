/**
 * Marquee overlay — clean minimal gold frame aesthetic.
 * Thin gold border inset with elegant typography.
 * Rendered on top of live camera feed (transparent background).
 */
import { FONT, COLOR } from '@/export/templates/shared/utils'
import { AvatarStack } from './AvatarStack'
import type { OverlayProps } from './types'

export function MarqueeOverlay({ city, country, date, time, gents }: OverlayProps) {
  const hasLocation = !!(city || country)
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
        border: `1px solid ${COLOR.goldFaint}`,
        pointerEvents: 'none',
        zIndex: 11,
      }} />

      {/* Corner accents — small gold L-shapes at each corner */}
      <CornerAccent top={inset - 1} left={inset - 1} />
      <CornerAccent top={inset - 1} right={inset - 1} />
      <CornerAccent bottom={inset - 1} left={inset - 1} />
      <CornerAccent bottom={inset - 1} right={inset - 1} />

      {/* Top content — logo + time */}
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
        <span style={{
          fontFamily: FONT.display,
          fontSize: '16px',
          color: COLOR.ivory,
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
        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          {hasLocation && (
            <>
              <p style={{
                fontFamily: FONT.display,
                fontSize: '20px',
                fontWeight: '600',
                color: COLOR.ivory,
                margin: 0,
                lineHeight: 1.2,
              }}>
                {city || country}
              </p>
              {city && country && (
                <p style={{
                  fontFamily: FONT.body,
                  fontSize: '10px',
                  color: COLOR.ivoryDim,
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
            fontFamily: FONT.body,
            fontSize: '10px',
            color: COLOR.ivoryDim,
            letterSpacing: '0.15em',
          }}>
            {date}
          </span>

          {/* Gent avatars */}
          <AvatarStack gents={gents} size={24} overlap={4} borderColor={COLOR.gold} fallbackColor={COLOR.gold} />
        </div>
      </div>
    </div>
  )
}

// ── Corner accent helper ──

function CornerAccent(pos: { top?: number; bottom?: number; left?: number; right?: number }) {
  const anchorV = pos.top !== undefined ? 'top' : 'bottom'
  const anchorH = pos.left !== undefined ? 'left' : 'right'

  return (
    <div style={{
      position: 'absolute',
      ...pos,
      width: '20px',
      height: '20px',
      zIndex: 12,
    }}>
      <div style={{
        position: 'absolute',
        [anchorV]: 0,
        [anchorH]: 0,
        width: '20px',
        height: '1.5px',
        backgroundColor: COLOR.gold,
      }} />
      <div style={{
        position: 'absolute',
        [anchorV]: 0,
        [anchorH]: 0,
        width: '1.5px',
        height: '20px',
        backgroundColor: COLOR.gold,
      }} />
    </div>
  )
}
