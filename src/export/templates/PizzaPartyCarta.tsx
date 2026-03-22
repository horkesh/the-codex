import React from 'react'
import { BrandMark, GoldRule, FONT, COLOR } from '@/export/templates/shared'
import { PizzaSvg, TOPPING_REGISTRY } from '@/lib/pizzaSvg'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'
import { formatDate } from '@/lib/utils'
import type { EntryWithParticipants, GatheringMetadata, PizzaMenuItem } from '@/types/app'

interface Props {
  entry: EntryWithParticipants
  gent?: { display_name: string; alias: string; full_alias: string; avatar_url: string | null }
}

const { cream: CREAM, ink: INK, inkDim: INK_DIM, brick: BRICK, brickDim: BRICK_DIM } = COLOR

const PizzaPartyCarta = React.forwardRef<HTMLDivElement, Props>(({ entry, gent }, ref) => {
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
      <div style={{ width: '100%', height: '3px', background: `linear-gradient(to right, transparent, ${BRICK_DIM}, transparent)`, marginBottom: '56px', flexShrink: 0 }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '16px', flexShrink: 0 }}>
        <p style={{
          fontFamily: FONT.body,
          fontSize: '16px',
          letterSpacing: '0.4em',
          textTransform: 'uppercase',
          color: BRICK,
          marginBottom: '24px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          La Carta
        </p>
        <h1 style={{
          fontFamily: FONT.display,
          fontSize: '72px',
          color: INK,
          fontWeight: 400,
          lineHeight: 1.15,
          margin: 0,
          maxWidth: '936px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {entry.title}
        </h1>
      </div>

      <div style={{ width: '100%', margin: '32px 0', flexShrink: 0 }}><GoldRule /></div>

      {/* Pizza list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', flex: 1, overflow: 'hidden' }}>
        {visible.map((pizza, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
            <div style={{ flexShrink: 0 }}>
              <PizzaSvg toppings={pizza.toppings} size={100} seed={`carta-${i}`} />
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <p style={{
                fontFamily: FONT.display,
                fontSize: '36px',
                color: INK,
                fontWeight: 400,
                margin: '0 0 8px 0',
                lineHeight: 1.2,
                maxWidth: '780px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {pizza.name}
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {pizza.toppings.map((t) => {
                  const def = TOPPING_REGISTRY[t]
                  return (
                    <span
                      key={t}
                      style={{
                        fontSize: '16px',
                        letterSpacing: '0.05em',
                        color: INK_DIM,
                        border: `1px solid ${BRICK_DIM}`,
                        borderRadius: '999px',
                        padding: '8px 20px',
                        fontFamily: FONT.body,
                        whiteSpace: 'nowrap',
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
      <div style={{ marginTop: '40px', flexShrink: 0 }}>
        <div style={{ width: '100%', marginBottom: '32px' }}><GoldRule /></div>

        {/* Host */}
        {gent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {/* Map */}
          {lat && lng && (
            <img
              src={buildStaticMapUrl(lat, lng, { width: 260, height: 170, zoom: 14 })}
              alt="Map"
              style={{ width: '240px', height: '150px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }}
            />
          )}
          <div style={{ flex: 1, textAlign: lat && lng ? 'left' : 'center', overflow: 'hidden' }}>
            {venue && (
              <p style={{
                fontFamily: FONT.display,
                fontSize: '28px',
                color: BRICK,
                margin: '0 0 8px 0',
                fontWeight: 400,
                maxWidth: '600px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {venue}
              </p>
            )}
            <p style={{
              fontFamily: FONT.body,
              fontSize: '20px',
              color: INK_DIM,
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {formatDate(eventDate)}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
          <BrandMark size="lg" />
        </div>
      </div>
    </div>
  )
})

PizzaPartyCarta.displayName = 'PizzaPartyCarta'
export { PizzaPartyCarta }
