import React from 'react'
import { BrandMark, GoldRule, FONT, COLOR } from '@/export/templates/shared'
import { formatDate, daysUntil } from '@/lib/utils'
import type { EntryWithParticipants, GatheringMetadata, PizzaMenuItem } from '@/types/app'

interface Props {
  entry: EntryWithParticipants
  gent?: { display_name: string; alias: string; full_alias: string; avatar_url: string | null }
}

const BRICK = COLOR.brick
const BRICK_DIM = COLOR.brickDim

const PizzaPartyCountdown = React.forwardRef<HTMLDivElement, Props>(({ entry, gent }, ref) => {
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
      <p style={{
        fontFamily: FONT.body,
        fontSize: '18px',
        letterSpacing: '0.5em',
        textTransform: 'uppercase',
        color: BRICK,
        marginBottom: '48px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}>
        Incoming
      </p>

      {/* Giant count */}
      <div style={{
        fontFamily: FONT.display,
        fontSize: isToday ? '180px' : '220px',
        fontWeight: 400,
        color: '#F0EDE8',
        lineHeight: 1,
        marginBottom: subtitle ? '8px' : '32px',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: '936px',
      }}>
        {countDisplay}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p style={{
          fontFamily: FONT.body,
          fontSize: '32px',
          letterSpacing: '0.4em',
          color: '#8C8680',
          marginBottom: '32px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {subtitle}
        </p>
      )}

      {/* "until pizza night at [venue]" */}
      <p style={{
        fontFamily: FONT.display,
        fontSize: '34px',
        color: '#C8C0B0',
        textAlign: 'center',
        fontStyle: 'italic',
        maxWidth: '900px',
        lineHeight: 1.5,
        marginBottom: '56px',
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }}>
        {days >= 0 ? 'until pizza night' : 'since pizza night'}{venue ? ` at ${venue}` : ''}
      </p>

      {/* Rule */}
      <div style={{ width: '300px', marginBottom: '48px' }}><GoldRule /></div>

      {/* Pizza name pills */}
      {pizzas.length > 0 && (
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '900px', marginBottom: '56px' }}>
          {pizzas.map((p, i) => (
            <span
              key={i}
              style={{
                border: `1px solid ${BRICK_DIM}`,
                borderRadius: '999px',
                padding: '14px 30px',
                fontFamily: FONT.body,
                fontSize: '20px',
                color: BRICK,
                letterSpacing: '0.03em',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '400px',
              }}
            >
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Date + city */}
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p style={{
          fontFamily: FONT.body,
          fontSize: '22px',
          color: '#8C8680',
          margin: '0 0 4px 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '900px',
        }}>
          {formatDate(eventDate)}
        </p>
        {city && (
          <p style={{
            fontFamily: FONT.body,
            fontSize: '20px',
            color: '#6E6860',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            maxWidth: '900px',
          }}>
            {city}
          </p>
        )}
      </div>

      {/* Host */}
      {gent && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
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

      <BrandMark size="lg" />
    </div>
  )
})

PizzaPartyCountdown.displayName = 'PizzaPartyCountdown'
export { PizzaPartyCountdown }
