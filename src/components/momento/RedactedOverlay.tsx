/**
 * Redacted overlay — classified intelligence photo aesthetic.
 * Black redaction bars, coordinates, classification markings.
 * Austere, monochrome, paranoid energy.
 */
import { FONT, COLOR } from '@/export/templates/shared/utils'
import { AvatarStack } from './AvatarStack'
import type { OverlayProps } from './types'

const MONO = FONT.mono
const RED_GOLD = '#D4A050'

export function RedactedOverlay({ city, country, venue, date, time, gents }: OverlayProps) {
  // Fake coordinates derived from city name (deterministic hash for visual consistency)
  const lat = city ? (hashStr(city) % 9000 / 100).toFixed(4) : '44.7866'
  const lng = city ? (hashStr(city + 'lng') % 18000 / 100).toFixed(4) : '20.4489'
  const latDir = Number(lat) > 0 ? 'N' : 'S'
  const lngDir = Number(lng) > 90 ? 'E' : 'W'

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Top gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '140px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
      }} />

      {/* Bottom gradient */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '200px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.35) 50%, transparent 100%)',
      }} />

      {/* ── Top: classification + coordinates ── */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 24,
        right: 24,
        zIndex: 12,
      }}>
        {/* CLASSIFIED stamp */}
        <div style={{
          display: 'inline-block',
          border: `1.5px solid ${RED_GOLD}`,
          padding: '4px 12px',
          marginBottom: '10px',
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: '12px',
            color: RED_GOLD,
            letterSpacing: '0.3em',
            textTransform: 'uppercase',
            fontWeight: '700',
          }}>
            CLASSIFIED
          </span>
        </div>

        {/* Coordinates + date */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}>
          <span style={{
            fontFamily: MONO,
            fontSize: '11px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.05em',
          }}>
            {lat}°{latDir} {lng}°{lngDir}
          </span>
          <span style={{
            fontFamily: MONO,
            fontSize: '11px',
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.1em',
          }}>
            {date.replace(/\//g, '.')}
          </span>
        </div>

        {/* Time */}
        <div style={{
          fontFamily: MONO,
          fontSize: '13px',
          color: 'rgba(255,255,255,0.3)',
          marginTop: '4px',
          letterSpacing: '0.15em',
        }}>
          {time} UTC+1
        </div>
      </div>

      {/* ── Redaction bars — staggered across the frame ── */}
      <div style={{
        position: 'absolute',
        top: '28%',
        left: 0,
        width: '65%',
        height: '28px',
        backgroundColor: 'rgba(0,0,0,0.85)',
        zIndex: 11,
      }} />
      <div style={{
        position: 'absolute',
        top: '36%',
        right: 0,
        width: '45%',
        height: '22px',
        backgroundColor: 'rgba(0,0,0,0.82)',
        zIndex: 11,
      }} />
      <div style={{
        position: 'absolute',
        top: '52%',
        left: '10%',
        width: '55%',
        height: '26px',
        backgroundColor: 'rgba(0,0,0,0.84)',
        zIndex: 11,
      }} />

      {/* ── Bottom: EYES ONLY + city + operatives ── */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        zIndex: 12,
      }}>
        {/* EYES ONLY label */}
        <span style={{
          fontFamily: MONO,
          fontSize: '10px',
          color: RED_GOLD,
          letterSpacing: '0.35em',
          textTransform: 'uppercase',
          fontWeight: '600',
        }}>
          EYES ONLY
        </span>

        {/* Thin rule */}
        <div style={{
          height: '1px',
          backgroundColor: 'rgba(255,255,255,0.15)',
          margin: '8px 0 12px',
        }} />

        {/* Venue / City */}
        {(venue || city || country) && (
          <p style={{
            fontFamily: MONO,
            fontSize: '22px',
            fontWeight: '700',
            color: COLOR.ivory,
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            margin: '0 0 6px',
            lineHeight: 1.1,
          }}>
            {venue || city || country}
          </p>
        )}

        {/* Sub-location */}
        {(venue ? (city || country) : (city && country)) && (
          <p style={{
            fontFamily: MONO,
            fontSize: '12px',
            color: 'rgba(255,255,255,0.4)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: '0 0 14px',
          }}>
            {venue ? [city, country].filter(Boolean).join(', ') : country}
          </p>
        )}

        {/* Operatives row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AvatarStack
              gents={gents}
              size={32}
              overlap={6}
              borderWidth={1.5}
              borderColor="rgba(255,255,255,0.35)"
              fallbackColor="rgba(255,255,255,0.5)"
            />
            <span style={{
              fontFamily: MONO,
              fontSize: '10px',
              color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}>
              {gents.length > 0 ? 'FIELD OPERATIVES' : '[REDACTED]'}
            </span>
          </div>

          <img
            src="/logo-gold.webp"
            alt=""
            style={{
              width: '28px',
              height: '28px',
              objectFit: 'contain',
              opacity: 0.3,
            }}
          />
        </div>
      </div>
    </div>
  )
}

/** Simple string hash for deterministic fake coordinates */
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h + s.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}
