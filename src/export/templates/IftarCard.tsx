import React from 'react'
import type { Gent } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, BackgroundLayer, InsetFrame, ParticipantRow, getOneliner, VARIANT_INNER, FONT, COLOR } from '@/export/templates/shared'

interface IftarCardProps {
  entry: { title: string; date: string; location: string | null; lore: string | null; metadata: Record<string, unknown>; participants?: Gent[] }
  backgroundUrl?: string
  variant?: 1 | 2 | 3 | 4
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

// Warm amber accent for Iftar (slightly warmer than standard gold)
const IFTAR_GOLD = '#D4A843'

/** Text outline for legibility over photos */
const TEXT_OUTLINE: React.CSSProperties = {
  textShadow: '-1px -1px 0 rgba(0,0,0,0.6), 1px -1px 0 rgba(0,0,0,0.6), -1px 1px 0 rgba(0,0,0,0.6), 1px 1px 0 rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.8), 0 2px 6px rgba(0,0,0,0.5)',
}
const IFTAR_DIM = 'rgba(212,168,67,0.15)'

/** SVG crescent + star — subtle, geometric */
function CrescentMark({ size = 48, color = IFTAR_GOLD, opacity = 0.3, style }: { size?: number; color?: string; opacity?: number; style?: React.CSSProperties }) {
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

/** Geometric border pattern — interlocking stars, subtle */
function GeometricBorder({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 1,
      border: '3px solid transparent',
      borderImage: `repeating-linear-gradient(45deg, ${IFTAR_DIM} 0px, transparent 1px, transparent 8px, ${IFTAR_DIM} 9px) 3`,
      ...style,
    }} />
  )
}

/* ─── V1: Centred — crescent above, title, oneliner, date ────────────── */

