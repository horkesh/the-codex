import React from 'react'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface PhotoGridSlideProps {
  photos: { url: string; caption: string | null }[]
  entryTitle: string
  entryDate: string
}

function monthYear(date: string): string {
  return new Date(date + 'T12:00:00Z')
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

export const PhotoGridSlide = React.forwardRef<HTMLDivElement, PhotoGridSlideProps>(
  ({ photos, entryTitle, entryDate }, ref) => {
    // Fill to 4 slots for consistent grid
    const slots = [...photos]
    while (slots.length < 4) slots.push(null as unknown as typeof photos[0])

    return (
      <div ref={ref}>
        <PassportFrame>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Title + date */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 22, fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.02em',
              }}>
                {entryTitle}
              </div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 13, color: '#5A6B7A', letterSpacing: '0.1em',
                textTransform: 'uppercase' as const, marginTop: 6,
              }}>
                {monthYear(entryDate)}
              </div>
            </div>

            {/* 2x2 grid */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
              flex: 1, maxHeight: 900,
            }}>
              {slots.slice(0, 4).map((photo, i) => (
                <div key={i} style={{
                  borderRadius: 8, overflow: 'hidden',
                  border: '1px solid rgba(201,168,76,0.2)',
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
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 16, paddingBottom: 8 }}>
              <BrandMark size="sm" />
            </div>
          </div>
        </PassportFrame>
      </div>
    )
  }
)

PhotoGridSlide.displayName = 'PhotoGridSlide'
