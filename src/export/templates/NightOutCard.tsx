import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, GoldRule } from '@/export/templates/shared'

interface NightOutCardProps {
  entry: Entry
}

export const NightOutCard = React.forwardRef<HTMLDivElement, NightOutCardProps>(
  ({ entry }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1350px',
          backgroundColor: '#0D0D0D',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        {/* Top gold rule */}
        <div style={{ width: '100%', paddingTop: '56px', paddingLeft: '80px', paddingRight: '80px' }}>
          <GoldRule thick />
        </div>

        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            paddingLeft: '80px',
            paddingRight: '80px',
            gap: '0px',
          }}
        >
          {/* Entry title */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '80px',
              fontWeight: '700',
              color: '#F0EDE8',
              textAlign: 'center',
              lineHeight: '1.05',
              letterSpacing: '-0.02em',
              margin: '0 0 36px 0',
            }}
          >
            {entry.title}
          </h1>

          {/* Location */}
          {entry.location && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                marginBottom: '32px',
              }}
            >
              <span
                style={{
                  fontSize: '28px',
                  color: '#C9A84C',
                }}
              >
                ⊕
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '28px',
                  color: '#C9A84C',
                  letterSpacing: '0.04em',
                }}
              >
                {entry.location}
              </span>
            </div>
          )}

          {/* Date in small caps */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '18px',
              color: '#8C8680',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              marginBottom: '72px',
            }}
          >
            {formatDate(entry.date)}
          </p>

          {/* Decorative compass divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '24px',
              marginBottom: '72px',
            }}
          >
            <div
              style={{
                height: '1px',
                width: '120px',
                backgroundColor: '#C9A84C',
                opacity: 0.4,
              }}
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '48px',
                color: '#C9A84C',
                lineHeight: '1',
              }}
            >
              ✦
            </span>
            <div
              style={{
                height: '1px',
                width: '120px',
                backgroundColor: '#C9A84C',
                opacity: 0.4,
              }}
            />
          </div>

          {/* Lore text */}
          {entry.lore && (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '22px',
                color: '#8C8680',
                textAlign: 'center',
                lineHeight: '1.7',
                maxWidth: '860px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
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
            gap: '20px',
            width: '100%',
            paddingLeft: '80px',
            paddingRight: '80px',
          }}
        >
          <GoldRule />
          <BrandMark size="lg" />
        </div>
      </div>
    )
  }
)

NightOutCard.displayName = 'NightOutCard'
