/**
 * Postcard overlay — vintage travel card aesthetic.
 * Cream-tinted borders with handwritten-style elements,
 * "stamp" area, and postal markings. Travel / mission mood.
 */
import { FONT, COLOR } from '@/export/templates/shared/utils'
import { AvatarStack } from './AvatarStack'
import type { OverlayProps } from './types'

export function PostcardOverlay({ city, country, venue, date, time, gents }: OverlayProps) {
  const locationName = venue || city || country || ''
  const cityUpper = locationName.toUpperCase()

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Bottom gradient for readability */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '220px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)',
      }} />

      {/* Top gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '80px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, transparent 100%)',
      }} />

      {/* Stamp area — top right */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        width: '76px',
        height: '90px',
        border: `1.5px dashed rgba(201,168,76,0.45)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        zIndex: 12,
      }}>
        <img
          src="/logo-gold.webp"
          alt=""
          style={{
            width: '36px',
            height: '36px',
            objectFit: 'contain',
            opacity: 0.65,
          }}
        />
        <span style={{
          fontFamily: FONT.mono,
          fontSize: '9px',
          color: COLOR.goldDim,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
        }}>
          THE GENTS
        </span>
      </div>

      {/* "AIR MAIL" stripe — top left */}
      <div style={{
        position: 'absolute',
        top: 24,
        left: 20,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        zIndex: 12,
      }}>
        <div style={{
          display: 'flex',
          gap: '4px',
        }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{
              width: '16px',
              height: '4px',
              backgroundColor: i % 2 === 0 ? COLOR.gold : 'rgba(255,255,255,0.3)',
              transform: 'skewX(-15deg)',
            }} />
          ))}
        </div>
        <span style={{
          fontFamily: FONT.mono,
          fontSize: '11px',
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.3em',
          textTransform: 'uppercase',
        }}>
          PAR AVION
        </span>
      </div>

      {/* Bottom content area */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
        zIndex: 12,
      }}>
        {/* Horizontal ruled line */}
        <div style={{
          height: '1px',
          background: 'rgba(255,255,255,0.15)',
          marginBottom: '14px',
        }} />

        {/* "Greetings from" + city */}
        <p style={{
          fontFamily: FONT.body,
          fontSize: '13px',
          color: 'rgba(255,255,255,0.45)',
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          margin: '0 0 6px',
        }}>
          GREETINGS FROM
        </p>
        <p style={{
          fontFamily: FONT.display,
          fontSize: '40px',
          fontWeight: '700',
          color: COLOR.ivory,
          margin: 0,
          lineHeight: 1,
          letterSpacing: '0.04em',
        }}>
          {cityUpper}
        </p>

        {/* Country + date row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '10px',
        }}>
          {(venue ? (city || country) : (country && city)) && (
            <span style={{
              fontFamily: FONT.body,
              fontSize: '13px',
              color: COLOR.ivoryDim,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
            }}>
              {venue ? [city, country].filter(Boolean).join(', ') : country}
            </span>
          )}
          <span style={{
            fontFamily: FONT.mono,
            fontSize: '12px',
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.1em',
            marginLeft: 'auto',
          }}>
            {date} {time}
          </span>
        </div>

        {/* Gent avatars */}
        <div style={{ marginTop: '12px' }}>
          <AvatarStack gents={gents} size={32} overlap={6} borderColor="rgba(255,255,255,0.3)" fallbackColor="rgba(255,255,255,0.5)" />
        </div>
      </div>

      {/* Circular postmark stamp — faint, top-left area */}
      <svg
        viewBox="0 0 80 80"
        style={{
          position: 'absolute',
          top: 56,
          left: 20,
          width: '96px',
          height: '96px',
          opacity: 0.12,
          zIndex: 12,
          transform: 'rotate(-12deg)',
        }}
      >
        <circle cx="40" cy="40" r="35" fill="none" stroke="white" strokeWidth="2" />
        <circle cx="40" cy="40" r="28" fill="none" stroke="white" strokeWidth="1" />
        <line x1="5" y1="40" x2="75" y2="40" stroke="white" strokeWidth="1.5" />
        <text
          x="40"
          y="34"
          textAnchor="middle"
          fill="white"
          style={{ fontFamily: FONT.mono, fontSize: '8px', letterSpacing: '0.1em' }}
        >
          {cityUpper.slice(0, 10)}
        </text>
        <text
          x="40"
          y="52"
          textAnchor="middle"
          fill="white"
          style={{ fontFamily: FONT.mono, fontSize: '7px' }}
        >
          {date}
        </text>
      </svg>
    </div>
  )
}
