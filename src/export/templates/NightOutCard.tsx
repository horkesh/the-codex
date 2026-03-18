import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, GoldRule, BackgroundLayer, InsetFrame, getOneliner, VARIANT_INNER } from '@/export/templates/shared'

interface NightOutCardProps {
  entry: Entry
  backgroundUrl?: string
  variant?: 1 | 2 | 3 | 4
}

const ROOT: React.CSSProperties = {
  width: '1080px',
  height: '1350px',
  backgroundColor: '#0D0B0F',
  fontFamily: 'var(--font-body)',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}

const Z2: React.CSSProperties = { position: 'relative', zIndex: 2 }

/* ─── Variant 1: Classic centred ─────────────────────────────────────────── */

function V1({ entry, backgroundUrl }: NightOutCardProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Top: gold rule + title + location + date */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '56px', paddingLeft: '80px', paddingRight: '80px', width: '100%', ...Z2 }}>
        <div style={{ width: '100%', marginBottom: '48px' }}>
          <GoldRule thick />
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '80px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.05', letterSpacing: '-0.02em', margin: '0 0 36px 0' }}>{entry.title}</h1>
        {entry.location && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '32px' }}>
            <div style={{ width: '24px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.6 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '24px', color: '#C9A84C', letterSpacing: '0.08em' }}>{entry.location}</span>
            <div style={{ width: '24px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.6 }} />
          </div>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: '#8C8680', letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>{formatDate(entry.date)}</p>
      </div>
      {/* Middle spacer + decorative divider + oneliner at bottom */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: '80px', paddingRight: '80px', ...Z2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '64px' }}>
          <div style={{ height: '1px', width: '100px', backgroundColor: '#C9A84C', opacity: 0.35 }} />
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.7)' }} />
          <div style={{ height: '1px', width: '100px', backgroundColor: '#C9A84C', opacity: 0.35 }} />
        </div>
        {oneliner && (
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '26px', color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center', lineHeight: '1.6', maxWidth: '860px' }}>{oneliner}</p>
        )}
      </div>
      <div style={{ paddingBottom: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', paddingLeft: '80px', paddingRight: '80px', ...Z2 }}>
        <GoldRule />
        <BrandMark size="lg" />
      </div>
    </div>
  )
}

/* ─── Variant 2: Bold left-aligned ───────────────────────────────────────── */

function V2({ entry, backgroundUrl }: NightOutCardProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Top label */}
      <div style={{ padding: '72px 80px 0', ...Z2 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: '600' }}>NIGHT OUT</p>
      </div>
      {/* Bottom content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 80px', ...Z2 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '96px', fontWeight: '700', color: '#F0EDE8', lineHeight: '0.95', letterSpacing: '-0.03em', margin: '0 0 32px 0' }}>{entry.title}</h1>
        {oneliner && (
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '24px', color: '#C8C0B0', lineHeight: '1.5', maxWidth: '800px', marginBottom: '40px' }}>{oneliner}</p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {entry.location && <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#C9A84C', letterSpacing: '0.05em' }}>{entry.location}</span>}
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</span>
        </div>
      </div>
      <div style={{ padding: '0 80px 64px', display: 'flex', justifyContent: 'flex-start', ...Z2 }}>
        <BrandMark size="md" />
      </div>
    </div>
  )
}

/* ─── Variant 3: Minimal quote-forward ───────────────────────────────────── */

function V3({ entry, backgroundUrl }: NightOutCardProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Top: quote */}
      {oneliner && (
        <div style={{ paddingTop: '80px', paddingLeft: '80px', paddingRight: '80px', ...Z2 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '40px', fontWeight: '400', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.45', maxWidth: '800px' }}>"{oneliner}"</p>
        </div>
      )}
      {/* Bottom: attribution */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 80px 80px', gap: '48px', ...Z2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ height: '1px', width: '60px', backgroundColor: '#C9A84C', opacity: 0.5 }} />
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#C9A84C', fontWeight: '600' }}>{entry.title}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</span>
          </div>
          <div style={{ height: '1px', width: '60px', backgroundColor: '#C9A84C', opacity: 0.5 }} />
        </div>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

/* ─── Variant 4: Split — type badge top, big date ────────────────────────── */

function V4({ entry, backgroundUrl }: NightOutCardProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Top label */}
      <div style={{ padding: '72px 80px 0', ...Z2 }}>
        <div style={{ border: '1px solid rgba(201,168,76,0.4)', borderRadius: '4px', padding: '6px 16px', display: 'inline-block' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: '600' }}>NIGHT OUT</span>
        </div>
      </div>
      {/* Content — bottom aligned */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 80px', ...Z2 }}>
        <p style={{ fontFamily: 'var(--font-display)', fontSize: '120px', fontWeight: '700', color: 'rgba(201,168,76,0.15)', lineHeight: '1', letterSpacing: '-0.04em', marginBottom: '24px' }}>
          {new Date(entry.date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()}
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.05', margin: '0 0 24px 0' }}>{entry.title}</h1>
        {entry.location && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#C9A84C', letterSpacing: '0.1em', marginBottom: '32px' }}>{entry.location}</span>
        )}
        {oneliner && (
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center', lineHeight: '1.6', maxWidth: '780px' }}>{oneliner}</p>
        )}
      </div>
      <div style={{ padding: '0 80px 64px', display: 'flex', justifyContent: 'center', ...Z2 }}>
        <BrandMark size="md" />
      </div>
    </div>
  )
}

/* ─── Export ──────────────────────────────────────────────────────────────── */

export const NightOutCard = React.forwardRef<HTMLDivElement, NightOutCardProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) {
        case 2: return <V2 {...props} />
        case 3: return <V3 {...props} />
        case 4: return <V4 {...props} />
        default: return <V1 {...props} />
      }
    })()
    return <div ref={ref} style={ROOT}><InsetFrame />{inner}</div>
  }
)

NightOutCard.displayName = 'NightOutCard'
