import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, GoldRule, BackgroundLayer, InsetFrame, getOneliner, VARIANT_INNER } from '@/export/templates/shared'

interface ToastCardProps {
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

function getMeta(entry: Entry) {
  const m = entry.metadata as Record<string, unknown>
  return { spirit: m?.spirit as string | undefined, dram: m?.dram as string | undefined, occasion: m?.occasion as string | undefined }
}

/* ─── V1: Classic centred toast ────────────────────────────────────────── */

function V1({ entry, backgroundUrl }: ToastCardProps) {
  const { spirit, dram, occasion } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <div style={{ paddingTop: '72px', ...Z2, width: '100%', paddingLeft: '80px', paddingRight: '80px' }}>
        <GoldRule thick />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '16px', paddingLeft: '80px', paddingRight: '80px', ...Z2 }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: '600', marginBottom: '48px' }}>
          {occasion ?? 'The Toast'}
        </span>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '76px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.05', letterSpacing: '-0.02em', margin: '0 0 40px 0' }}>
          {entry.title}
        </h1>
        {(spirit || dram) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '32px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.5 }} />
            <span style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: '#C9A84C', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              {[spirit, dram].filter(Boolean).join(' · ')}
            </span>
            <div style={{ width: '32px', height: '1px', backgroundColor: '#C9A84C', opacity: 0.5 }} />
          </div>
        )}
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingLeft: '80px', paddingRight: '80px', ...Z2 }}>
        {entry.location && <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: backgroundUrl ? '#A09890' : '#8C8680', letterSpacing: '0.06em', marginBottom: '8px' }}>{entry.location}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: backgroundUrl ? '#A09890' : '#8C8680', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '64px' }}>{formatDate(entry.date)}</p>
        {oneliner && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
              <div style={{ height: '1px', width: '80px', backgroundColor: '#C9A84C', opacity: 0.35 }} />
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', border: '1px solid rgba(201,168,76,0.7)' }} />
              <div style={{ height: '1px', width: '80px', backgroundColor: '#C9A84C', opacity: 0.35 }} />
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '24px', color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center', lineHeight: '1.7', maxWidth: '860px', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {oneliner}
            </p>
          </>
        )}
      </div>
      <div style={{ paddingBottom: '64px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', paddingLeft: '80px', paddingRight: '80px', ...Z2 }}>
        <GoldRule /><BrandMark size="lg" />
      </div>
    </div>
  )
}

/* ─── V2: Cocktail menu — spirit hero ──────────────────────────────────── */

function V2({ entry, backgroundUrl }: ToastCardProps) {
  const { spirit, dram, occasion } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <div style={{ padding: '72px 80px 0', ...Z2 }}>
        <div style={{ border: '1px solid rgba(201,168,76,0.4)', borderRadius: '4px', padding: '6px 16px', display: 'inline-block' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: '600' }}>
            {occasion ?? 'The Toast'}
          </span>
        </div>
      </div>
      {/* Ghost spirit watermark */}
      {spirit && (
        <div style={{ padding: '24px 80px 0', ...Z2 }}>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '140px', fontWeight: '700', color: 'rgba(201,168,76,0.08)', lineHeight: '0.9', margin: 0, textTransform: 'uppercase' }}>{spirit}</p>
        </div>
      )}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 80px', ...Z2 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '72px', fontWeight: '700', color: '#F0EDE8', lineHeight: '1', margin: '0 0 16px 0' }}>{entry.title}</h1>
        {dram && <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '24px' }}>{dram}</p>}
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', lineHeight: '1.5', maxWidth: '800px', marginBottom: '24px' }}>{oneliner}</p>}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>{[entry.location, formatDate(entry.date)].filter(Boolean).join(' · ')}</p>
      </div>
      <div style={{ padding: '0 80px 64px', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

/* ─── V3: Quote-forward ────────────────────────────────────────────────── */

function V3({ entry, backgroundUrl }: ToastCardProps) {
  const { spirit, dram } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Large quote marks */}
      <div style={{ paddingTop: '120px', ...Z2 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '200px', color: 'rgba(201,168,76,0.12)', lineHeight: '0.5' }}>&ldquo;</span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '0 100px', gap: '40px', ...Z2 }}>
        {oneliner ? (
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '36px', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.5', maxWidth: '800px' }}>
            {oneliner}
          </p>
        ) : entry.lore ? (
          <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '28px', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.5', maxWidth: '800px', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {entry.lore}
          </p>
        ) : null}
        <GoldRule />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '42px', fontWeight: '700', color: '#C9A84C', textAlign: 'center', lineHeight: '1.1', margin: 0 }}>{entry.title}</h1>
        {(spirit || dram) && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '16px', color: '#8C8680', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
            {[spirit, dram].filter(Boolean).join(' · ')}
          </p>
        )}
        <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{[entry.location, formatDate(entry.date)].filter(Boolean).join(' · ')}</p>
      </div>
      <div style={{ paddingBottom: '64px', ...Z2 }}><BrandMark size="sm" /></div>
    </div>
  )
}

/* ─── V4: Minimal date stamp ───────────────────────────────────────────── */

function V4({ entry, backgroundUrl }: ToastCardProps) {
  const { spirit, dram, occasion } = getMeta(entry)
  const oneliner = getOneliner(entry)
  const d = new Date(entry.date + 'T12:00:00Z')
  const day = d.toLocaleDateString('en-GB', { day: '2-digit', timeZone: 'UTC' })
  const month = d.toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' }).toUpperCase()
  const year = d.toLocaleDateString('en-GB', { year: 'numeric', timeZone: 'UTC' })
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Top-left date block */}
      <div style={{ padding: '72px 80px 0', display: 'flex', alignItems: 'flex-start', gap: '24px', ...Z2 }}>
        <div style={{ borderRight: '2px solid rgba(201,168,76,0.4)', paddingRight: '24px' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '80px', fontWeight: '700', color: '#C9A84C', lineHeight: '0.9' }}>{day}</div>
          <div style={{ fontFamily: 'var(--font-body)', fontSize: '14px', color: '#8C8680', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '4px' }}>{month} {year}</div>
        </div>
        <div style={{ paddingTop: '8px' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: '600' }}>{occasion ?? 'The Toast'}</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 80px', ...Z2 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '64px', fontWeight: '700', color: '#F0EDE8', lineHeight: '1.05', margin: '0 0 20px 0' }}>{entry.title}</h1>
        {(spirit || dram) && (
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#C9A84C', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '20px' }}>
            {[spirit, dram].filter(Boolean).join(' · ')}
          </p>
        )}
        {oneliner && <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', lineHeight: '1.5', maxWidth: '780px', marginBottom: '24px' }}>{oneliner}</p>}
        {entry.location && <p style={{ fontFamily: 'var(--font-body)', fontSize: '15px', color: '#8C8680', letterSpacing: '0.1em' }}>{entry.location}</p>}
      </div>
      <div style={{ padding: '32px 80px 64px', display: 'flex', justifyContent: 'center', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

export const ToastCard = React.forwardRef<HTMLDivElement, ToastCardProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) { case 2: return <V2 {...props} />; case 3: return <V3 {...props} />; case 4: return <V4 {...props} />; default: return <V1 {...props} /> }
    })()
    return <div ref={ref} style={ROOT}><InsetFrame />{inner}</div>
  }
)
ToastCard.displayName = 'ToastCard'
