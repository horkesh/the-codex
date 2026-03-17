import React from 'react'
import type { Entry } from '@/types/app'
import { BackgroundLayer } from './shared'
import { BrandMark } from './shared'
import { GoldRule } from './shared'

interface PassportPageExportProps {
  entry: Entry
  backgroundUrl?: string
}

export const PassportPageExport = React.forwardRef<HTMLDivElement, PassportPageExportProps>(
  ({ entry, backgroundUrl }, ref) => {
    const bgColor = backgroundUrl ? '#0d0b0f' : '#f0ede5'  // ivory when no AI bg
    const textColor = backgroundUrl ? '#f5f0e8' : '#1a1610'
    const mutedColor = backgroundUrl ? '#c8c0b0' : '#5a5248'
    const goldColor = '#c9a84c'

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1350px',
          backgroundColor: bgColor,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {backgroundUrl && <BackgroundLayer url={backgroundUrl} gradient="strong" />}

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '80px' }}>

          {/* Top: Brand + MISSION VISA label */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '48px' }}>
            <BrandMark />
            <div style={{
              border: `1px solid ${goldColor}`,
              padding: '6px 16px',
              fontFamily: 'Instrument Sans, Arial, sans-serif',
              fontSize: '10px',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              color: goldColor,
            }}>
              Mission Visa
            </div>
          </div>

          {/* Gold rule */}
          <GoldRule />

          {/* Country + City (large) */}
          <div style={{ marginTop: '48px', marginBottom: '8px' }}>
            <div style={{ fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '12px', letterSpacing: '0.3em', textTransform: 'uppercase', color: goldColor, marginBottom: '12px' }}>
              {entry.country || 'Unknown'}
            </div>
            <div style={{ fontFamily: 'Playfair Display, Georgia, serif', fontSize: '80px', fontWeight: 700, color: textColor, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {entry.city || entry.location || 'The Mission'}
            </div>
          </div>

          {/* Mission title */}
          <div style={{ marginTop: '16px', fontFamily: 'Playfair Display, Georgia, serif', fontSize: '28px', fontStyle: 'italic', color: mutedColor }}>
            {entry.title}
          </div>

          {/* Date */}
          <div style={{ marginTop: '24px', fontFamily: 'Instrument Sans, Arial, sans-serif', fontSize: '13px', letterSpacing: '0.2em', textTransform: 'uppercase', color: mutedColor }}>
            {(() => { const d = new Date(entry.date); const dd = String(d.getDate()).padStart(2, '0'); const mm = String(d.getMonth() + 1).padStart(2, '0'); return `${dd}/${mm}/${d.getFullYear()}` })()}
          </div>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Lore */}
          {entry.lore && (
            <div style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: '18px',
              fontStyle: 'italic',
              color: mutedColor,
              lineHeight: 1.6,
              marginBottom: '48px',
              display: '-webkit-box',
              WebkitLineClamp: 4,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {entry.lore}
            </div>
          )}

          {/* Gold rule */}
          <GoldRule />

          {/* Bottom: stamp placeholder row */}
          <div style={{ marginTop: '32px', display: 'flex', gap: '16px', alignItems: 'center' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                border: `1px solid ${goldColor}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: `${goldColor}10` }} />
              </div>
            ))}
            <div style={{ flex: 1 }} />
            <div style={{ fontFamily: 'JetBrains Mono, Courier New, monospace', fontSize: '10px', color: `${goldColor}60`, letterSpacing: '0.1em' }}>
              CODEX · {entry.country_code || '??'} · {entry.date.slice(0, 4)}
            </div>
          </div>
        </div>
      </div>
    )
  }
)
PassportPageExport.displayName = 'PassportPageExport'
