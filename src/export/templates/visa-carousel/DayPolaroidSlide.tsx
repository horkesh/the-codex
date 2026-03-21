import React from 'react'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared'

interface DayPolaroidSlideProps {
  dayLabel: string
  oneliner: string | null
  photos: { url: string }[] // best 3 photos for this day
  entryTitle: string
}

/** Polaroid-style photo frame with white border and slight rotation */
function Polaroid({ url, width, height, rotation, style }: {
  url: string
  width: number
  height: number
  rotation: number
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      background: '#fff',
      padding: '10px 10px 36px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.1)',
      transform: `rotate(${rotation}deg)`,
      ...style,
    }}>
      <img
        src={url}
        alt=""
        style={{ width, height, objectFit: 'cover', display: 'block' }}
      />
    </div>
  )
}

export const DayPolaroidSlide = React.forwardRef<HTMLDivElement, DayPolaroidSlideProps>(
  ({ dayLabel, oneliner, photos, entryTitle }, ref) => {
    const hero = photos[0]
    const support1 = photos[1]
    const support2 = photos[2]

    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
        <PassportFrame>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
          }}>
            {/* Day label */}
            <div style={{
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: 18,
              fontWeight: 600,
              letterSpacing: '0.2em',
              color: '#8B7355',
              textTransform: 'uppercase' as const,
              marginBottom: 8,
            }}>
              {dayLabel}
            </div>

            {/* Gold rule */}
            <div style={{
              width: 120,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)',
              marginBottom: 32,
            }} />

            {/* Entry title */}
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 28,
              fontWeight: 700,
              color: '#1B3A5C',
              letterSpacing: '0.02em',
              textAlign: 'center' as const,
              marginBottom: 36,
              padding: '0 40px',
            }}>
              {entryTitle}
            </div>

            {/* Polaroid collage */}
            <div style={{
              position: 'relative',
              width: 900,
              height: 700,
              marginBottom: 24,
            }}>
              {/* Hero polaroid — centered, larger */}
              {hero && (
                <Polaroid
                  url={hero.url}
                  width={480}
                  height={360}
                  rotation={-1.5}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-1.5deg)',
                    zIndex: 3,
                  }}
                />
              )}

              {/* Supporting polaroid — bottom left, slightly rotated */}
              {support1 && (
                <Polaroid
                  url={support1.url}
                  width={320}
                  height={260}
                  rotation={-4}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 20,
                    zIndex: 2,
                  }}
                />
              )}

              {/* Supporting polaroid — bottom right, slightly rotated other way */}
              {support2 && (
                <Polaroid
                  url={support2.url}
                  width={320}
                  height={260}
                  rotation={3.5}
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 20,
                    zIndex: 1,
                  }}
                />
              )}
            </div>

            {/* One-liner */}
            {oneliner && (
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 24,
                color: '#5A6B7A',
                textAlign: 'center' as const,
                lineHeight: 1.5,
                padding: '0 60px',
                maxWidth: 900,
              }}>
                &ldquo;{oneliner}&rdquo;
              </div>
            )}

            <div style={{ flex: 1 }} />

            <BrandMark size="sm" />
            <div style={{ height: 12 }} />
          </div>
        </PassportFrame>
      </div>
    )
  }
)

DayPolaroidSlide.displayName = 'DayPolaroidSlide'
