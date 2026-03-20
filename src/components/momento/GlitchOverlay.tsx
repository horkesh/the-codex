/**
 * Glitch overlay — corrupted digital transmission aesthetic.
 * RGB chromatic aberration, scanlines, fragmented text.
 * Cyberpunk, experimental, late-night energy.
 */
import { FONT, COLOR } from '@/export/templates/shared/utils'
import { AvatarStack } from './AvatarStack'
import type { OverlayProps } from './types'

const CYAN = '#00F0FF'
const MAGENTA = '#FF0060'
const CYAN_DIM = 'rgba(0,240,255,0.12)'
const MAGENTA_DIM = 'rgba(255,0,96,0.1)'

/** RGB split text — three overlapping layers offset by a few pixels */
function RGBText({ children, fontSize = '14px', fontWeight = '400' }: { children: string; fontSize?: string; fontWeight?: string }) {
  const base: React.CSSProperties = {
    fontFamily: FONT.mono,
    fontSize,
    fontWeight,
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
    lineHeight: 1.15,
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Red channel — offset left */}
      <span style={{ ...base, color: MAGENTA, opacity: 0.5, position: 'absolute', inset: 0, transform: 'translate(-2px, 1px)' }}>
        {children}
      </span>
      {/* Cyan channel — offset right */}
      <span style={{ ...base, color: CYAN, opacity: 0.45, position: 'absolute', inset: 0, transform: 'translate(2px, -1px)' }}>
        {children}
      </span>
      {/* White channel — center (this one flows and sets the container size) */}
      <span style={{ ...base, color: COLOR.ivory, position: 'relative' }}>
        {children}
      </span>
    </div>
  )
}

export function GlitchOverlay({ city, country, venue, date, time, gents }: OverlayProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* Scanlines — denser VHS-style */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 3px)',
        zIndex: 11,
      }} />

      {/* Chromatic aberration edge tint — subtle red/cyan bars at edges */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        width: '3px',
        backgroundColor: 'rgba(255,0,96,0.15)',
        zIndex: 11,
      }} />
      <div style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '3px',
        backgroundColor: 'rgba(0,240,255,0.15)',
        zIndex: 11,
      }} />

      {/* Dark vignette — heavier for VHS look */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.55) 100%)',
      }} />

      {/* Top gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '120px',
        background: 'linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)',
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

      {/* ── Corner glitch blocks ── */}
      {/* Top-right cluster */}
      <div style={{
        position: 'absolute',
        top: 16,
        right: 0,
        width: '64px',
        height: '8px',
        backgroundColor: CYAN_DIM,
        zIndex: 12,
      }} />
      <div style={{
        position: 'absolute',
        top: 28,
        right: 8,
        width: '40px',
        height: '5px',
        backgroundColor: MAGENTA_DIM,
        zIndex: 12,
      }} />
      <div style={{
        position: 'absolute',
        top: 37,
        right: 0,
        width: '24px',
        height: '3px',
        backgroundColor: CYAN_DIM,
        zIndex: 12,
      }} />

      {/* Bottom-left cluster */}
      <div style={{
        position: 'absolute',
        bottom: 130,
        left: 0,
        width: '52px',
        height: '7px',
        backgroundColor: CYAN_DIM,
        zIndex: 12,
      }} />
      <div style={{
        position: 'absolute',
        bottom: 142,
        left: 6,
        width: '68px',
        height: '4px',
        backgroundColor: MAGENTA_DIM,
        zIndex: 12,
      }} />

      {/* Mid-right glitch */}
      <div style={{
        position: 'absolute',
        top: '60%',
        right: 0,
        width: '32px',
        height: '6px',
        backgroundColor: MAGENTA_DIM,
        zIndex: 12,
      }} />

      {/* ── Interference bars — VHS tracking lines ── */}
      <div style={{
        position: 'absolute',
        top: '42%',
        left: 0,
        right: 0,
        height: '3px',
        backgroundColor: 'rgba(0,240,255,0.1)',
        zIndex: 12,
      }} />
      <div style={{
        position: 'absolute',
        top: '43%',
        left: 0,
        right: 0,
        height: '1px',
        backgroundColor: 'rgba(255,0,96,0.08)',
        zIndex: 12,
      }} />
      <div style={{
        position: 'absolute',
        top: '68%',
        left: 0,
        width: '70%',
        height: '2px',
        backgroundColor: 'rgba(0,240,255,0.06)',
        zIndex: 12,
      }} />

      {/* VHS tracking distortion band */}
      <div style={{
        position: 'absolute',
        top: '22%',
        left: 0,
        right: 0,
        height: '16px',
        background: 'linear-gradient(0deg, transparent, rgba(0,240,255,0.03) 30%, rgba(255,0,96,0.02) 70%, transparent)',
        zIndex: 12,
      }} />

      {/* ── Top: SIGNAL label + time ── */}
      <div style={{
        position: 'absolute',
        top: 28,
        left: 24,
        right: 24,
        zIndex: 13,
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <RGBText fontSize="16px" fontWeight="700">SIGNAL</RGBText>

          {/* Timestamp with cursor block */}
          <span style={{
            fontFamily: FONT.mono,
            fontSize: '15px',
            color: CYAN,
            letterSpacing: '0.1em',
            opacity: 0.7,
          }}>
            {time}<span style={{ opacity: 0.6 }}>_</span>
          </span>
        </div>

        {/* Status line */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
          {/* REC indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#FF0040',
              boxShadow: '0 0 6px rgba(255,0,64,0.6)',
            }} />
            <span style={{
              fontFamily: FONT.mono,
              fontSize: '10px',
              color: '#FF0040',
              letterSpacing: '0.1em',
              fontWeight: '700',
            }}>
              REC
            </span>
          </div>
          <p style={{
            fontFamily: FONT.mono,
            fontSize: '10px',
            color: 'rgba(0,240,255,0.35)',
            letterSpacing: '0.1em',
            margin: 0,
          }}>
            FEED::ACTIVE // {date.replace(/\//g, '-')}
          </p>
        </div>
      </div>

      {/* ── Bottom: city + gents ── */}
      <div style={{
        position: 'absolute',
        bottom: 28,
        left: 24,
        right: 24,
        zIndex: 13,
      }}>
        {/* Venue / City with RGB split */}
        {(venue || city || country) && (
          <div style={{ marginBottom: '8px' }}>
            <RGBText fontSize="28px" fontWeight="700">{(venue || city || country || '').toUpperCase()}</RGBText>
          </div>
        )}

        {/* Sub-location */}
        {(venue ? (city || country) : (city && country)) && (
          <p style={{
            fontFamily: FONT.mono,
            fontSize: '12px',
            color: 'rgba(0,240,255,0.4)',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            margin: '0 0 14px',
          }}>
            {venue ? [city, country].filter(Boolean).join(', ') : country}
          </p>
        )}

        {/* Gents + logo row */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <AvatarStack
            gents={gents}
            size={32}
            overlap={6}
            borderWidth={1.5}
            borderColor={CYAN}
            fallbackColor={CYAN}
            boxShadow={`0 0 6px rgba(0,240,255,0.3)`}
          />

          <img
            src="/logo-gold.webp"
            alt=""
            style={{
              width: '28px',
              height: '28px',
              objectFit: 'contain',
              opacity: 0.4,
              filter: 'hue-rotate(160deg) brightness(1.5)',
            }}
          />
        </div>
      </div>
    </div>
  )
}
