/**
 * Polaroid overlay — instant camera aesthetic.
 * White border frame with a wider bottom strip for caption area.
 * Warm, nostalgic feel. Good for casual group moments.
 */
import { FONT, COLOR } from '@/export/templates/shared/utils'
import type { OverlayProps } from './types'

const BORDER = 16
const BOTTOM = 88

export function PolaroidOverlay({ city, country, date, time, gents }: OverlayProps) {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      {/* White border — top, left, right */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: `${BORDER}px`,
        backgroundColor: 'rgba(245,240,232,0.92)',
      }} />
      <div style={{
        position: 'absolute',
        top: `${BORDER}px`,
        bottom: `${BOTTOM}px`,
        left: 0,
        width: `${BORDER}px`,
        backgroundColor: 'rgba(245,240,232,0.92)',
      }} />
      <div style={{
        position: 'absolute',
        top: `${BORDER}px`,
        bottom: `${BOTTOM}px`,
        right: 0,
        width: `${BORDER}px`,
        backgroundColor: 'rgba(245,240,232,0.92)',
      }} />

      {/* Wide bottom strip — caption area */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: `${BOTTOM}px`,
        backgroundColor: 'rgba(245,240,232,0.92)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '0 20px',
        zIndex: 11,
      }}>
        {/* City + date row */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
        }}>
          <span style={{
            fontFamily: FONT.display,
            fontSize: '24px',
            fontWeight: '600',
            color: COLOR.obsidian,
            fontStyle: 'italic',
          }}>
            {city || country || ''}
          </span>
          <span style={{
            fontFamily: FONT.body,
            fontSize: '13px',
            color: 'rgba(10,10,15,0.45)',
            letterSpacing: '0.1em',
          }}>
            {date}
          </span>
        </div>

        {/* Gent names + time */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginTop: '6px',
        }}>
          <span style={{
            fontFamily: FONT.body,
            fontSize: '13px',
            color: 'rgba(10,10,15,0.4)',
          }}>
            {gents.map((g) => g.display_name?.split(' ')[0]).filter(Boolean).join(', ')}
          </span>
          <span style={{
            fontFamily: FONT.mono,
            fontSize: '12px',
            color: 'rgba(10,10,15,0.3)',
          }}>
            {time}
          </span>
        </div>
      </div>

      {/* Subtle inner shadow on the photo area for depth */}
      <div style={{
        position: 'absolute',
        top: `${BORDER}px`,
        left: `${BORDER}px`,
        right: `${BORDER}px`,
        bottom: `${BOTTOM}px`,
        boxShadow: 'inset 0 0 12px rgba(0,0,0,0.15)',
        pointerEvents: 'none',
        zIndex: 11,
      }} />
    </div>
  )
}
