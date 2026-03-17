import React from 'react'
import type { Entry } from '@/types/app'
import { BackgroundLayer } from './shared'
import { BrandMark } from './shared'
import { GoldRule } from './shared'

interface GatheringRecapProps {
  entry: Entry
  backgroundUrl?: string
  guestCount?: number
}

export const GatheringRecap = React.forwardRef<HTMLDivElement, GatheringRecapProps>(
  ({ entry, backgroundUrl, guestCount }, ref) => {
    const meta = entry.metadata as Record<string, unknown>
    const eventDate = meta?.event_date as string | undefined
    const location = (meta?.location as string) || entry.location || ''

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1350px',
          backgroundColor: '#0d0b0f',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {backgroundUrl && <BackgroundLayer url={backgroundUrl} gradient="strong" />}

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '80px' }}>

          {/* Top */}
          <BrandMark />

          <div style={{ marginTop: '48px' }}>
            <GoldRule />
          </div>

          {/* YOU WERE THERE label */}
          <div style={{ marginTop: '48px', fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#c9a84c' }}>
            You Were There
          </div>

          {/* Event title */}
          <div style={{ marginTop: '16px', fontFamily: 'Playfair Display, Georgia, serif', fontSize: '72px', fontWeight: 700, color: '#f5f0e8', lineHeight: 1.05, letterSpacing: '-0.02em' }}>
            {entry.title}
          </div>

          {/* Location + date */}
          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '14px', color: '#c8c0b0', letterSpacing: '0.05em' }}>
              {location}
            </span>
            {location && <span style={{ color: '#c9a84c60' }}>·</span>}
            <span style={{ fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '14px', color: '#c8c0b0', letterSpacing: '0.05em' }}>
              {(() => { const d = new Date(eventDate ?? entry.date); const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0'); return `${dd}/${mm}/${d.getFullYear()}` })()}
            </span>
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Lore */}
          {entry.lore && (
            <div style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: '22px',
              fontStyle: 'italic',
              color: '#c8c0b0',
              lineHeight: 1.65,
              marginBottom: '40px',
              display: '-webkit-box',
              WebkitLineClamp: 5,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {entry.lore}
            </div>
          )}

          {/* Stats row */}
          {guestCount !== undefined && (
            <div style={{ display: 'flex', gap: '40px', marginBottom: '40px' }}>
              <div>
                <div style={{ fontFamily: 'JetBrains Mono, Courier New, monospace', fontSize: '36px', fontWeight: 700, color: '#c9a84c' }}>
                  {guestCount}
                </div>
                <div style={{ fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a7268', marginTop: '4px' }}>
                  Guests
                </div>
              </div>
            </div>
          )}

          <GoldRule />

          <div style={{ marginTop: '24px', fontFamily: 'Playfair Display, Georgia, serif', fontSize: '13px', fontStyle: 'italic', color: '#7a7268', textAlign: 'center' }}>
            "Private. Deliberate. Legendary."
          </div>
        </div>
      </div>
    )
  }
)
GatheringRecap.displayName = 'GatheringRecap'
