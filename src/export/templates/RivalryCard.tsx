import React from 'react'
import { BrandMark, GoldRule, BackgroundLayer } from '@/export/templates/shared'
import type { GentStats, GentAlias } from '@/types/app'

const GENT_LABELS: Record<GentAlias, string> = {
  keys: 'Keys',
  bass: 'Bass',
  lorekeeper: 'Lorekeeper',
}

interface StatRow {
  label: string
  field: keyof GentStats
}

const STAT_ROWS: StatRow[] = [
  { label: 'Missions', field: 'missions' },
  { label: 'Nights Out', field: 'nights_out' },
  { label: 'Steaks', field: 'steaks' },
  { label: 'Gatherings', field: 'gatherings' },
  { label: 'Countries', field: 'countries_visited' },
  { label: 'People', field: 'people_met' },
  { label: 'Stamps', field: 'stamps_collected' },
]

interface RivalryCardProps {
  gentA: GentStats
  gentB: GentStats
  backgroundUrl?: string
}

export const RivalryCard = React.forwardRef<HTMLDivElement, RivalryCardProps>(
  ({ gentA, gentB, backgroundUrl }, ref) => {
    const leadsA = STAT_ROWS.filter((r) => (gentA[r.field] as number) > (gentB[r.field] as number)).length
    const leadsB = STAT_ROWS.filter((r) => (gentB[r.field] as number) > (gentA[r.field] as number)).length
    const summaryLine =
      leadsA > leadsB
        ? `${GENT_LABELS[gentA.alias]} leads in ${leadsA} of ${STAT_ROWS.length} categories`
        : leadsB > leadsA
          ? `${GENT_LABELS[gentB.alias]} leads in ${leadsB} of ${STAT_ROWS.length} categories`
          : 'Perfectly matched'

    return (
      <div
        ref={ref}
        style={{
          width: '1080px',
          height: '1350px',
          backgroundColor: '#0D0B0F',
          fontFamily: 'var(--font-body)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          padding: '80px',
          boxSizing: 'border-box',
        }}
      >
        <BackgroundLayer url={backgroundUrl} gradient="strong" />

        {/* Header */}
        <div style={{ position: 'relative', zIndex: 2, marginBottom: '48px' }}>
          <p
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: '#C9A84C',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              fontWeight: '600',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            The Intelligence
          </p>
          <GoldRule />
        </div>

        {/* VS header */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
            gap: '32px',
            marginBottom: '56px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '72px',
              fontWeight: '700',
              color: '#F0EDE8',
              lineHeight: '1',
              letterSpacing: '-0.02em',
            }}
          >
            {GENT_LABELS[gentA.alias]}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '14px',
              color: '#8C8680',
              letterSpacing: '0.3em',
              textTransform: 'uppercase',
              paddingBottom: '12px',
            }}
          >
            vs
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '72px',
              fontWeight: '700',
              color: '#F0EDE8',
              lineHeight: '1',
              letterSpacing: '-0.02em',
            }}
          >
            {GENT_LABELS[gentB.alias]}
          </span>
        </div>

        {/* Stat rows */}
        <div style={{ position: 'relative', zIndex: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', justifyContent: 'center' }}>
          {STAT_ROWS.map((row) => {
            const a = gentA[row.field] as number
            const b = gentB[row.field] as number
            const total = a + b
            const pctA = total > 0 ? (a / total) * 100 : 50
            const leaderIsA = a > b
            const tied = a === b
            const gold = '#C9A84C'
            const dim = 'rgba(255,255,255,0.2)'

            return (
              <div key={row.field}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '28px',
                      fontWeight: '700',
                      color: !tied && leaderIsA ? gold : '#F0EDE8',
                      minWidth: '60px',
                    }}
                  >
                    {a}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '11px',
                      color: '#8C8680',
                      letterSpacing: '0.25em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {row.label}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: '28px',
                      fontWeight: '700',
                      color: !tied && !leaderIsA ? gold : '#F0EDE8',
                      minWidth: '60px',
                      textAlign: 'right',
                    }}
                  >
                    {b}
                  </span>
                </div>
                {/* Bar */}
                <div
                  style={{
                    height: '3px',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      width: `${pctA}%`,
                      height: '100%',
                      backgroundColor: !tied && leaderIsA ? gold : dim,
                      borderRadius: '9999px 0 0 9999px',
                    }}
                  />
                  <div
                    style={{
                      width: `${100 - pctA}%`,
                      height: '100%',
                      backgroundColor: !tied && !leaderIsA ? gold : dim,
                      borderRadius: '0 9999px 9999px 0',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Summary line */}
        <p
          style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: 'var(--font-body)',
            fontSize: '14px',
            color: '#8C8680',
            textAlign: 'center',
            letterSpacing: '0.05em',
            marginTop: '40px',
            marginBottom: '40px',
          }}
        >
          {summaryLine}
        </p>

        {/* Footer */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '20px',
          }}
        >
          <GoldRule />
          <BrandMark size="md" />
        </div>
      </div>
    )
  }
)

RivalryCard.displayName = 'RivalryCard'
