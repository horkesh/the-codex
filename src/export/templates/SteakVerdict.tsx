import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, GoldRule, BackgroundLayer, getOneliner, VARIANT_INNER } from '@/export/templates/shared'

interface SteakVerdictProps {
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

function ConnoisseurBadge({ rewardKeys, style }: { rewardKeys?: Set<string>; style?: React.CSSProperties }) {
  if (!rewardKeys?.has('connoisseur_badge')) return null
  return (
    <div style={{ border: '1px solid #C9A84C', borderRadius: '4px', padding: '6px 14px', fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.35em', textTransform: 'uppercase' as const, color: '#C9A84C', ...style }}>Connoisseur</div>
  )
}

function getMeta(entry: Entry) {
  const m = entry.metadata as Record<string, unknown>
  return { cut: m?.cut as string | undefined, score: m?.score as number | undefined, verdict: m?.verdict as string | undefined }
}

/* ─── V1: Classic centred verdict ────────────────────────────────────────── */

function V1({ entry, backgroundUrl, rewardKeys }: SteakVerdictProps) {
  const { cut, score, verdict } = getMeta(entry)
  const oneliner = getOneliner(entry)
  const display = oneliner || (verdict ? `"${verdict}"` : null)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center', paddingLeft: '80px', paddingRight: '80px' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <ConnoisseurBadge rewardKeys={rewardKeys} style={{ position: 'absolute', top: '72px', right: '80px', zIndex: 3 }} />
      <div style={{ paddingTop: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', ...Z2 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: '600' }}>THE VERDICT</span>
        <div style={{ height: '1px', width: '48px', backgroundColor: '#C9A84C', marginTop: '16px', opacity: 0.5 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', ...Z2 }}>
        {score !== undefined && (
          <div style={{ display: 'flex', alignItems: 'flex-end', lineHeight: '1', marginBottom: '48px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '160px', fontWeight: '700', color: '#C9A84C', lineHeight: '1', letterSpacing: '-0.04em' }}>{score}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '52px', fontWeight: '400', color: '#8C8680', lineHeight: '1', paddingBottom: '24px', paddingLeft: '8px' }}>/10</span>
          </div>
        )}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '60px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.1', letterSpacing: '-0.02em', margin: '0 0 24px 0' }}>{entry.title}</h1>
        {cut && <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '40px' }}>{cut}</p>}
        {display && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '24px', color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center', lineHeight: '1.55', maxWidth: '840px', marginBottom: '48px' }}>{display}</p>}
        {entry.location && <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: backgroundUrl ? '#A09890' : '#8C8680', letterSpacing: '0.05em', marginBottom: '12px' }}>{entry.location}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</p>
      </div>
      <div style={{ paddingBottom: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', ...Z2 }}>
        <GoldRule /><BrandMark size="lg" />
      </div>
    </div>
  )
}

/* ─── V2: Score hero ─────────────────────────────────────────────────────── */

function V2({ entry, backgroundUrl, rewardKeys }: SteakVerdictProps) {
  const { cut, score } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <ConnoisseurBadge rewardKeys={rewardKeys} style={{ position: 'absolute', top: '72px', right: '80px', zIndex: 3 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '80px', ...Z2 }}>
        {score !== undefined && <p style={{ fontFamily: 'var(--font-display)', fontSize: '200px', fontWeight: '700', color: 'rgba(201,168,76,0.12)', lineHeight: '0.85', letterSpacing: '-0.04em' }}>{score}</p>}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '72px', fontWeight: '700', color: '#F0EDE8', lineHeight: '1', margin: '0 0 16px 0' }}>{entry.title}</h1>
        {cut && <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>{cut}</p>}
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', lineHeight: '1.5', maxWidth: '800px', marginBottom: '24px' }}>{oneliner}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{[entry.location, formatDate(entry.date)].filter(Boolean).join(' · ')}</p>
      </div>
      <div style={{ padding: '0 80px 64px', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

/* ─── V3: Minimal score card ─────────────────────────────────────────────── */

function V3({ entry, backgroundUrl }: SteakVerdictProps) {
  const { cut, score } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center', justifyContent: 'flex-end' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px', padding: '80px', ...Z2 }}>
        {score !== undefined && (
          <div style={{ width: '180px', height: '180px', borderRadius: '50%', border: '3px solid #C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '80px', fontWeight: '700', color: '#C9A84C', lineHeight: '1' }}>{score}</span>
          </div>
        )}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.1', margin: '0' }}>{entry.title}</h1>
        {cut && <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase' }}>{cut}</p>}
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', textAlign: 'center', lineHeight: '1.5', maxWidth: '700px' }}>"{oneliner}"</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{[entry.location, formatDate(entry.date)].filter(Boolean).join(' · ')}</p>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

/* ─── V4: Cut-forward layout ─────────────────────────────────────────────── */

function V4({ entry, backgroundUrl }: SteakVerdictProps) {
  const { cut, score } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <div style={{ padding: '72px 80px 0', ...Z2 }}>
        <div style={{ border: '1px solid rgba(201,168,76,0.4)', borderRadius: '4px', padding: '6px 16px', display: 'inline-block' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: '600' }}>THE TABLE</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 80px', gap: '20px', ...Z2 }}>
        {cut && <p style={{ fontFamily: 'var(--font-display)', fontSize: '100px', fontWeight: '700', color: 'rgba(201,168,76,0.12)', lineHeight: '1', textTransform: 'uppercase' }}>{cut}</p>}
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '56px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.1', margin: '0' }}>{entry.title}</h1>
        {score !== undefined && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '48px', fontWeight: '700', color: '#C9A84C' }}>{score}</span>
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#8C8680' }}>/10</span>
          </div>
        )}
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', textAlign: 'center', lineHeight: '1.5', maxWidth: '780px' }}>{oneliner}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</p>
      </div>
      <div style={{ padding: '0 80px 64px', display: 'flex', justifyContent: 'center', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

export const SteakVerdict = React.forwardRef<HTMLDivElement, SteakVerdictProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) { case 2: return <V2 {...props} />; case 3: return <V3 {...props} />; case 4: return <V4 {...props} />; default: return <V1 {...props} /> }
    })()
    return <div ref={ref} style={ROOT}>{inner}</div>
  }
)
SteakVerdict.displayName = 'SteakVerdict'
