import React from 'react'
import { BrandMark, GoldRule, BackgroundLayer } from '@/export/templates/shared'
import { formatDate, daysUntil as computeDaysUntil } from '@/lib/utils'
import type { Entry } from '@/types/app'

interface Props { entry: Entry; daysUntil?: number; backgroundUrl?: string }

const CountdownCard = React.forwardRef<HTMLDivElement, Props>(({ entry, daysUntil, backgroundUrl }, ref) => {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>
  const eventDate = (metadata.event_date as string) || entry.date
  const location = (metadata.location as string) || entry.location || ''
  const days = daysUntil ?? computeDaysUntil(eventDate)

  return (
    <div ref={ref} style={{ width: '1080px', height: '1350px', backgroundColor: '#0D0B0F', fontFamily: 'var(--font-body)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '80px', boxSizing: 'border-box' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '16px', textAlign: 'center', position: 'relative', zIndex: 2 }}>Until</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '180px', lineHeight: 0.9, color: '#C9A84C', textAlign: 'center', marginBottom: '8px', fontWeight: 400, textShadow: '0 0 60px rgba(201,168,76,0.3)', position: 'relative', zIndex: 2 }}>{Math.abs(days)}</p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', letterSpacing: '0.5em', textTransform: 'uppercase', color: backgroundUrl ? '#A09890' : '#8C8680', marginBottom: '48px', textAlign: 'center', position: 'relative', zIndex: 2 }}>{Math.abs(days) === 1 ? 'Day' : 'Days'}</p>
      <div style={{ width: '200px', marginBottom: '48px', position: 'relative', zIndex: 2 }}><GoldRule /></div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '64px', color: '#F0EDE8', textAlign: 'center', lineHeight: 1.2, marginBottom: '32px', fontWeight: 400, position: 'relative', zIndex: 2 }}>{entry.title}</h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: backgroundUrl ? '#A09890' : '#8C8680', textAlign: 'center', marginBottom: '8px', position: 'relative', zIndex: 2 }}>{formatDate(eventDate)}</p>
      {location && <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#C9A84C', textAlign: 'center', letterSpacing: '0.08em', marginBottom: '80px', position: 'relative', zIndex: 2 }}>{location}</p>}
      <div style={{ position: 'absolute', bottom: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', zIndex: 2 }}>
        <GoldRule />
        <BrandMark size="md" />
      </div>
    </div>
  )
})

CountdownCard.displayName = 'CountdownCard'
export { CountdownCard }
