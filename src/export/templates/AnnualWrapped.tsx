import React from 'react'
import { GentStats } from '@/types/app'
import { BrandMark, GoldRule } from '@/export/templates/shared'

interface AnnualWrappedProps {
  year: number
  stats: GentStats[]
  narrative?: string
}

export const AnnualWrapped = React.forwardRef<HTMLDivElement, AnnualWrappedProps>(
  ({ year, stats, narrative }, ref) => {
    const totalMissions = stats.reduce((sum, s) => sum + s.missions, 0)
    const totalNightsOut = stats.reduce((sum, s) => sum + s.nights_out, 0)
    const totalCountries = stats.length > 0 ? Math.max(...stats.map((s) => s.countries_visited)) : 0

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1080px',
          backgroundColor: '#0D0D0D',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingLeft: '80px',
          paddingRight: '80px',
        }}
      >
        {/* IN REVIEW label + year */}
        <div
          style={{
            paddingTop: '64px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
            marginBottom: '0',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: '#C9A84C',
              letterSpacing: '0.45em',
              textTransform: 'uppercase',
              fontWeight: '600',
              marginBottom: '8px',
            }}
          >
            IN REVIEW
          </span>

          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '160px',
              fontWeight: '700',
              color: '#C9A84C',
              lineHeight: '1',
              letterSpacing: '-0.04em',
            }}
          >
            {year}
          </span>
        </div>

        {/* Key stats row */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            gap: '20px',
            marginBottom: '40px',
          }}
        >
          {[
            { label: 'Missions', value: totalMissions },
            { label: 'Countries', value: totalCountries },
            { label: 'Nights Out', value: totalNightsOut },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                flex: 1,
                backgroundColor: 'rgba(201,168,76,0.06)',
                border: '1px solid rgba(201,168,76,0.18)',
                borderRadius: '4px',
                padding: '20px 16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '52px',
                  fontWeight: '700',
                  color: '#F0EDE8',
                  lineHeight: '1',
                }}
              >
                {value}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '12px',
                  color: '#8C8680',
                  letterSpacing: '0.2em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Per-gent mini rows */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            marginBottom: '32px',
          }}
        >
          {stats.map((s) => (
            <div
              key={s.gent_id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(201,168,76,0.1)',
                paddingTop: '10px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: '17px',
                  color: '#C9A84C',
                  letterSpacing: '0.1em',
                  textTransform: 'capitalize',
                  minWidth: '120px',
                }}
              >
                {s.alias}
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: '28px',
                  alignItems: 'center',
                }}
              >
                {[
                  { label: 'M', value: s.missions },
                  { label: 'NO', value: s.nights_out },
                  { label: 'SK', value: s.steaks },
                  { label: 'PS5', value: s.ps5_sessions },
                  { label: 'CTR', value: s.countries_visited },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '2px',
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '22px',
                        color: '#F0EDE8',
                        lineHeight: '1',
                      }}
                    >
                      {value}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-body)',
                        fontSize: '10px',
                        color: '#8C8680',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Narrative text */}
        {narrative && (
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontStyle: 'italic',
              fontSize: '19px',
              color: '#8C8680',
              textAlign: 'center',
              lineHeight: '1.6',
              maxWidth: '840px',
              marginBottom: '32px',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {narrative}
          </p>
        )}

        {/* Spacer + BrandMark */}
        <div style={{ flex: 1 }} />
        <div
          style={{
            paddingBottom: '56px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
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

AnnualWrapped.displayName = 'AnnualWrapped'
