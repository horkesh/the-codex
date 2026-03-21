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
      padding: '12px 12px 44px',
      boxShadow: '0 6px 24px rgba(0,0,0,0.18), 0 2px 6px rgba(0,0,0,0.1)',
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
    const hasThree = !!hero && !!support1 && !!support2
    const hasTwo = !!hero && !!support1 && !support2

    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
        <PassportFrame>
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            justifyContent: 'center',
          }}>
            {/* Day label */}
            <div style={{
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: '#8B7355',
              textTransform: 'uppercase' as const,
              marginBottom: 12,
            }}>
              {dayLabel}
            </div>

            {/* Gold rule */}
            <div style={{
              width: 140,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)',
              marginBottom: 24,
            }} />

            {/* Entry title */}
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 34,
              fontWeight: 700,
              color: '#1B3A5C',
              letterSpacing: '0.02em',
              textAlign: 'center' as const,
              marginBottom: 32,
              padding: '0 40px',
            }}>
              {entryTitle}
            </div>

            {/* Polaroid collage — 3 photos */}
            {hasThree && (
              <div style={{
                position: 'relative',
                width: 940,
                height: 720,
                marginBottom: 32,
              }}>
                {/* Hero polaroid — centered, larger */}
                <Polaroid
                  url={hero.url}
                  width={520}
                  height={400}
                  rotation={-1.5}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-1.5deg)',
                    zIndex: 3,
                  }}
                />
                {/* Supporting polaroid — bottom left */}
                <Polaroid
                  url={support1.url}
                  width={360}
                  height={280}
                  rotation={-4}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 10,
                    zIndex: 2,
                  }}
                />
                {/* Supporting polaroid — bottom right */}
                <Polaroid
                  url={support2.url}
                  width={360}
                  height={280}
                  rotation={3.5}
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 10,
                    zIndex: 1,
                  }}
                />
              </div>
            )}

            {/* 2-photo layout — side by side, larger */}
            {hasTwo && (
              <div style={{
                display: 'flex',
                gap: 24,
                justifyContent: 'center',
                marginBottom: 32,
              }}>
                <Polaroid
                  url={hero.url}
                  width={400}
                  height={360}
                  rotation={-2.5}
                />
                <Polaroid
                  url={support1.url}
                  width={400}
                  height={360}
                  rotation={2}
                />
              </div>
            )}

            {/* Single photo — large centered */}
            {hero && !support1 && (
              <div style={{ marginBottom: 32 }}>
                <Polaroid
                  url={hero.url}
                  width={600}
                  height={460}
                  rotation={-1}
                />
              </div>
            )}

            {/* One-liner */}
            {oneliner && (
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 28,
                color: '#5A6B7A',
                textAlign: 'center' as const,
                lineHeight: 1.5,
                padding: '0 60px',
                maxWidth: 920,
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
