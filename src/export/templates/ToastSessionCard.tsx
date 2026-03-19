import React from 'react'
import { FONT, COLOR, VARIANT_INNER } from './shared/utils'
import { InsetFrame } from './shared/InsetFrame'
import { BrandMark } from './shared/BrandMark'
import { BackgroundLayer } from './shared/BackgroundLayer'

interface ToastTemplateProps {
  entry: {
    title: string
    date: string
    location: string | null
    lore: string | null
    metadata: Record<string, unknown>
  }
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

function V1({ entry, backgroundUrl }: ToastTemplateProps) {
  const meta = entry.metadata || {}
  const vibe = (meta.vibe_summary as string) || ''
  const guests = (meta.guest_count as number) || 0
  const duration = (meta.duration_seconds as number) || 0
  const mins = Math.round(duration / 60)

  return (
    <div style={{ ...VARIANT_INNER, justifyContent: 'flex-end' }}>
      <BackgroundLayer url={backgroundUrl} />
      <div style={{ ...Z2, padding: '60px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <p style={{ color: COLOR.gold, fontSize: '16px', letterSpacing: '4px', textTransform: 'uppercase', fontFamily: FONT.body }}>
          THE TOAST
        </p>
        <h1 style={{ color: COLOR.ivory, fontSize: '52px', fontFamily: FONT.display, fontWeight: 700, lineHeight: 1.1 }}>
          {entry.title}
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '18px', fontFamily: FONT.body }}>
          {entry.location && `${entry.location} · `}{entry.date}
        </p>
        {vibe && (
          <p style={{ color: COLOR.gold, fontSize: '16px', fontFamily: FONT.body, fontStyle: 'italic' }}>
            {vibe}
          </p>
        )}
        <div style={{ display: 'flex', gap: '24px', color: 'rgba(245,240,232,0.5)', fontSize: '14px' }}>
          {guests > 0 && <span>{guests} guests</span>}
          {mins > 0 && <span>{mins}m</span>}
        </div>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

function V2({ entry, backgroundUrl }: ToastTemplateProps) {
  const meta = entry.metadata || {}
  const vibe = (meta.vibe_summary as string) || ''

  return (
    <div style={{ ...VARIANT_INNER, justifyContent: 'center', alignItems: 'center', textAlign: 'center' as const }}>
      <BackgroundLayer url={backgroundUrl} />
      <div style={{ ...Z2, padding: '80px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '32px' }}>
        <p style={{ color: COLOR.gold, fontSize: '14px', letterSpacing: '6px', textTransform: 'uppercase' }}>
          THE TOAST
        </p>
        <h1 style={{ color: COLOR.ivory, fontSize: '64px', fontFamily: FONT.display, fontWeight: 700, lineHeight: 1.05 }}>
          {entry.title}
        </h1>
        {vibe && (
          <p style={{ color: COLOR.gold, fontSize: '20px', fontFamily: FONT.display, fontStyle: 'italic', maxWidth: '700px' }}>
            &ldquo;{vibe}&rdquo;
          </p>
        )}
        <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '16px' }}>
          {entry.location && `${entry.location} · `}{entry.date}
        </p>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

function V3({ entry, backgroundUrl }: ToastTemplateProps) {
  const oneliner = (entry.metadata?.lore_oneliner as string) || entry.lore?.split('.')[0] || ''

  return (
    <div style={{ ...VARIANT_INNER, justifyContent: 'flex-end' }}>
      <BackgroundLayer url={backgroundUrl} />
      <div style={{ ...Z2, padding: '60px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <p style={{ color: COLOR.gold, fontSize: '14px', letterSpacing: '4px', textTransform: 'uppercase' }}>
          THE TOAST
        </p>
        {oneliner && (
          <p style={{ color: COLOR.ivory, fontSize: '28px', fontFamily: FONT.display, fontStyle: 'italic', lineHeight: 1.3, maxWidth: '800px' }}>
            &ldquo;{oneliner}&rdquo;
          </p>
        )}
        <div style={{ width: '60px', height: '2px', backgroundColor: COLOR.gold }} />
        <p style={{ color: 'rgba(245,240,232,0.6)', fontSize: '16px' }}>
          {entry.title} · {entry.date}
        </p>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

function V4({ entry, backgroundUrl }: ToastTemplateProps) {
  const meta = entry.metadata || {}
  const code = (meta.session_code as string) || ''

  return (
    <div style={{ ...VARIANT_INNER, justifyContent: 'flex-end' }}>
      <BackgroundLayer url={backgroundUrl} />
      <div style={{ ...Z2, padding: '60px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {code && (
          <p style={{ color: 'rgba(201,168,76,0.4)', fontSize: '120px', fontFamily: FONT.mono, fontWeight: 700, lineHeight: 1, letterSpacing: '16px' }}>
            {code}
          </p>
        )}
        <h1 style={{ color: COLOR.ivory, fontSize: '40px', fontFamily: FONT.display, fontWeight: 700 }}>
          {entry.title}
        </h1>
        <p style={{ color: 'rgba(245,240,232,0.5)', fontSize: '16px' }}>
          {entry.location && `${entry.location} · `}{entry.date}
        </p>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

export const ToastSessionCard = React.forwardRef<HTMLDivElement, ToastTemplateProps>(
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

ToastSessionCard.displayName = 'ToastSessionCard'
