import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, BackgroundLayer, getOneliner } from '@/export/templates/shared'

interface MissionCarouselProps {
  entry: Entry
  backgroundUrl?: string
  rewardKeys?: Set<string>
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

function VeteranBadge({ rewardKeys, style }: { rewardKeys?: Set<string>; style?: React.CSSProperties }) {
  if (!rewardKeys?.has('veteran_stamp')) return null
  return (
    <div style={{ border: '1px solid rgba(201,168,76,0.5)', borderRadius: '2px', padding: '5px 10px', fontFamily: 'var(--font-body)', fontSize: '9px', letterSpacing: '0.4em', textTransform: 'uppercase' as const, color: 'rgba(201,168,76,0.7)', ...style }}>
      Veteran
    </div>
  )
}

/* ─── V1: Classic centred ───────────────────────────────────────────────── */

function V1({ entry, backgroundUrl, rewardKeys }: MissionCarouselProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...ROOT, alignItems: 'center', justifyContent: 'space-between' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <VeteranBadge rewardKeys={rewardKeys} style={{ position: 'absolute', bottom: '120px', right: '72px', zIndex: 3 }} />
      {!backgroundUrl && <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(201,168,76,0.03) 40px, rgba(201,168,76,0.03) 41px)', pointerEvents: 'none', zIndex: 1 }} />}
      <div style={{ paddingTop: '72px', display: 'flex', flexDirection: 'column', alignItems: 'center', ...Z2 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#C9A84C', letterSpacing: '0.35em', textTransform: 'uppercase', fontWeight: '600' }}>MISSION</span>
        <div style={{ height: '1px', width: '64px', backgroundColor: '#C9A84C', marginTop: '12px', opacity: 0.6 }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, justifyContent: 'center', ...Z2 }}>
        {entry.city && <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '72px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.05', letterSpacing: '-0.02em', margin: '0 0 16px 0', paddingLeft: '60px', paddingRight: '60px' }}>{entry.city}</h1>}
        {entry.country && <p style={{ fontFamily: 'var(--font-body)', fontSize: '26px', color: backgroundUrl ? '#A09890' : '#8C8680', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '40px' }}>{entry.country}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '48px' }}>{formatDate(entry.date)}</p>
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center', lineHeight: '1.6', maxWidth: '800px', paddingLeft: '80px', paddingRight: '80px' }}>{oneliner}</p>}
      </div>
      <div style={{ paddingBottom: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

/* ─── V2: Bold city hero ─────────────────────────────────────────────────── */

function V2({ entry, backgroundUrl, rewardKeys }: MissionCarouselProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...ROOT }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <VeteranBadge rewardKeys={rewardKeys} style={{ position: 'absolute', top: '72px', right: '80px', zIndex: 3 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '80px', ...Z2 }}>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '16px' }}>MISSION</p>
        {entry.city && <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '110px', fontWeight: '700', color: '#F0EDE8', lineHeight: '0.9', letterSpacing: '-0.04em', margin: '0 0 16px 0' }}>{entry.city}</h1>}
        {entry.country && <p style={{ fontFamily: 'var(--font-body)', fontSize: '22px', color: '#C9A84C', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '32px' }}>{entry.country}</p>}
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', lineHeight: '1.5', maxWidth: '800px', marginBottom: '24px' }}>{oneliner}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</p>
      </div>
      <div style={{ padding: '0 80px 64px', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

/* ─── V3: Stamp/passport feel ────────────────────────────────────────────── */

function V3({ entry, backgroundUrl }: MissionCarouselProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...ROOT, alignItems: 'center', justifyContent: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '80px', ...Z2 }}>
        <div style={{ width: '160px', height: '160px', borderRadius: '50%', border: '2px solid rgba(201,168,76,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: '700', color: '#C9A84C', lineHeight: '1' }}>{entry.city?.slice(0, 3).toUpperCase()}</span>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', color: '#8C8680', letterSpacing: '0.3em', textTransform: 'uppercase' }}>{entry.country_code || entry.country?.slice(0, 2).toUpperCase()}</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.1', margin: '0' }}>{entry.city}</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{entry.country}</p>
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', textAlign: 'center', lineHeight: '1.55', maxWidth: '700px' }}>{oneliner}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</p>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

/* ─── V4: Full-bleed title overlay ───────────────────────────────────────── */

function V4({ entry, backgroundUrl }: MissionCarouselProps) {
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...ROOT, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, opacity: 0.06 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '240px', fontWeight: '700', color: '#C9A84C', whiteSpace: 'nowrap', letterSpacing: '-0.04em' }}>{entry.city}</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', gap: '24px', ...Z2 }}>
        <div style={{ border: '1px solid rgba(201,168,76,0.3)', borderRadius: '4px', padding: '6px 16px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: '600' }}>MISSION</span>
        </div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '72px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.05', margin: '0' }}>{entry.city}</h1>
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '22px', color: '#C9A84C', letterSpacing: '0.1em' }}>{entry.country}</p>
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '24px', color: '#C8C0B0', textAlign: 'center', lineHeight: '1.5', maxWidth: '780px', marginTop: '16px' }}>"{oneliner}"</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '16px' }}>{formatDate(entry.date)}</p>
      </div>
      <div style={{ paddingBottom: '64px', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

export const MissionCarousel = React.forwardRef<HTMLDivElement, MissionCarouselProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) { case 2: return <V2 {...props} />; case 3: return <V3 {...props} />; case 4: return <V4 {...props} />; default: return <V1 {...props} /> }
    })()
    return <div ref={ref}>{inner}</div>
  }
)
MissionCarousel.displayName = 'MissionCarousel'
