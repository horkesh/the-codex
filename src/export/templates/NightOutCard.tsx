import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, GoldRule, BackgroundLayer } from '@/export/templates/shared'

interface NightOutCardProps {
  entry: Entry
  backgroundUrl?: string
}

export const NightOutCard = React.forwardRef<HTMLDivElement, NightOutCardProps>(
  ({ entry, backgroundUrl }, ref) => {
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
        }}
      >
        <BackgroundLayer url={backgroundUrl} gradient="strong" />

        {/* Top gold rule */}
        <div style={{ width: '100%', paddingTop: '56px', paddingLeft: '80px', paddingRight: '80px', position: 'relative', zIndex: 2 }}>
          <GoldRule thick />
        </div>

        {/* Main content */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingLeft: '80px',
          paddingRight: '80px',
          position: 'relative',
          zIndex: 2,
        }}>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '80px',
            fontWeight: '700',
            color: '#F0EDE8',
            textAlign: 'center',
            lineHeight: '1.05',
            letterSpacing: '-0.02em',
            margin: '0 0 36px 0',
          }}>
            {entry.title}
          </h1>

          {entry.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
              <div style={{ width: '24px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.6 }} />
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '24px',
                color: '#C9A84C',
                letterSpacing: '0.08em',
              }}>
                {entry.location}
              </span>
              <div style={{ width: '24px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.6 }} />
            </div>
          )}

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '16px',
            color: '#8C8680',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '64px',
          }}>
            {formatDate(entry.date)}
          </p>

          {/* Ornamental divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '64px' }}>
            <div style={{ height: '1px', width: '100px', backgroundColor: '#C9A84C', opacity: 0.35 }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.7)' }} />
            <div style={{ height: '1px', width: '100px', backgroundColor: '#C9A84C', opacity: 0.35 }} />
          </div>

          {entry.lore && (
            <p style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: '22px',
              color: backgroundUrl ? '#C8C0B0' : '#8C8680',
              textAlign: 'center',
              lineHeight: '1.7',
              maxWidth: '860px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {entry.lore}
            </p>
          )}
        </div>

        {/* Bottom */}
        <div style={{
          paddingBottom: '64px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          width: '100%',
          paddingLeft: '80px',
          paddingRight: '80px',
          position: 'relative',
          zIndex: 2,
        }}>
          <GoldRule />
          <BrandMark size="lg" />
        </div>
      </div>
    )
  }
)

NightOutCard.displayName = 'NightOutCard'
