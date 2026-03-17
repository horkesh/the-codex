import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, GoldRule, BackgroundLayer, InsetFrame } from '@/export/templates/shared'

interface ToastCardProps {
  entry: Entry
  backgroundUrl?: string
}

export const ToastCard = React.forwardRef<HTMLDivElement, ToastCardProps>(
  ({ entry, backgroundUrl }, ref) => {
    const meta = entry.metadata as { spirit?: string; dram?: string; occasion?: string }

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
        <InsetFrame />

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
          justifyContent: 'flex-end',
          paddingLeft: '80px',
          paddingRight: '80px',
          position: 'relative',
          zIndex: 2,
        }}>
          {/* Spirit / occasion label */}
          <span style={{
            fontFamily: 'var(--font-body)',
            fontSize: '13px',
            color: '#C9A84C',
            letterSpacing: '0.4em',
            textTransform: 'uppercase',
            fontWeight: '600',
            marginBottom: '48px',
          }}>
            {meta.occasion ?? 'The Toast'}
          </span>

          {/* Title */}
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '76px',
            fontWeight: '700',
            color: '#F0EDE8',
            textAlign: 'center',
            lineHeight: '1.05',
            letterSpacing: '-0.02em',
            margin: '0 0 40px 0',
          }}>
            {entry.title}
          </h1>

          {/* Spirit / dram detail */}
          {(meta.spirit || meta.dram) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '36px' }}>
              <div style={{ width: '32px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.5 }} />
              <span style={{
                fontFamily: 'var(--font-body)',
                fontSize: '20px',
                color: '#C9A84C',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
              }}>
                {[meta.spirit, meta.dram].filter(Boolean).join(' · ')}
              </span>
              <div style={{ width: '32px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.5 }} />
            </div>
          )}

          {/* Location + date */}
          {entry.location && (
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '20px',
              color: backgroundUrl ? '#A09890' : '#8C8680',
              letterSpacing: '0.06em',
              marginBottom: '8px',
            }}>
              {entry.location}
            </p>
          )}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '15px',
            color: backgroundUrl ? '#A09890' : '#8C8680',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginBottom: '64px',
          }}>
            {formatDate(entry.date)}
          </p>

          {/* Ornamental divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '64px' }}>
            <div style={{ height: '1px', width: '80px', backgroundColor: '#C9A84C', opacity: 0.35 }} />
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.7)' }} />
            <div style={{ height: '1px', width: '80px', backgroundColor: '#C9A84C', opacity: 0.35 }} />
          </div>

          {/* Lore / toast text */}
          {entry.lore && (
            <p style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: '24px',
              color: backgroundUrl ? '#C8C0B0' : '#8C8680',
              textAlign: 'center',
              lineHeight: '1.7',
              maxWidth: '860px',
              display: '-webkit-box',
              WebkitLineClamp: 4,
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

ToastCard.displayName = 'ToastCard'
