import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, GoldRule, BackgroundLayer } from '@/export/templates/shared'

interface SteakVerdictProps {
  entry: Entry
  backgroundUrl?: string
}

export const SteakVerdict = React.forwardRef<HTMLDivElement, SteakVerdictProps>(
  ({ entry, backgroundUrl }, ref) => {
    const meta = entry.metadata as { cut?: string; score?: number; verdict?: string }

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1350px',
          backgroundColor: '#0D0B0F',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingLeft: '80px',
          paddingRight: '80px',
        }}
      >
        <BackgroundLayer url={backgroundUrl} gradient="strong" />

        {/* Top spacer + THE VERDICT label */}
        <div
          style={{
            paddingTop: '80px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: '#C9A84C',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              fontWeight: '600',
            }}
          >
            THE VERDICT
          </span>
          <div
            style={{
              height: '1px',
              width: '48px',
              backgroundColor: '#C9A84C',
              marginTop: '16px',
              opacity: 0.5,
            }}
          />
        </div>

        {/* Score — huge number */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {/* Score display */}
          {meta.score !== undefined && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                lineHeight: '1',
                marginBottom: '48px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '160px',
                  fontWeight: '700',
                  color: '#C9A84C',
                  lineHeight: '1',
                  letterSpacing: '-0.04em',
                }}
              >
                {meta.score}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '52px',
                  fontWeight: '400',
                  color: '#8C8680',
                  lineHeight: '1',
                  paddingBottom: '24px',
                  paddingLeft: '8px',
                }}
              >
                /10
              </span>
            </div>
          )}

          {/* Restaurant name */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '60px',
              fontWeight: '700',
              color: '#F0EDE8',
              textAlign: 'center',
              lineHeight: '1.1',
              letterSpacing: '-0.02em',
              margin: '0 0 24px 0',
            }}
          >
            {entry.title}
          </h1>

          {/* Cut type */}
          {meta.cut && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '18px',
                color: '#C9A84C',
                letterSpacing: '0.2em',
                textTransform: 'uppercase',
                marginBottom: '40px',
              }}
            >
              {meta.cut}
            </p>
          )}

          {/* Verdict text */}
          {meta.verdict && (
            <p
              style={{
                fontFamily: 'var(--font-display)',
                fontStyle: 'italic',
                fontSize: '24px',
                color: backgroundUrl ? '#C8C0B0' : '#8C8680',
                textAlign: 'center',
                lineHeight: '1.65',
                maxWidth: '840px',
                marginBottom: '48px',
                display: '-webkit-box',
                WebkitLineClamp: 4,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              "{meta.verdict}"
            </p>
          )}

          {/* Location + date */}
          {entry.location && (
            <p
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: '20px',
                color: backgroundUrl ? '#A09890' : '#8C8680',
                letterSpacing: '0.05em',
                marginBottom: '12px',
              }}
            >
              {entry.location}
            </p>
          )}
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: backgroundUrl ? '#A09890' : '#8C8680',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '56px',
            }}
          >
            {formatDate(entry.date)}
          </p>
        </div>

        {/* Bottom GoldRule + BrandMark */}
        <div
          style={{
            paddingBottom: '64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            width: '100%',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <GoldRule />
          <BrandMark size="lg" />
        </div>
      </div>
    )
  }
)

SteakVerdict.displayName = 'SteakVerdict'
