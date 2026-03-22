import React from 'react'
import { BrandMark, GoldRule, FONT, COLOR } from '@/export/templates/shared'
import { PizzaSvg } from '@/lib/pizzaSvg'
import { formatDate } from '@/lib/utils'
import type { EntryWithParticipants, GatheringMetadata, PizzaMenuItem } from '@/types/app'

interface Props {
  entry: EntryWithParticipants
  gent?: { display_name: string; alias: string; full_alias: string; avatar_url: string | null }
}

const BRICK = COLOR.brick

const PizzaPartyForno = React.forwardRef<HTMLDivElement, Props>(({ entry, gent }, ref) => {
  const meta = (entry.metadata ?? {}) as unknown as GatheringMetadata
  const pizzas: PizzaMenuItem[] = meta.pizza_menu ?? []
  const eventDate = meta.event_date || entry.date
  const venue = meta.venue || meta.location || entry.location || ''
  const hero = pizzas[0]

  return (
    <div
      ref={ref}
      style={{
        width: '1080px',
        height: '1920px',
        background: 'radial-gradient(ellipse at center 40%, #1A120A 0%, #0D0B0F 70%)',
        fontFamily: FONT.body,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        padding: '80px 72px',
      }}
    >
      {/* Subtle radial glow behind pizza */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -60%)',
        width: '700px',
        height: '700px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,132,58,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Hero pizza */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '64px' }}>
        {hero ? (
          <PizzaSvg toppings={hero.toppings} size={480} seed="forno-hero" />
        ) : (
          <PizzaSvg toppings={['mozzarella', 'basil', 'tomato']} size={480} seed="forno-default" />
        )}
      </div>

      {/* Pizza name */}
      {hero && (
        <p style={{
          fontFamily: FONT.display,
          fontSize: '40px',
          color: BRICK,
          textAlign: 'center',
          margin: '0 0 12px 0',
          fontWeight: 400,
          fontStyle: 'italic',
          position: 'relative',
          zIndex: 1,
          maxWidth: '900px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {hero.name}
        </p>
      )}

      {/* Rule */}
      <div style={{ width: '200px', margin: '32px 0', position: 'relative', zIndex: 1 }}><GoldRule /></div>

      {/* Title */}
      <h1 style={{
        fontFamily: FONT.display,
        fontSize: '68px',
        color: '#F0EDE8',
        textAlign: 'center',
        lineHeight: 1.15,
        margin: '0 0 24px 0',
        fontWeight: 400,
        position: 'relative',
        zIndex: 1,
        maxWidth: '936px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {entry.title}
      </h1>

      {/* Date + venue */}
      <p style={{
        fontFamily: FONT.body,
        fontSize: '24px',
        color: '#8C8680',
        textAlign: 'center',
        margin: '0 0 8px 0',
        position: 'relative',
        zIndex: 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        {formatDate(eventDate)}
      </p>
      {venue && (
        <p style={{
          fontFamily: FONT.body,
          fontSize: '26px',
          color: BRICK,
          textAlign: 'center',
          letterSpacing: '0.05em',
          margin: '0 0 40px 0',
          position: 'relative',
          zIndex: 1,
          maxWidth: '900px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {venue}
        </p>
      )}

      {/* Host */}
      {gent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', position: 'relative', zIndex: 1, marginBottom: '40px' }}>
          {gent.avatar_url && (
            <img src={gent.avatar_url} alt="" style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(212,132,58,0.4)' }} />
          )}
          <div>
            <p style={{ fontFamily: FONT.body, fontSize: '14px', color: '#8C8680', letterSpacing: '0.2em', textTransform: 'uppercase', margin: '0 0 4px 0', whiteSpace: 'nowrap' }}>Hosted by</p>
            <p style={{
              fontFamily: FONT.display,
              fontSize: '28px',
              color: BRICK,
              margin: 0,
              fontWeight: 400,
              maxWidth: '700px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>{gent.alias}</p>
          </div>
        </div>
      )}

      {/* Brand */}
      <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <BrandMark size="lg" />
      </div>
    </div>
  )
})

PizzaPartyForno.displayName = 'PizzaPartyForno'
export { PizzaPartyForno }
