import React from 'react'
import { BrandMark } from './shared'
import { GoldRule } from './shared'

interface WrappedCardProps {
  year: number
  totalMissions: number
  totalCountries: number
  totalSteaks: number
  totalNightsOut: number
  totalToasts: number
  topCity?: string
  wrappedLore?: string
}

export const WrappedCard = React.forwardRef<HTMLDivElement, WrappedCardProps>(
  ({ year, totalMissions, totalCountries, totalSteaks, totalNightsOut, totalToasts, topCity, wrappedLore }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1350px',
          backgroundColor: '#0d0b0f',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
        }}
      >
        {/* Subtle radial glow */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(201,168,76,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Top */}
          <BrandMark />

          <div style={{ marginTop: '40px' }}>
            <GoldRule />
          </div>

          {/* Year */}
          <div style={{ marginTop: '48px' }}>
            <div style={{ fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: '8px' }}>
              The Year in Chronicle
            </div>
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '120px', fontWeight: 700, color: '#f5f0e8', lineHeight: 0.9, letterSpacing: '-0.03em' }}>
              {year}
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ marginTop: '48px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '32px' }}>
            {[
              { label: 'Missions', value: totalMissions },
              { label: 'Countries', value: totalCountries },
              { label: 'Nights Out', value: totalNightsOut },
              { label: 'Steaks', value: totalSteaks },
              { label: 'Toasts', value: totalToasts },
              { label: 'Top City', value: topCity || '—', isText: true },
            ].map(({ label, value, isText }) => (
              <div key={label}>
                <div style={{
                  fontFamily: 'JetBrains Mono, Courier New, monospace',
                  fontSize: isText ? '28px' : '48px',
                  fontWeight: 700,
                  color: '#c9a84c',
                  lineHeight: 1,
                }}>
                  {value}
                </div>
                <div style={{ fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a7268', marginTop: '6px' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Wrapped lore */}
          {wrappedLore && (
            <div style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: '20px',
              fontStyle: 'italic',
              color: '#c8c0b0',
              lineHeight: 1.65,
              marginBottom: '40px',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {wrappedLore}
            </div>
          )}

          <GoldRule />

          <div style={{ marginTop: '24px', fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#7a7268', textAlign: 'center' }}>
            The Chronicle Continues
          </div>
        </div>
      </div>
    )
  }
)
WrappedCard.displayName = 'WrappedCard'
