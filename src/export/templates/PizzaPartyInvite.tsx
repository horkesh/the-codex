import React from 'react'
import { BrandMark, GoldRule, BackgroundLayer, InsetFrame, FONT, COLOR } from '@/export/templates/shared'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'
import { formatDate } from '@/lib/utils'
import type { EntryWithParticipants, GatheringMetadata } from '@/types/app'

interface Props {
  entry: EntryWithParticipants
  backgroundUrl?: string
  gent?: { display_name: string; alias: string; full_alias: string; avatar_url: string | null }
}

const BRICK = COLOR.brick

const PizzaPartyInvite = React.forwardRef<HTMLDivElement, Props>(({ entry, backgroundUrl, gent }, ref) => {
  const meta = (entry.metadata ?? {}) as unknown as GatheringMetadata
  const eventDate = meta.event_date || entry.date
  const venue = meta.venue || meta.location || entry.location || ''
  const address = meta.address || ''
  const lat = meta.lat
  const lng = meta.lng

  return (
    <div
      ref={ref}
      style={{
        width: '1080px',
        height: '1920px',
        backgroundColor: '#0D0B0F',
        fontFamily: FONT.body,
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <InsetFrame />

      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: '100%', padding: '100px 80px 80px', boxSizing: 'border-box' }}>
        {/* Top label */}
        <p style={{
          fontFamily: FONT.body,
          fontSize: '18px',
          letterSpacing: '0.45em',
          textTransform: 'uppercase',
          color: BRICK,
          marginBottom: '48px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          You're Invited
        </p>

        <div style={{ width: '100%', marginBottom: '56px' }}><GoldRule /></div>

        {/* Title */}
        <h1 style={{
          fontFamily: FONT.display,
          fontSize: '96px',
          color: '#F0EDE8',
          textAlign: 'center',
          lineHeight: 1.1,
          margin: '0 0 40px 0',
          fontWeight: 400,
          maxWidth: '920px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {entry.title}
        </h1>

        {/* Venue */}
        {venue && (
          <p style={{
            fontFamily: FONT.body,
            fontSize: '32px',
            color: BRICK,
            textAlign: 'center',
            letterSpacing: '0.08em',
            marginBottom: '16px',
            maxWidth: '900px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {venue}
          </p>
        )}

        {/* Date */}
        <p style={{
          fontFamily: FONT.body,
          fontSize: '28px',
          color: backgroundUrl ? '#C8C0B0' : '#8C8680',
          textAlign: 'center',
          marginBottom: '12px',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {formatDate(eventDate)}
        </p>

        {/* Address */}
        {address && (
          <p style={{
            fontFamily: FONT.body,
            fontSize: '22px',
            color: backgroundUrl ? '#A09890' : '#6E6860',
            textAlign: 'center',
            fontStyle: 'italic',
            maxWidth: '800px',
            lineHeight: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as const,
            overflow: 'hidden',
          }}>
            {address}
          </p>
        )}

        {/* Host */}
        {gent && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '40px' }}>
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

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Map */}
        {lat && lng && (
          <img
            src={buildStaticMapUrl(lat, lng, { width: 600, height: 220, zoom: 14 })}
            alt="Location"
            style={{ width: '700px', height: '200px', borderRadius: '12px', objectFit: 'cover', marginBottom: '48px', border: '1px solid rgba(212,132,58,0.25)' }}
          />
        )}

        <div style={{ width: '100%', marginBottom: '40px' }}><GoldRule /></div>

        <BrandMark size="lg" />
      </div>
    </div>
  )
})

PizzaPartyInvite.displayName = 'PizzaPartyInvite'
export { PizzaPartyInvite }
