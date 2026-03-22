import React from 'react'
import { BrandMark, GoldRule, FONT } from '@/export/templates/shared'
import { PizzaSvg } from '@/lib/pizzaSvg'
import { formatDate } from '@/lib/utils'
import type { EntryWithParticipants, GatheringMetadata, PizzaMenuItem } from '@/types/app'

interface Props {
  entry: EntryWithParticipants
}

const BRICK = '#D4843A'

const PizzaPartyForno = React.forwardRef<HTMLDivElement, Props>(({ entry }, ref) => {
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
        width: '600px',
        height: '600px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,132,58,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Hero pizza */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '64px' }}>
        {hero ? (
          <PizzaSvg toppings={hero.toppings} size={400} seed="forno-hero" />
        ) : (
          <PizzaSvg toppings={['mozzarella', 'basil', 'tomato']} size={400} seed="forno-default" />
        )}
      </div>

      {/* Pizza name */}
      {hero && (
        <p style={{ fontFamily: FONT.display, fontSize: '32px', color: BRICK, textAlign: 'center', margin: '0 0 12px 0', fontWeight: 400, fontStyle: 'italic', position: 'relative', zIndex: 1 }}>
          {hero.name}
        </p>
      )}

      {/* Rule */}
      <div style={{ width: '200px', margin: '32px 0', position: 'relative', zIndex: 1 }}><GoldRule /></div>

      {/* Title */}
      <h1 style={{ fontFamily: FONT.display, fontSize: '56px', color: '#F0EDE8', textAlign: 'center', lineHeight: 1.15, margin: '0 0 24px 0', fontWeight: 400, position: 'relative', zIndex: 1 }}>
        {entry.title}
      </h1>

      {/* Date + venue */}
      <p style={{ fontFamily: FONT.body, fontSize: '20px', color: '#8C8680', textAlign: 'center', margin: '0 0 8px 0', position: 'relative', zIndex: 1 }}>
        {formatDate(eventDate)}
      </p>
      {venue && (
        <p style={{ fontFamily: FONT.body, fontSize: '20px', color: BRICK, textAlign: 'center', letterSpacing: '0.05em', margin: 0, position: 'relative', zIndex: 1 }}>
          {venue}
        </p>
      )}

      {/* Brand */}
      <div style={{ position: 'absolute', bottom: '80px', left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 1 }}>
        <BrandMark size="md" />
      </div>
    </div>
  )
})

PizzaPartyForno.displayName = 'PizzaPartyForno'
export { PizzaPartyForno }
