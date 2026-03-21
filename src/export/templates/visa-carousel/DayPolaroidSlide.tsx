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
      padding: '12px 12px 48px',
      boxShadow: '0 6px 28px rgba(0,0,0,0.2), 0 2px 8px rgba(0,0,0,0.1)',
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
  ({ dayLabel, oneliner, photos }, ref) => {
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
          }}>
            {/* Top spacer */}
            <div style={{ height: 40 }} />

            {/* Day label */}
            <div style={{
              fontFamily: "'Instrument Sans', sans-serif",
              fontSize: 24,
              fontWeight: 600,
              letterSpacing: '0.18em',
              color: '#8B7355',
              textTransform: 'uppercase' as const,
              marginBottom: 8,
            }}>
              {dayLabel}
            </div>

            {/* Gold rule */}
            <div style={{
              width: 160,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.5), transparent)',
              marginBottom: 40,
            }} />

            {/* Polaroid collage — 3 photos: large hero + 2 overlapping supporting */}
            {hasThree && (
              <div style={{
                position: 'relative',
                width: 960,
                height: 820,
                marginBottom: 40,
              }}>
                {/* Hero polaroid — centered, large */}
                <Polaroid
                  url={hero.url}
                  width={580}
                  height={440}
                  rotation={-1.5}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: '50%',
                    transform: 'translateX(-50%) rotate(-1.5deg)',
                    zIndex: 3,
                  }}
                />
                {/* Supporting — bottom left */}
                <Polaroid
                  url={support1.url}
                  width={400}
                  height={320}
                  rotation={-4}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    zIndex: 2,
                  }}
                />
                {/* Supporting — bottom right */}
                <Polaroid
                  url={support2.url}
                  width={400}
                  height={320}
                  rotation={3.5}
                  style={{
                    position: 'absolute',
                    bottom: 10,
                    right: 0,
                    zIndex: 1,
                  }}
                />
              </div>
            )}

            {/* 2-photo layout — overlapping, larger */}
            {hasTwo && (
              <div style={{
                position: 'relative',
                width: 900,
                height: 700,
                marginBottom: 40,
              }}>
                <Polaroid
                  url={hero.url}
                  width={520}
                  height={420}
                  rotation={-3}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 40,
                    zIndex: 2,
                  }}
                />
                <Polaroid
                  url={support1.url}
                  width={520}
                  height={420}
                  rotation={2.5}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 40,
                    zIndex: 1,
                  }}
                />
              </div>
            )}

            {/* Single photo — large centered */}
            {hero && !support1 && (
              <div style={{ marginBottom: 40 }}>
                <Polaroid
                  url={hero.url}
                  width={680}
                  height={520}
                  rotation={-1}
                />
              </div>
            )}

            {/* One-liner */}
            {oneliner && (
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 30,
                color: '#5A6B7A',
                textAlign: 'center' as const,
                lineHeight: 1.45,
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
