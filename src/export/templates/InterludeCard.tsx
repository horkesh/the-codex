import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, BackgroundLayer, InsetFrame } from '@/export/templates/shared'

interface InterludeCardProps {
  entry: Entry
  backgroundUrl?: string
}

/**
 * Contemplative square pull-quote card (1080×1080).
 * Designed for interlude / reflection entries — no data, pure mood.
 */
export const InterludeCard = React.forwardRef<HTMLDivElement, InterludeCardProps>(
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
          justifyContent: 'flex-end',
          padding: '80px',
          boxSizing: 'border-box',
        }}
      >
        <BackgroundLayer url={backgroundUrl} gradient="strong" />
        <InsetFrame />

        {/* Corner marks */}
        <div style={{ position: 'absolute', top: '48px', left: '48px', width: '24px', height: '24px', borderTop: '1px solid rgba(201,168,76,0.5)', borderLeft: '1px solid rgba(201,168,76,0.5)', zIndex: 2 }} />
        <div style={{ position: 'absolute', top: '48px', right: '48px', width: '24px', height: '24px', borderTop: '1px solid rgba(201,168,76,0.5)', borderRight: '1px solid rgba(201,168,76,0.5)', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: '48px', left: '48px', width: '24px', height: '24px', borderBottom: '1px solid rgba(201,168,76,0.5)', borderLeft: '1px solid rgba(201,168,76,0.5)', zIndex: 2 }} />
        <div style={{ position: 'absolute', bottom: '48px', right: '48px', width: '24px', height: '24px', borderBottom: '1px solid rgba(201,168,76,0.5)', borderRight: '1px solid rgba(201,168,76,0.5)', zIndex: 2 }} />

        {/* Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
          maxWidth: '880px',
        }}>
          {/* Opening quote mark */}
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '120px',
            color: 'rgba(201,168,76,0.25)',
            lineHeight: '0.6',
            marginBottom: '40px',
            alignSelf: 'flex-start',
          }}>
            "
          </span>

          {/* Pull quote — lore first, fall back to title */}
          <p style={{
            fontFamily: 'var(--font-display)',
            fontStyle: 'italic',
            fontSize: '36px',
            color: '#F0EDE8',
            textAlign: 'center',
            lineHeight: '1.55',
            letterSpacing: '0.01em',
            marginBottom: '56px',
          }}>
            {entry.lore || entry.title}
          </p>

          {/* Thin gold rule */}
          <div style={{ width: '48px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.6, marginBottom: '32px' }} />

          {/* Title (if lore shown above) + date */}
          {entry.lore && (
            <p style={{
              fontFamily: 'var(--font-body)',
              fontSize: '18px',
              color: '#C9A84C',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              marginBottom: '8px',
              textAlign: 'center',
            }}>
              {entry.title}
            </p>
          )}

          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: backgroundUrl ? '#A09890' : '#8C8680',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            {formatDate(entry.date)}
          </p>
        </div>

        {/* BrandMark — bottom centre */}
        <div style={{ position: 'absolute', bottom: '64px', display: 'flex', justifyContent: 'center', width: '100%', zIndex: 2 }}>
          <BrandMark size="sm" />
        </div>
      </div>
    )
  }
)

InterludeCard.displayName = 'InterludeCard'
