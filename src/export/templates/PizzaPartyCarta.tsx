import React from 'react'
import { BrandMark, GoldRule, FONT } from '@/export/templates/shared'
import { PizzaSvg, TOPPING_REGISTRY } from '@/lib/pizzaSvg'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'
import { formatDate } from '@/lib/utils'
import type { EntryWithParticipants, GatheringMetadata, PizzaMenuItem } from '@/types/app'

interface Props {
  entry: EntryWithParticipants
}

const CREAM = '#F5F0E1'
const INK = '#2A1F14'
const INK_DIM = 'rgba(42,31,20,0.55)'
const BRICK = '#D4843A'
const BRICK_DIM = 'rgba(212,132,58,0.35)'

const PizzaPartyCarta = React.forwardRef<HTMLDivElement, Props>(({ entry }, ref) => {
  const meta = (entry.metadata ?? {}) as unknown as GatheringMetadata
  const pizzas: PizzaMenuItem[] = meta.pizza_menu ?? []
  const eventDate = meta.event_date || entry.date
  const venue = meta.venue || meta.location || entry.location || ''
  const lat = meta.lat
  const lng = meta.lng
  const visible = pizzas.slice(0, 6)
  const overflow = Math.max(0, pizzas.length - 6)

  return (
    <div
      ref={ref}
      style={{
        width: '1080px',
        height: '1920px',
        backgroundColor: CREAM,
        fontFamily: FONT.body,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        padding: '80px 72px',
      }}
    >
      {/* Decorative top border */}
      <div style={{ width: '100%', height: '3px', background: `linear-gradient(to right, transparent, ${BRICK_DIM}, transparent)`, marginBottom: '56px' }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '16px' }}>
        <p style={{ fontFamily: FONT.body, fontSize: '13px', letterSpacing: '0.4em', textTransform: 'uppercase', color: BRICK, marginBottom: '24px' }}>
          La Carta
        </p>
        <h1 style={{ fontFamily: FONT.display, fontSize: '56px', color: INK, fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
          {entry.title}
        </h1>
      </div>

      <div style={{ width: '100%', margin: '32px 0' }}><GoldRule /></div>

      {/* Pizza list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', flex: 1 }}>
        {visible.map((pizza, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ flexShrink: 0 }}>
              <PizzaSvg toppings={pizza.toppings} size={80} seed={`carta-${i}`} />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: FONT.display, fontSize: '28px', color: INK, fontWeight: 400, margin: '0 0 8px 0', lineHeight: 1.2 }}>
                {pizza.name}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {pizza.toppings.map((t) => {
                  const def = TOPPING_REGISTRY[t]
                  return (
                    <span
                      key={t}
                      style={{
                        fontSize: '12px',
                        letterSpacing: '0.05em',
                        color: INK_DIM,
                        border: `1px solid ${BRICK_DIM}`,
                        borderRadius: '999px',
                        padding: '4px 14px',
                        fontFamily: FONT.body,
                      }}
                    >
                      {def?.label ?? t}
                    </span>
                  )
                })}
              </div>
            </div>
          </div>
        ))}

        {overflow > 0 && (
          <p style={{ fontFamily: FONT.body, fontSize: '18px', color: INK_DIM, textAlign: 'center', fontStyle: 'italic' }}>
            +{overflow} more
          </p>
        )}
      </div>

      {/* Bottom section */}
      <div style={{ marginTop: '40px' }}>
        <div style={{ width: '100%', marginBottom: '32px' }}><GoldRule /></div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Map */}
          {lat && lng && (
            <img
              src={buildStaticMapUrl(lat, lng, { width: 200, height: 140, zoom: 14 })}
              alt="Map"
              style={{ width: '180px', height: '120px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, textAlign: lat && lng ? 'left' : 'center' }}>
            {venue && (
              <p style={{ fontFamily: FONT.display, fontSize: '22px', color: BRICK, margin: '0 0 8px 0', fontWeight: 400 }}>
                {venue}
              </p>
            )}
            <p style={{ fontFamily: FONT.body, fontSize: '16px', color: INK_DIM, margin: 0 }}>
              {formatDate(eventDate)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <BrandMark size="md" />
        </div>
      </div>
    </div>
  )
})

PizzaPartyCarta.displayName = 'PizzaPartyCarta'
export { PizzaPartyCarta }
