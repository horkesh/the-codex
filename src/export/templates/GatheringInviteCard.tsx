import React from 'react'
import { BrandMark, GoldRule } from '@/export/templates/shared'
import { formatDate } from '@/lib/utils'
import type { Entry } from '@/types/app'

interface Props { entry: Entry }

const GatheringInviteCard = React.forwardRef<HTMLDivElement, Props>(({ entry }, ref) => {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>
  const eventDate = (metadata.event_date as string) || entry.date
  const location = (metadata.location as string) || entry.location || ''
  const cocktailMenu = (metadata.cocktail_menu as string[]) || []

  return (
    <div ref={ref} style={{ width: '1080px', height: '1350px', backgroundColor: '#0D0D0D', fontFamily: 'var(--font-body)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', boxSizing: 'border-box' }}>
      <div style={{ width: '100%', marginBottom: '48px' }}><GoldRule /></div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '32px', textAlign: 'center' }}>You Are Invited</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '72px', color: '#F0EDE8', textAlign: 'center', lineHeight: 1.15, marginBottom: '40px', fontWeight: 400 }}>{entry.title}</h1>
      <div style={{ width: '60px', height: '1px', background: '#C9A84C', marginBottom: '40px' }} />
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '22px', color: '#8C8680', textAlign: 'center', marginBottom: '8px' }}>{formatDate(eventDate)}</p>
      {location && <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: '#C9A84C', textAlign: 'center', marginBottom: '48px', letterSpacing: '0.05em' }}>{location}</p>}
      {entry.description && <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: '#8C8680', textAlign: 'center', fontStyle: 'italic', maxWidth: '760px', lineHeight: 1.6, marginBottom: '48px' }}>{entry.description}</p>}
      {cocktailMenu.length > 0 && (
        <div style={{ marginBottom: '48px', textAlign: 'center' }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#8C8680', marginBottom: '16px' }}>The Menu</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {cocktailMenu.map((c) => <span key={c} style={{ border: '1px solid rgba(201,168,76,0.4)', borderRadius: '999px', padding: '8px 20px', fontFamily: 'var(--font-body)', fontSize: '15px', color: '#C9A84C' }}>{c}</span>)}
          </div>
        </div>
      )}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', letterSpacing: '0.15em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '48px' }}>RSVP at the link below</p>
      <div style={{ width: '100%', marginBottom: '32px' }}><GoldRule /></div>
      <BrandMark size="md" />
    </div>
  )
})

GatheringInviteCard.displayName = 'GatheringInviteCard'
export { GatheringInviteCard }
