import React from 'react'
import { BrandMark, GoldRule } from '@/export/templates/shared'
import { formatDate, daysUntil as computeDaysUntil } from '@/lib/utils'
import type { Entry } from '@/types/app'

interface Props { entry: Entry; daysUntil?: number }

const CountdownCard = React.forwardRef<HTMLDivElement, Props>(({ entry, daysUntil }, ref) => {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>
  const eventDate = (metadata.event_date as string) || entry.date
  const location = (metadata.location as string) || entry.location || ''
  const days = daysUntil ?? computeDaysUntil(eventDate)

  return (
    <div ref={ref} style={{ width: '1080px', height: '1920px', backgroundColor: '#0D0D0D', fontFamily: 'var(--font-body)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 80px', boxSizing: 'border-box' }}>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', letterSpacing: '0.4em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '16px', textAlign: 'center' }}>Until</p>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: '240px', lineHeight: 0.9, color: '#C9A84C', textAlign: 'center', marginBottom: '8px', fontWeight: 400, textShadow: '0 0 80px rgba(201,168,76,0.3)' }}>{Math.abs(days)}</p>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', letterSpacing: '0.5em', textTransform: 'uppercase', color: '#8C8680', marginBottom: '80px', textAlign: 'center' }}>{Math.abs(days) === 1 ? 'Day' : 'Days'}</p>
      <div style={{ width: '200px', marginBottom: '64px' }}><GoldRule /></div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '64px', color: '#F0EDE8', textAlign: 'center', lineHeight: 1.2, marginBottom: '32px', fontWeight: 400 }}>{entry.title}</h1>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: '#8C8680', textAlign: 'center', marginBottom: '8px' }}>{formatDate(eventDate)}</p>
      {location && <p style={{ fontFamily: 'var(--font-body)', fontSize: '18px', color: '#C9A84C', textAlign: 'center', letterSpacing: '0.08em', marginBottom: '80px' }}>{location}</p>}
      <div style={{ position: 'absolute', bottom: '80px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}>
        <GoldRule />
        <BrandMark size="md" />
      </div>
    </div>
  )
})

CountdownCard.displayName = 'CountdownCard'
export { CountdownCard }
