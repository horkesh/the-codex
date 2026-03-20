/**
 * Noir overlay — dark cinematic, barely-there chrome.
 * Ultra-minimal: just a faint time and city at the bottom edge,
 * small logo mark. Lets the photo do all the talking.
 * Perfect for late-night moody shots.
 */
import { FONT } from '@/export/templates/shared/utils'
import type { OverlayProps } from './types'

// gents deliberately unused — noir aesthetic shows no avatars
export function NoirOverlay({ city, country, date, time }: OverlayProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Cinematic letterbox bars */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: 'rgba(0,0,0,0.7)',
      }} />
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        backgroundColor: 'rgba(0,0,0,0.7)',
      }} />

      {/* Subtle bottom gradient for text readability */}
      <div style={{
        position: 'absolute',
        bottom: '56px',
        left: 0,
        right: 0,
        height: '80px',
        background: 'linear-gradient(0deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
      }} />

      {/* Top bar content — time left, logo right */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 11,
      }}>
        <span style={{
          fontFamily: FONT.mono,
          fontSize: '15px',
          color: 'rgba(255,255,255,0.4)',
          letterSpacing: '0.15em',
        }}>
          {time}
        </span>
        <img
          src="/logo-gold.webp"
          alt=""
          style={{
            width: '28px',
            height: '28px',
            objectFit: 'contain',
            opacity: 0.35,
          }}
        />
      </div>

      {/* Bottom bar content — city + date */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '56px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 11,
      }}>
        <span style={{
          fontFamily: FONT.display,
          fontSize: '18px',
          fontWeight: '400',
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.05em',
        }}>
          {city || country || ''}
        </span>
        <span style={{
          fontFamily: FONT.mono,
          fontSize: '12px',
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '0.2em',
        }}>
          {date}
        </span>
      </div>
    </div>
  )
}
