import React from 'react'
import { PassportStamp } from '@/types/app'
import { flagEmoji } from '@/lib/utils'
import { BrandMark, GoldRule, FONT } from '@/export/templates/shared'

interface PassportPageProps {
  stamps: PassportStamp[]
  gent: {
    display_name: string
    alias: string
  }
}

export const PassportPage = React.forwardRef<HTMLDivElement, PassportPageProps>(
  ({ stamps, gent }, ref) => {
    const countries = new Set(stamps.map((s) => s.country_code).filter(Boolean))
    const countryCount = countries.size
    const stampCount = stamps.length

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1920px',
          backgroundColor: '#0D0D0D',
          fontFamily: FONT.body,
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingLeft: '80px',
          paddingRight: '80px',
        }}
      >
        {/* Header */}
        <div
          style={{
            paddingTop: '100px',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '0',
            marginBottom: '16px',
          }}
        >
          <span
            style={{
              fontFamily: FONT.body,
              fontSize: '13px',
              color: '#C9A84C',
              letterSpacing: '0.5em',
              textTransform: 'uppercase',
              fontWeight: '600',
              marginBottom: '32px',
            }}
          >
            THE PASSPORT
          </span>

          <h1
            style={{
              fontFamily: FONT.display,
              fontSize: '68px',
              fontWeight: '700',
              color: '#F0EDE8',
              lineHeight: '1.05',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              margin: '0 0 16px 0',
            }}
          >
            {gent.display_name}
          </h1>

          <p
            style={{
              fontFamily: FONT.body,
              fontSize: '20px',
              color: '#C9A84C',
              letterSpacing: '0.25em',
              textTransform: 'uppercase',
              marginBottom: '32px',
            }}
          >
            {gent.alias}
          </p>

          {/* Summary line */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <span
              style={{
                fontFamily: FONT.body,
                fontSize: '17px',
                color: '#8C8680',
                letterSpacing: '0.08em',
              }}
            >
              {countryCount} {countryCount === 1 ? 'country' : 'countries'}
            </span>
            <span
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                backgroundColor: '#C9A84C',
                display: 'inline-block',
              }}
            />
            <span
              style={{
                fontFamily: FONT.body,
                fontSize: '17px',
                color: '#8C8680',
                letterSpacing: '0.08em',
              }}
            >
              {stampCount} {stampCount === 1 ? 'stamp' : 'stamps'}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: '100%', marginTop: '48px', marginBottom: '56px' }}>
          <GoldRule />
        </div>

        {/* Stamp grid */}
        <div
          style={{
            width: '100%',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '28px',
            flex: 1,
            alignContent: 'start',
          }}
        >
          {stamps.map((stamp) => (
            <div
              key={stamp.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              {/* Stamp circle */}
              <div
                style={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  border: '2px solid rgba(201,168,76,0.3)',
                  overflow: 'hidden',
                  backgroundColor: 'rgba(201,168,76,0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                {stamp.image_url ? (
                  <img
                    src={stamp.image_url}
                    alt={stamp.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : stamp.country_code ? (
                  <span style={{ fontSize: '72px', lineHeight: '1' }}>
                    {flagEmoji(stamp.country_code)}
                  </span>
                ) : (
                  <span
                    style={{
                      fontFamily: FONT.display,
                      fontSize: '28px',
                      color: '#C9A84C',
                      fontWeight: '700',
                    }}
                  >
                    ✦
                  </span>
                )}
              </div>

              {/* Stamp name */}
              <p
                style={{
                  fontFamily: FONT.body,
                  fontSize: '14px',
                  color: '#F0EDE8',
                  textAlign: 'center',
                  letterSpacing: '0.04em',
                  lineHeight: '1.3',
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {stamp.name}
              </p>

              {stamp.city && (
                <p
                  style={{
                    fontFamily: FONT.body,
                    fontSize: '12px',
                    color: '#8C8680',
                    textAlign: 'center',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    marginTop: '-6px',
                  }}
                >
                  {stamp.city}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Bottom BrandMark */}
        <div
          style={{
            paddingBottom: '80px',
            paddingTop: '56px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
            width: '100%',
          }}
        >
          <GoldRule />
          <BrandMark size="lg" />
        </div>
      </div>
    )
  }
)

PassportPage.displayName = 'PassportPage'
