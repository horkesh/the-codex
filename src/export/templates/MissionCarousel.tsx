import React from 'react'
import { Entry } from '@/types/app'
import { formatDate, flagEmoji } from '@/lib/utils'
import { BrandMark } from '@/export/templates/shared'

interface MissionCarouselProps {
  entry: Entry
}

export const MissionCarousel = React.forwardRef<HTMLDivElement, MissionCarouselProps>(
  ({ entry }, ref) => {
    const flag = entry.country_code ? flagEmoji(entry.country_code) : null

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1080px',
          backgroundColor: '#0D0D0D',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Diagonal lines texture overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(201,168,76,0.03) 40px, rgba(201,168,76,0.03) 41px)',
            pointerEvents: 'none',
          }}
        />

        {/* Top "MISSION" label */}
        <div
          style={{
            paddingTop: '72px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0',
            zIndex: 1,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#C9A84C',
              letterSpacing: '0.35em',
              textTransform: 'uppercase',
              fontWeight: '600',
            }}
          >
            MISSION
          </span>
          <div
            style={{
              height: '1px',
              width: '64px',
              backgroundColor: '#C9A84C',
              marginTop: '12px',
              opacity: 0.6,
            }}
          />
        </div>

        {/* Center: flag + city + country */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0',
            zIndex: 1,
            flex: 1,
            justifyContent: 'center',
          }}
        >
          {flag && (
            <span
              style={{
                fontSize: '120px',
                lineHeight: '1',
                marginBottom: '40px',
              }}
            >
              {flag}
            </span>
          )}

          {entry.city && (
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '72px',
                fontWeight: '700',
                color: '#F0EDE8',
                textAlign: 'center',
                lineHeight: '1.05',
                letterSpacing: '-0.02em',
                margin: '0 0 16px 0',
                paddingLeft: '60px',
                paddingRight: '60px',
              }}
            >
              {entry.city}
            </h1>
          )}

          {entry.country && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '26px',
                color: '#8C8680',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                marginBottom: '40px',
              }}
            >
              {entry.country}
            </p>
          )}

          {/* Date */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '16px',
              color: '#C9A84C',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: '48px',
            }}
          >
            {formatDate(entry.date)}
          </p>

          {/* Lore snippet */}
          {entry.lore && (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '20px',
                color: '#8C8680',
                textAlign: 'center',
                lineHeight: '1.6',
                maxWidth: '800px',
                paddingLeft: '80px',
                paddingRight: '80px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {entry.lore}
            </p>
          )}
        </div>

        {/* Bottom BrandMark */}
        <div
          style={{
            paddingBottom: '64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 1,
          }}
        >
          <BrandMark size="md" />
        </div>
      </div>
    )
  }
)

MissionCarousel.displayName = 'MissionCarousel'
