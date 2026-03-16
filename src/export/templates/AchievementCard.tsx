import React from 'react'
import { BrandMark, GoldRule } from '@/export/templates/shared'

interface AchievementCardProps {
  name: string
  description: string
  earnedBy: string
  earnedAt: string
}

/**
 * Achievement sharing card (1080x1350).
 * Obsidian background, gold achievement badge, name, description, earned-by line.
 */
export const AchievementCard = React.forwardRef<HTMLDivElement, AchievementCardProps>(
  ({ name, description, earnedBy, earnedAt }, ref) => {
    // Format date
    const dateLabel = (() => {
      try {
        const d = new Date(earnedAt)
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      } catch {
        return earnedAt
      }
    })()

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1350px',
          backgroundColor: '#0a0a0f',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
          boxSizing: 'border-box',
        }}
      >
        {/* Corner marks */}
        <div style={{ position: 'absolute', top: '48px', left: '48px', width: '24px', height: '24px', borderTop: '1px solid rgba(201,168,76,0.5)', borderLeft: '1px solid rgba(201,168,76,0.5)' }} />
        <div style={{ position: 'absolute', top: '48px', right: '48px', width: '24px', height: '24px', borderTop: '1px solid rgba(201,168,76,0.5)', borderRight: '1px solid rgba(201,168,76,0.5)' }} />
        <div style={{ position: 'absolute', bottom: '48px', left: '48px', width: '24px', height: '24px', borderBottom: '1px solid rgba(201,168,76,0.5)', borderLeft: '1px solid rgba(201,168,76,0.5)' }} />
        <div style={{ position: 'absolute', bottom: '48px', right: '48px', width: '24px', height: '24px', borderBottom: '1px solid rgba(201,168,76,0.5)', borderRight: '1px solid rgba(201,168,76,0.5)' }} />

        {/* Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: 2,
          maxWidth: '880px',
        }}>
          {/* Achievement badge — gold diamond shape */}
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '16px',
            transform: 'rotate(45deg)',
            border: '2px solid rgba(201,168,76,0.6)',
            background: 'linear-gradient(135deg, rgba(201,168,76,0.12) 0%, rgba(201,168,76,0.04) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '56px',
          }}>
            {/* Star/achievement icon inside diamond */}
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#C9A84C"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: 'rotate(-45deg)' }}
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>

          {/* "ACHIEVEMENT UNLOCKED" label */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: '#C9A84C',
            letterSpacing: '0.35em',
            textTransform: 'uppercase',
            marginBottom: '24px',
            fontWeight: 600,
          }}>
            Achievement Unlocked
          </p>

          {/* Achievement name */}
          <p style={{
            fontFamily: 'var(--font-display)',
            fontSize: '60px',
            color: '#f5f0e8',
            textAlign: 'center',
            lineHeight: '1.15',
            letterSpacing: '0.01em',
            marginBottom: '24px',
            fontWeight: 700,
          }}>
            {name}
          </p>

          {/* Description */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '24px',
            color: '#8C8680',
            textAlign: 'center',
            lineHeight: '1.5',
            marginBottom: '48px',
            maxWidth: '720px',
          }}>
            {description}
          </p>

          {/* Gold rule */}
          <div style={{ width: '360px', marginBottom: '48px' }}>
            <GoldRule />
          </div>

          {/* Earned by line */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '18px',
            color: '#C9A84C',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: '8px',
          }}>
            Earned by: {earnedBy}
          </p>

          {/* Date */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: '#6B6460',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
          }}>
            {dateLabel}
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

AchievementCard.displayName = 'AchievementCard'
