import React from 'react'
import { BrandMark, GoldRule, FONT } from '@/export/templates/shared'
import { formatDate, daysUntil } from '@/lib/utils'
import type { EntryWithParticipants, GatheringMetadata, PizzaMenuItem } from '@/types/app'

interface Props {
  entry: EntryWithParticipants
}

const BRICK = '#D4843A'
const BRICK_DIM = 'rgba(212,132,58,0.35)'

const PizzaPartyCountdown = React.forwardRef<HTMLDivElement, Props>(({ entry }, ref) => {
  const meta = (entry.metadata ?? {}) as unknown as GatheringMetadata
  const pizzas: PizzaMenuItem[] = meta.pizza_menu ?? []
  const eventDate = meta.event_date || entry.date
  const venue = meta.venue || meta.location || entry.location || ''
  const city = entry.city || ''
  const days = daysUntil(eventDate)

  let countDisplay: string
  let subtitle: string
  if (days === 0) {
    countDisplay = 'TODAY'
    subtitle = ''
  } else if (days === 1) {
    countDisplay = '1'
    subtitle = 'DAY'
  } else if (days < 0) {
    countDisplay = String(Math.abs(days))
    subtitle = 'PAST'
  } else {
    countDisplay = String(days)
    subtitle = 'DAYS'
  }

  const isToday = days === 0

  return (
    <div
      ref={ref}
      style={{
        width: '1080px',
        height: '1920px',
        background: 'linear-gradient(180deg, #0D0B0F 0%, #1A120A 100%)',
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
      {/* INCOMING label */}
      <p style={{ fontFamily: FONT.body, fontSize: '14px', letterSpacing: '0.5em', textTransform: 'uppercase', color: BRICK, marginBottom: '48px' }}>
        Incoming
      </p>

      {/* Giant count */}
      <div style={{
        fontFamily: FONT.display,
        fontSize: isToday ? '140px' : '180px',
        fontWeight: 400,
        color: '#F0EDE8',
        lineHeight: 1,
        marginBottom: subtitle ? '8px' : '32px',
      }}>
        {countDisplay}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p style={{ fontFamily: FONT.body, fontSize: '24px', letterSpacing: '0.4em', color: '#8C8680', marginBottom: '32px' }}>
          {subtitle}
        </p>
      )}

      {/* "until pizza night at [venue]" */}
      <p style={{ fontFamily: FONT.display, fontSize: '28px', color: '#C8C0B0', textAlign: 'center', fontStyle: 'italic', maxWidth: '700px', lineHeight: 1.5, marginBottom: '56px' }}>
        {days >= 0 ? 'until pizza night' : 'since pizza night'}{venue ? ` at ${venue}` : ''}
      </p>

      {/* Rule */}
      <div style={{ width: '300px', marginBottom: '48px' }}><GoldRule /></div>

      {/* Pizza name pills */}
      {pizzas.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px', marginBottom: '56px' }}>
          {pizzas.map((p, i) => (
            <span
              key={i}
              style={{
                border: `1px solid ${BRICK_DIM}`,
                borderRadius: '999px',
                padding: '10px 24px',
                fontFamily: FONT.body,
                fontSize: '16px',
                color: BRICK,
                letterSpacing: '0.03em',
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Date + city */}
      <div style={{ textAlign: 'center', marginBottom: '56px' }}>
        <p style={{ fontFamily: FONT.body, fontSize: '18px', color: '#8C8680', margin: '0 0 4px 0' }}>
          {formatDate(eventDate)}
        </p>
        {city && (
          <p style={{ fontFamily: FONT.body, fontSize: '16px', color: '#6E6860', margin: 0 }}>
            {city}
          </p>
        )}
      </div>

      <BrandMark size="md" />
    </div>
  )
})

PizzaPartyCountdown.displayName = 'PizzaPartyCountdown'
export { PizzaPartyCountdown }
