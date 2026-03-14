import React from 'react'
import { Entry, PS5Match } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, BackgroundLayer } from '@/export/templates/shared'

interface PS5MatchCardProps {
  entry: Entry
  backgroundUrl?: string
}

export const PS5MatchCard = React.forwardRef<HTMLDivElement, PS5MatchCardProps>(
  ({ entry, backgroundUrl }, ref) => {
    const meta = entry.metadata as {
      matches?: PS5Match[]
      total_matches?: number
      head_to_head_snapshot?: Record<string, Record<string, number>>
    }

    const matches = meta.matches ?? []
    const totalMatches = meta.total_matches ?? matches.length
    const h2h = meta.head_to_head_snapshot ?? {}

    // Derive win counts per gent from h2h snapshot
    const winCounts: Record<string, number> = {}
    for (const [gent, opponents] of Object.entries(h2h)) {
      winCounts[gent] = Object.values(opponents).reduce((a, b) => a + b, 0)
    }

    // Build unique pairings for display
    const pairings: Array<{ p1: string; p2: string; p1wins: number; p2wins: number }> = []
    const seen = new Set<string>()
    for (const [p1, opponents] of Object.entries(h2h)) {
      for (const [p2, wins] of Object.entries(opponents)) {
        const key = [p1, p2].sort().join('|')
        if (!seen.has(key)) {
          seen.add(key)
          const p2wins = h2h[p2]?.[p1] ?? 0
          pairings.push({ p1, p2, p1wins: wins, p2wins })
        }
      }
    }

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
          alignItems: 'center',
          paddingLeft: '80px',
          paddingRight: '80px',
        }}
      >
        <BackgroundLayer url={backgroundUrl} gradient="strong" />

        {/* Grid/circuit texture overlay */}
        {!backgroundUrl && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(201,168,76,0.025) 60px, rgba(201,168,76,0.025) 61px), repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(201,168,76,0.025) 60px, rgba(201,168,76,0.025) 61px)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
        )}

        {/* PS5 SESSION label */}
        <div
          style={{
            paddingTop: '64px',
            width: '100%',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '13px',
              color: '#C9A84C',
              letterSpacing: '0.4em',
              textTransform: 'uppercase',
              fontWeight: '600',
            }}
          >
            PS5 SESSION
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '52px',
            fontWeight: '700',
            color: '#F0EDE8',
            lineHeight: '1.1',
            letterSpacing: '-0.02em',
            margin: '20px 0 0 0',
            alignSelf: 'flex-start',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {entry.title}
        </h1>

        {/* Date + battle count row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '32px',
            alignSelf: 'flex-start',
            marginTop: '16px',
            marginBottom: '48px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: backgroundUrl ? '#A09890' : '#8C8680',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {formatDate(entry.date)}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: '15px',
              color: '#C9A84C',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
            }}
          >
            {totalMatches} Battles
          </span>
        </div>

        {/* H2H matchup rows */}
        <div
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '40px',
            position: 'relative',
            zIndex: 2,
          }}
        >
          {pairings.map(({ p1, p2, p1wins, p2wins }) => (
            <div
              key={`${p1}|${p2}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(201,168,76,0.15)',
                paddingTop: '16px',
              }}
            >
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '26px',
                  color: '#F0EDE8',
                  letterSpacing: '0.04em',
                  textTransform: 'capitalize',
                }}
              >
                {p1}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '32px',
                  color: '#C9A84C',
                  letterSpacing: '0.08em',
                  fontWeight: '700',
                }}
              >
                {p1wins} — {p2wins}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '26px',
                  color: '#F0EDE8',
                  letterSpacing: '0.04em',
                  textTransform: 'capitalize',
                }}
              >
                {p2}
              </span>
            </div>
          ))}
        </div>

        {/* Total wins per gent */}
        {Object.keys(winCounts).length > 0 && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              gap: '24px',
              marginBottom: '40px',
              position: 'relative',
              zIndex: 2,
            }}
          >
            {Object.entries(winCounts).map(([gent, wins]) => (
              <div
                key={gent}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(201,168,76,0.06)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: '4px',
                  padding: '20px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '40px',
                    fontWeight: '700',
                    color: '#C9A84C',
                    lineHeight: '1',
                  }}
                >
                  {wins}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-body)',
                    fontSize: '13px',
                    color: backgroundUrl ? '#A09890' : '#8C8680',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}
                >
                  {gent}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Spacer + BrandMark */}
        <div style={{ flex: 1, position: 'relative', zIndex: 2 }} />
        <div
          style={{
            paddingBottom: '56px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            zIndex: 2,
          }}
        >
          <BrandMark size="md" />
        </div>
      </div>
    )
  }
)

PS5MatchCard.displayName = 'PS5MatchCard'