function V1({ entry, backgroundUrl }: IftarCardProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center', padding: '0 80px' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GeometricBorder />
      <div style={{ paddingTop: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center', ...Z2 }}>
        <CrescentMark size={56} opacity={0.4} />
        <span style={{ fontFamily: FONT.body, fontSize: '11px', color: IFTAR_GOLD, letterSpacing: '0.5em', textTransform: 'uppercase', fontWeight: '600', marginTop: '32px' }}>Iftar</span>
        <div style={{ height: '1px', width: '48px', backgroundColor: IFTAR_GOLD, marginTop: '16px', opacity: 0.4 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '24px', ...Z2 }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '56px', fontWeight: '700', color: COLOR.ivory, textAlign: 'center', lineHeight: '1.1', margin: 0, ...TEXT_OUTLINE }}>{entry.title}</h1>
        {oneliner && <p style={{ fontFamily: FONT.display, fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', textAlign: 'center', lineHeight: '1.55', maxWidth: '820px', ...TEXT_OUTLINE }}>{oneliner}</p>}
        {entry.location && <p style={{ fontFamily: FONT.body, fontSize: '18px', color: '#A09890', letterSpacing: '0.05em', ...TEXT_OUTLINE }}>{entry.location}</p>}
        <p style={{ fontFamily: FONT.body, fontSize: '14px', color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase', ...TEXT_OUTLINE }}>{formatDate(entry.date)}</p>
      </div>
      <div style={{ paddingBottom: '64px', paddingTop: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', ...Z2 }}>
        {entry.participants && entry.participants.length > 0 && <ParticipantRow participants={entry.participants} />}
        <BrandMark size="md" />
      </div>
    </div>
  )
}

/* ─── V2: Spread — large title, warm geometric background accent ─────── */

function V2({ entry, backgroundUrl }: IftarCardProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GeometricBorder />
      {/* Top: crescent watermark */}
      <div style={{ position: 'absolute', top: '60px', right: '72px', ...Z2 }}>
        <CrescentMark size={80} opacity={0.08} />
      </div>
      <div style={{ padding: '72px 80px 0', ...Z2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CrescentMark size={20} opacity={0.6} />
          <span style={{ fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.4em', textTransform: 'uppercase', color: IFTAR_GOLD, fontWeight: '600' }}>The Table — Iftar</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 80px', ...Z2 }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '68px', fontWeight: '700', color: COLOR.ivory, lineHeight: '1.05', margin: '0 0 20px 0', ...TEXT_OUTLINE }}>{entry.title}</h1>
        {oneliner && <p style={{ fontFamily: FONT.display, fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', lineHeight: '1.5', maxWidth: '800px', marginBottom: '24px', ...TEXT_OUTLINE }}>{oneliner}</p>}
        <p style={{ fontFamily: FONT.body, fontSize: '14px', color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase', ...TEXT_OUTLINE }}>{[entry.location, formatDate(entry.date)].filter(Boolean).join(' · ')}</p>
        {entry.participants && entry.participants.length > 0 && (
          <div style={{ marginTop: '32px' }}><ParticipantRow participants={entry.participants} /></div>
        )}
      </div>
      <div style={{ padding: '0 80px 64px', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

/* ─── V3: Contemplative — centred, quiet, generous whitespace ────────── */

function V3({ entry, backgroundUrl }: IftarCardProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GeometricBorder />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 80px', gap: '28px', ...Z2 }}>
        <CrescentMark size={40} opacity={0.25} />
        <h1 style={{ fontFamily: FONT.display, fontSize: '50px', fontWeight: '700', color: COLOR.ivory, textAlign: 'center', lineHeight: '1.15', margin: 0, ...TEXT_OUTLINE }}>{entry.title}</h1>
        {oneliner && <p style={{ fontFamily: FONT.display, fontStyle: 'italic', fontSize: '24px', color: '#B0A898', textAlign: 'center', lineHeight: '1.55', maxWidth: '740px', ...TEXT_OUTLINE }}>"{oneliner}"</p>}
        <div style={{ height: '1px', width: '64px', backgroundColor: IFTAR_GOLD, opacity: 0.3 }} />
        <p style={{ fontFamily: FONT.body, fontSize: '13px', color: '#8C8680', letterSpacing: '0.2em', textTransform: 'uppercase', ...TEXT_OUTLINE }}>{[entry.location, formatDate(entry.date)].filter(Boolean).join(' · ')}</p>
      </div>
      <div style={{ paddingBottom: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', ...Z2 }}>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

/* ─── V4: Gathering — warm, communal feel, participants prominent ────── */

function V4({ entry, backgroundUrl }: IftarCardProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GeometricBorder />
      {/* Top decorative band */}
      <div style={{ padding: '64px 80px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', ...Z2 }}>
        <div>
          <span style={{ fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.4em', textTransform: 'uppercase', color: IFTAR_GOLD, fontWeight: '600' }}>Iftar</span>
          <p style={{ fontFamily: FONT.body, fontSize: '14px', color: '#8C8680', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '8px', ...TEXT_OUTLINE }}>{formatDate(entry.date)}</p>
        </div>
        <CrescentMark size={36} opacity={0.35} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 80px', ...Z2 }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '60px', fontWeight: '700', color: COLOR.ivory, lineHeight: '1.05', margin: '0 0 16px 0', ...TEXT_OUTLINE }}>{entry.title}</h1>
        {entry.location && <p style={{ fontFamily: FONT.body, fontSize: '20px', color: '#A09890', letterSpacing: '0.04em', marginBottom: '20px', ...TEXT_OUTLINE }}>{entry.location}</p>}
        {oneliner && <p style={{ fontFamily: FONT.display, fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', lineHeight: '1.5', maxWidth: '800px', marginBottom: '32px', ...TEXT_OUTLINE }}>{oneliner}</p>}
        {entry.participants && entry.participants.length > 0 && <ParticipantRow participants={entry.participants} />}
      </div>
      <div style={{ padding: '40px 80px 64px', display: 'flex', justifyContent: 'center', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

export const IftarCard = React.forwardRef<HTMLDivElement, IftarCardProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) { case 2: return <V2 {...props} />; case 3: return <V3 {...props} />; case 4: return <V4 {...props} />; default: return <V1 {...props} /> }
    })()
    return <div ref={ref} style={ROOT}><InsetFrame />{inner}</div>
  }
)
IftarCard.displayName = 'IftarCard'
