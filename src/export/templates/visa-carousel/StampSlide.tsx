import React from 'react'
import type { PassportStamp } from '@/types/app'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface StampSlideProps {
  stamp: PassportStamp
  entryTitle: string
}

function monthYear(date: string): string {
  return new Date(date + 'T12:00:00Z')
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

export const StampSlide = React.forwardRef<HTMLDivElement, StampSlideProps>(
  ({ stamp, entryTitle }, ref) => {
    return (
      <div ref={ref}>
        <PassportFrame>
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 32,
          }}>

            {/* Large stamp */}
            {stamp.image_url ? (
              <img
                src={stamp.image_url}
                alt="Mission stamp"
                style={{
                  width: 350, height: 350, borderRadius: '50%',
                  transform: 'rotate(-6deg)', filter: 'sepia(0.1)',
                  opacity: 0.8,
                }}
              />
            ) : (
              <div style={{
                width: 300, height: 300, border: '5px solid #8B4513', borderRadius: '50%',
                transform: 'rotate(-6deg)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                opacity: 0.6, padding: 24,
              }}>
                <span style={{
                  fontFamily: 'Georgia, serif', fontSize: 22, fontWeight: 700, color: '#8B4513',
                  textTransform: 'uppercase' as const, letterSpacing: '0.06em', lineHeight: 1.2,
                  maxWidth: 220,
                }}>
                  {entryTitle}
                </span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: '#8B4513', marginTop: 10, letterSpacing: '0.1em' }}>
                  {monthYear(stamp.date_earned)}
                </span>
              </div>
            )}

            {/* City + country */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 28, fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.03em',
              }}>
                {stamp.city && stamp.country ? `${stamp.city}, ${stamp.country}` : stamp.name}
              </div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 14, color: '#5A6B7A', letterSpacing: '0.12em',
                textTransform: 'uppercase' as const, marginTop: 8,
              }}>
                {monthYear(stamp.date_earned)}
              </div>
            </div>

            {/* BrandMark */}
            <div style={{ marginTop: 'auto', paddingBottom: 8 }}>
              <BrandMark size="sm" />
            </div>
          </div>
        </PassportFrame>
      </div>
    )
  }
)

StampSlide.displayName = 'StampSlide'
