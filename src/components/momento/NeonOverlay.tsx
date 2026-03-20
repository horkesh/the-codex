/**
 * Neon overlay — bold nightlife energy.
 * Bright gold accents that pop against dark backgrounds.
 * Thick borders, large time, club-ready aesthetic.
 * Best for night out / bar / club moments.
 */
import type { Gent } from '@/types/app'
import { FONT, COLOR } from '@/export/templates/shared/utils'

interface NeonOverlayProps {
  city?: string | null
  country?: string | null
  date: string
  time: string
  gents: Gent[]
}

const NEON_GOLD = COLOR.gold
const NEON_GLOW = `0 0 12px rgba(201,168,76,0.6), 0 0 24px rgba(201,168,76,0.25)`

export function NeonOverlay({ city, country, date, time, gents }: NeonOverlayProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Dark vignette — heavier than other overlays for contrast */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)',
      }} />

      {/* Bottom gradient strip */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '200px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)',
      }} />

      {/* Top gradient strip */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '100px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
      }} />

      {/* Neon border — thick gold line with glow */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        bottom: 20,
        border: `2px solid ${NEON_GOLD}`,
        boxShadow: NEON_GLOW,
        zIndex: 11,
      }} />

      {/* Top: time — large, centred, neon glow */}
      <div style={{
        position: 'absolute',
        top: 36,
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: 12,
      }}>
        <span style={{
          fontFamily: FONT.display,
          fontSize: '56px',
          fontWeight: '700',
          color: NEON_GOLD,
          textShadow: `0 0 20px rgba(201,168,76,0.5), 0 0 40px rgba(201,168,76,0.2)`,
          letterSpacing: '0.05em',
          lineHeight: 1,
        }}>
          {time}
        </span>
      </div>

      {/* Bottom content */}
      <div style={{
        position: 'absolute',
        bottom: 32,
        left: 32,
        right: 32,
        zIndex: 12,
      }}>
        {/* City — large, bold */}
        {(city || country) && (
          <p style={{
            fontFamily: FONT.display,
            fontSize: '28px',
            fontWeight: '700',
            color: COLOR.ivory,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
            margin: 0,
            lineHeight: 1.1,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            {city || country}
          </p>
        )}

        {/* Date + gent row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '10px',
        }}>
          <span style={{
            fontFamily: FONT.mono,
            fontSize: '10px',
            color: NEON_GOLD,
            letterSpacing: '0.2em',
            textShadow: `0 0 8px rgba(201,168,76,0.4)`,
          }}>
            {date}
          </span>

          {/* Gent avatars with neon ring */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {gents.map((g, i) => (
              <div
                key={g.id}
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  border: `1.5px solid ${NEON_GOLD}`,
                  boxShadow: `0 0 6px rgba(201,168,76,0.4)`,
                  overflow: 'hidden',
                  marginLeft: i > 0 ? '-5px' : 0,
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
                    color: NEON_GOLD,
                    fontFamily: FONT.body,
                    fontWeight: '600',
                  }}>
                    {g.name?.charAt(0)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginTop: '12px' }}>
          <img
            src="/logo-gold.webp"
            alt=""
            style={{
              width: '24px',
              height: '24px',
              objectFit: 'contain',
              opacity: 0.6,
              filter: `drop-shadow(0 0 6px rgba(201,168,76,0.4))`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
