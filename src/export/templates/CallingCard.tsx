import React from 'react'
import { BrandMark, GoldRule } from '@/export/templates/shared'

interface CallingCardProps {
  gent: {
    display_name: string
    alias: string
    bio?: string | null
    avatar_url?: string | null
  }
}

export const CallingCard = React.forwardRef<HTMLDivElement, CallingCardProps>(
  ({ gent }, ref) => {
    const initials = gent.display_name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)

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
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Inner card */}
        <div
          style={{
            width: '840px',
            minHeight: '840px',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: '4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '72px 64px 56px 64px',
            gap: '0',
            position: 'relative',
          }}
        >
          {/* Corner accents */}
          {[
            { top: '-1px', left: '-1px', borderTop: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C', borderBottom: 'none', borderRight: 'none' },
            { top: '-1px', right: '-1px', borderTop: '2px solid #C9A84C', borderRight: '2px solid #C9A84C', borderBottom: 'none', borderLeft: 'none' },
            { bottom: '-1px', left: '-1px', borderBottom: '2px solid #C9A84C', borderLeft: '2px solid #C9A84C', borderTop: 'none', borderRight: 'none' },
            { bottom: '-1px', right: '-1px', borderBottom: '2px solid #C9A84C', borderRight: '2px solid #C9A84C', borderTop: 'none', borderLeft: 'none' },
          ].map((style, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                width: '24px',
                height: '24px',
                ...style,
              }}
            />
          ))}

          {/* Avatar */}
          <div
            style={{
              width: '160px',
              height: '160px',
              borderRadius: '50%',
              border: '2px solid rgba(201,168,76,0.4)',
              overflow: 'hidden',
              backgroundColor: 'rgba(201,168,76,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '40px',
              flexShrink: 0,
            }}
          >
            {gent.avatar_url ? (
              <img
                src={gent.avatar_url}
                alt={gent.display_name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '56px',
                  fontWeight: '700',
                  color: '#C9A84C',
                  lineHeight: '1',
                }}
              >
                {initials}
              </span>
            )}
          </div>

          {/* THE GENTS CHRONICLES label */}
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '11px',
              color: '#C9A84C',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              fontWeight: '600',
              marginBottom: '24px',
            }}
          >
            THE GENTS CHRONICLES
          </span>

          {/* Display name */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '60px',
              fontWeight: '700',
              color: '#F0EDE8',
              textAlign: 'center',
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
              margin: '0 0 16px 0',
            }}
          >
            {gent.display_name}
          </h1>

          {/* Alias */}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '20px',
              color: '#C9A84C',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              marginBottom: gent.bio ? '40px' : '48px',
            }}
          >
            {gent.alias}
          </p>

          {/* Bio */}
          {gent.bio && (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '20px',
                color: '#8C8680',
                textAlign: 'center',
                lineHeight: '1.65',
                maxWidth: '640px',
                marginBottom: '48px',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {gent.bio}
            </p>
          )}

          {/* GoldRule + BrandMark */}
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <GoldRule />
            <BrandMark size="md" />
          </div>
        </div>
      </div>
    )
  }
)

CallingCard.displayName = 'CallingCard'
