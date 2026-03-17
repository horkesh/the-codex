import React from 'react'
import type { PassportStamp } from '@/types/app'
import { monthYear } from '@/export/templates/shared/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface StampSlideProps {
  stamp: PassportStamp
  entryTitle: string
}

export const StampSlide = React.forwardRef<HTMLDivElement, StampSlideProps>(
  ({ stamp, entryTitle }, ref) => {
    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
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
                  width: 440, height: 440, borderRadius: '50%',
                  transform: 'rotate(-6deg)', filter: 'sepia(0.1)',
                  opacity: 0.8,
                }}
              />
            ) : (
              <div style={{
                width: 380, height: 380, border: '6px solid #8B4513', borderRadius: '50%',
                transform: 'rotate(-6deg)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                opacity: 0.6, padding: 32,
              }}>
                <span style={{
                  fontFamily: 'Georgia, serif', fontSize: 30, fontWeight: 700, color: '#8B4513',
                  textTransform: 'uppercase' as const, letterSpacing: '0.06em', lineHeight: 1.2,
                  maxWidth: 280,
                }}>
                  {entryTitle}
                </span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#8B4513', marginTop: 12, letterSpacing: '0.1em' }}>
                  {monthYear(stamp.date_earned)}
                </span>
              </div>
            )}

            {/* City + country */}
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 40, fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.03em',
              }}>
                {stamp.city && stamp.country ? `${stamp.city}, ${stamp.country}` : stamp.name}
              </div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 20, color: '#5A6B7A', letterSpacing: '0.12em',
                textTransform: 'uppercase' as const, marginTop: 10,
              }}>
                {monthYear(stamp.date_earned)}
              </div>
            </div>

            {/* BrandMark */}
            <div style={{ marginTop: 'auto', paddingBottom: 8 }}>
              <BrandMark size="md" />
            </div>
          </div>
        </PassportFrame>
      </div>
    )
  }
)

StampSlide.displayName = 'StampSlide'
