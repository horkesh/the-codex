/**
 * Field Report overlay — classified dossier aesthetic.
 * Rendered on top of live camera feed (transparent background).
 * Also used as the export template overlay on captured photos.
 */
import { FONT, COLOR } from '@/export/templates/shared/utils'
import { AvatarStack } from './AvatarStack'
import type { OverlayProps } from './types'

export function FieldReportOverlay({ city, country, venue, date, time, gents }: OverlayProps) {
  const hasLocation = !!(city || country || venue)

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      zIndex: 10,
    }}>
      {/* ── Top strip ── */}
      <div style={{
        padding: '24px 24px 0',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        paddingBottom: '48px',
      }}>
        {/* Classification badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: COLOR.gold,
              boxShadow: `0 0 8px ${COLOR.goldDim}`,
            }} />
            <span style={{
              fontFamily: FONT.mono,
              fontSize: '13px',
              color: COLOR.gold,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}>
              FIELD REPORT
            </span>
          </div>
          <span style={{
            fontFamily: FONT.mono,
            fontSize: '13px',
            color: COLOR.ivoryDim,
            letterSpacing: '0.1em',
          }}>
            {date}
          </span>
        </div>

        {/* Time — large display */}
        <div style={{
          fontFamily: FONT.display,
          fontSize: '64px',
          fontWeight: '300',
          color: COLOR.ivory,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          {time}
        </div>

        {/* Thin gold rule */}
        <div style={{
          height: '1.5px',
          marginTop: '14px',
          background: `linear-gradient(to right, ${COLOR.goldDim}, transparent)`,
          width: '140px',
        }} />
      </div>

      {/* ── Bottom strip ── */}
      <div style={{
        padding: '0 24px 28px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
        paddingTop: '48px',
      }}>
        {/* Location */}
        {hasLocation && (
          <div style={{ marginBottom: '10px' }}>
            {venue && (
              <p style={{
                fontFamily: FONT.display,
                fontSize: '28px',
                fontWeight: '600',
                color: COLOR.ivory,
                lineHeight: 1.2,
                margin: '0 0 4px',
              }}>
                {venue}
              </p>
            )}
            <p style={{
              fontFamily: venue ? FONT.body : FONT.display,
              fontSize: venue ? '14px' : '28px',
              fontWeight: venue ? '400' : '600',
              color: venue ? COLOR.ivoryDim : COLOR.ivory,
              letterSpacing: venue ? '0.15em' : undefined,
              textTransform: venue ? 'uppercase' : undefined,
              lineHeight: 1.2,
              margin: 0,
            } as React.CSSProperties}>
              {[city, country].filter(Boolean).join(', ')}
            </p>
          </div>
        )}

        {/* Gent avatars row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: '14px',
        }}>
          <AvatarStack gents={gents} size={36} overlap={8} borderWidth={2} borderColor={COLOR.gold} fallbackColor={COLOR.gold} />
          <span style={{
            fontFamily: FONT.body,
            fontSize: '14px',
            color: COLOR.ivoryDim,
            letterSpacing: '0.1em',
          }}>
            The Gents
          </span>

          {/* BrandMark - small logo at far right */}
          <img
            src="/logo-gold.webp"
            alt=""
            style={{
              width: '32px',
              height: '32px',
              objectFit: 'contain',
              opacity: 0.7,
              marginLeft: 'auto',
            }}
          />
        </div>
      </div>
    </div>
  )
}
