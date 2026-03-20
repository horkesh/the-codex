import React from 'react'
import type { Gent } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, BackgroundLayer, InsetFrame, ParticipantRow, VARIANT_INNER, FONT, COLOR } from '@/export/templates/shared'

interface EidCardProps {
  entry: { title: string; date: string; location: string | null; lore: string | null; metadata: Record<string, unknown>; participants?: Gent[] }
  backgroundUrl?: string
}

const ROOT: React.CSSProperties = {
  width: '1080px',
  height: '1350px',
  backgroundColor: '#0D0B0F',
  fontFamily: FONT.body,
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}

const Z2: React.CSSProperties = { position: 'relative', zIndex: 2 }

const EID_GOLD = '#D4A843'
const EID_DIM = 'rgba(212,168,67,0.15)'

/** SVG crescent + star */
function CrescentMark({ size = 48, color = EID_GOLD, opacity = 0.3, style }: { size?: number; color?: string; opacity?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ opacity, ...style }}>
      <path
        d="M28 6C17.5 6 9 14.5 9 25s8.5 19 19 19c4.2 0 8.1-1.4 11.2-3.7C35.5 43.5 30 46 24 46 12.4 46 3 36.6 3 25S12.4 4 24 4c6 0 11.5 2.5 15.2 6.7C36.1 7.4 32.2 6 28 6z"
        fill={color}
      />
      <circle cx="38" cy="14" r="3" fill={color} />
    </svg>
  )
}

/** Geometric border pattern */
function GeometricBorder() {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
      border: '3px solid transparent',
      borderImage: `repeating-linear-gradient(45deg, ${EID_DIM} 0px, transparent 1px, transparent 8px, ${EID_DIM} 9px) 3`,
    }} />
  )
}

function EidInner({ entry, backgroundUrl }: EidCardProps) {
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center', padding: '0 80px' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GeometricBorder />

      {/* Top: crescent + greeting */}
      <div style={{ paddingTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px', ...Z2 }}>
        <CrescentMark size={72} opacity={0.45} />
        <span style={{ fontFamily: FONT.body, fontSize: '12px', color: EID_GOLD, letterSpacing: '0.5em', textTransform: 'uppercase', fontWeight: '600' }}>Eid Mubarak</span>
        <h1 style={{
          fontFamily: FONT.display, fontSize: '52px', fontWeight: '700', color: COLOR.ivory,
          textAlign: 'center', lineHeight: '1.15', margin: 0, maxWidth: '860px',
        }}>
          Bajram serif mubarek olsun
        </h1>
        <div style={{ height: '1px', width: '48px', backgroundColor: EID_GOLD, opacity: 0.3 }} />
        {entry.title && (
          <p style={{ fontFamily: FONT.display, fontStyle: 'italic', fontSize: '24px', color: '#B0A898', textAlign: 'center', lineHeight: '1.4' }}>
            {entry.title}
          </p>
        )}
        {entry.location && (
          <p style={{ fontFamily: FONT.body, fontSize: '18px', color: '#A09890', letterSpacing: '0.05em' }}>{entry.location}</p>
        )}
        <p style={{ fontFamily: FONT.body, fontSize: '14px', color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</p>
      </div>

      {/* Spacer */}
      <div style={{ flex: 1, ...Z2 }} />

      {/* Bottom: participants + brand */}
      <div style={{ paddingBottom: '64px', paddingTop: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', ...Z2 }}>
        {entry.participants && entry.participants.length > 0 && <ParticipantRow participants={entry.participants} />}
        <BrandMark size="md" />
      </div>
    </div>
  )
}

export const EidCard = React.forwardRef<HTMLDivElement, EidCardProps>(
  (props, ref) => (
    <div ref={ref} style={ROOT}><InsetFrame /><EidInner {...props} /></div>
  )
)
EidCard.displayName = 'EidCard'
