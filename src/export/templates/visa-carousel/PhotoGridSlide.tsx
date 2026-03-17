import React from 'react'
import { monthYear } from '@/export/templates/shared/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface PhotoGridSlideProps {
  photos: { url: string; caption: string | null }[]
  entryTitle: string
  entryDate: string
}

export const PhotoGridSlide = React.forwardRef<HTMLDivElement, PhotoGridSlideProps>(
  ({ photos, entryTitle, entryDate }, ref) => {
    // Fill to 4 slots for consistent grid
    const slots = [...photos]
    while (slots.length < 4) slots.push(null as unknown as typeof photos[0])

    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
        <PassportFrame>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Title + date */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 36, fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.02em',
              }}>
                {entryTitle}
              </div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 20, color: '#5A6B7A', letterSpacing: '0.1em',
                textTransform: 'uppercase' as const, marginTop: 8,
              }}>
                {monthYear(entryDate)}
              </div>
            </div>

            {/* 2x2 grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14,
              flex: 1, maxHeight: 920,
            }}>
              {slots.slice(0, 4).map((photo, i) => (
                <div key={i} style={{
                  borderRadius: 10, overflow: 'hidden',
                  border: '1.5px solid rgba(201,168,76,0.2)',
                  background: photo ? undefined : 'rgba(201,168,76,0.04)',
                }}>
                  {photo ? (
                    <img
                      src={photo.url}
                      alt={photo.caption ?? ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', minHeight: 200 }} />
                  )}
                </div>
              ))}
            </div>

            {/* BrandMark */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 20, paddingBottom: 8 }}>
              <BrandMark size="md" />
            </div>
          </div>
        </PassportFrame>
      </div>
    )
  }
)

PhotoGridSlide.displayName = 'PhotoGridSlide'
