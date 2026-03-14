import React from 'react'
import { BrandMark, GoldRule, BackgroundLayer } from '@/export/templates/shared'
import { formatDate } from '@/lib/utils'
import type { Entry } from '@/types/app'

interface Props { entry: Entry; backgroundUrl?: string; rewardKeys?: Set<string> }

const GatheringInviteCard = React.forwardRef<HTMLDivElement, Props>(({ entry, backgroundUrl, rewardKeys }, ref) => {
  const metadata = (entry.metadata ?? {}) as Record<string, unknown>
  const eventDate = (metadata.event_date as string) || entry.date
  const location = (metadata.location as string) || entry.location || ''
  const cocktailMenu = (metadata.cocktail_menu as string[]) || []
  const isHost = rewardKeys?.has('host_seal') ?? false

  return (
    <div ref={ref} style={{ width: '1080px', height: '1350px', backgroundColor: '#0D0B0F', fontFamily: 'var(--font-body)', overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px', boxSizing: 'border-box' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Host seal — threshold reward */}
      {isHost && (
        <div style={{ position: 'absolute', top: '56px', right: '72px', zIndex: 3, width: '72px', height: '72px', border: '1.5px solid #C9A84C', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: 'var(--font-body)', fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase' as const, color: '#C9A84C' }}>Host</span>
        </div>
      )}
      <div style={{ width: '100%', marginBottom: '48px', position: 'relative', zIndex: 2 }}><GoldRule /></div>
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '13px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', marginBottom: '32px', textAlign: 'center', position: 'relative', zIndex: 2 }}>You Are Invited</p>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '72px', color: '#F0EDE8', textAlign: 'center', lineHeight: 1.15, marginBottom: '40px', fontWeight: 400, position: 'relative', zIndex: 2 }}>{entry.title}</h1>
      <div style={{ width: '60px', height: '1px', background: '#C9A84C', marginBottom: '40px', position: 'relative', zIndex: 2 }} />
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '22px', color: backgroundUrl ? '#A09890' : '#8C8680', textAlign: 'center', marginBottom: '8px', position: 'relative', zIndex: 2 }}>{formatDate(eventDate)}</p>
      {location && <p style={{ fontFamily: 'var(--font-body)', fontSize: '20px', color: '#C9A84C', textAlign: 'center', marginBottom: '48px', letterSpacing: '0.05em', position: 'relative', zIndex: 2 }}>{location}</p>}
      {entry.description && <p style={{ fontFamily: 'var(--font-display)', fontSize: '20px', color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center', fontStyle: 'italic', maxWidth: '760px', lineHeight: 1.6, marginBottom: '48px', position: 'relative', zIndex: 2 }}>{entry.description}</p>}
      {cocktailMenu.length > 0 && (
        <div style={{ marginBottom: '48px', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <p style={{ fontFamily: 'var(--font-body)', fontSize: '11px', letterSpacing: '0.3em', textTransform: 'uppercase', color: backgroundUrl ? '#A09890' : '#8C8680', marginBottom: '16px' }}>The Menu</p>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {cocktailMenu.map((c) => <span key={c} style={{ border: '1px solid rgba(201,168,76,0.4)', borderRadius: '999px', padding: '8px 20px', fontFamily: 'var(--font-body)', fontSize: '15px', color: '#C9A84C' }}>{c}</span>)}
          </div>
        </div>
      )}
      <p style={{ fontFamily: 'var(--font-body)', fontSize: '14px', letterSpacing: '0.15em', color: '#C9A84C', textTransform: 'uppercase', marginBottom: '48px', position: 'relative', zIndex: 2 }}>RSVP at the link below</p>
      <div style={{ width: '100%', marginBottom: '32px', position: 'relative', zIndex: 2 }}><GoldRule /></div>
      <div style={{ position: 'relative', zIndex: 2 }}><BrandMark size="md" /></div>
    </div>
  )
})

GatheringInviteCard.displayName = 'GatheringInviteCard'
export { GatheringInviteCard }
