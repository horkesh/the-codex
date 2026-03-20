/**
 * Field Report overlay — classified dossier aesthetic.
 * Rendered on top of live camera feed (transparent background).
 * Also used as the export template overlay on captured photos.
 */
import { FONT, COLOR } from '@/export/templates/shared/utils'
import { AvatarStack } from './AvatarStack'
import type { OverlayProps } from './types'

export function FieldReportOverlay({ city, country, date, time, gents }: OverlayProps) {
  const hasLocation = !!(city || country)

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
        padding: '20px 20px 0',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 60%, transparent 100%)',
        paddingBottom: '36px',
      }}>
        {/* Classification badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '8px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: COLOR.gold,
              boxShadow: `0 0 8px ${COLOR.goldDim}`,
            }} />
            <span style={{
              fontFamily: FONT.mono,
              fontSize: '10px',
              color: COLOR.gold,
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
            }}>
              FIELD REPORT
            </span>
          </div>
          <span style={{
            fontFamily: FONT.mono,
            fontSize: '10px',
            color: COLOR.ivoryDim,
            letterSpacing: '0.1em',
          }}>
            {date}
          </span>
        </div>

        {/* Time — large display */}
        <div style={{
          fontFamily: FONT.display,
          fontSize: '48px',
          fontWeight: '300',
          color: COLOR.ivory,
          letterSpacing: '-0.02em',
          lineHeight: 1,
        }}>
          {time}
        </div>

        {/* Thin gold rule */}
        <div style={{
          height: '1px',
          marginTop: '12px',
          background: `linear-gradient(to right, ${COLOR.goldDim}, transparent)`,
          width: '120px',
        }} />
      </div>

      {/* ── Bottom strip ── */}
      <div style={{
        padding: '0 20px 24px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.35) 60%, transparent 100%)',
        paddingTop: '40px',
      }}>
        {/* Location */}
        {hasLocation && (
          <div style={{ marginBottom: '8px' }}>
            <p style={{
              fontFamily: FONT.display,
              fontSize: '22px',
              fontWeight: '600',
              color: COLOR.ivory,
              lineHeight: 1.2,
              margin: 0,
            }}>
              {city || country}
            </p>
            {city && country && (
              <p style={{
                fontFamily: FONT.body,
                fontSize: '11px',
                color: COLOR.ivoryDim,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                margin: '2px 0 0',
              }}>
                {country}
              </p>
            )}
          </div>
        )}

        {/* Gent avatars row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginTop: '12px',
        }}>
          <AvatarStack gents={gents} size={28} overlap={6} borderWidth={1.5} borderColor={COLOR.gold} fallbackColor={COLOR.gold} />
          <span style={{
            fontFamily: FONT.body,
            fontSize: '11px',
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
              width: '24px',
              height: '24px',
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
