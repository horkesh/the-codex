import React from 'react'
import { flagEmoji } from '@/lib/utils'
import { BrandMark, GoldRule, InsetFrame, FONT } from './shared'

interface CityEntry {
  city: string
  count: number
  countryCode: string | null
}

interface YearInReviewProps {
  year: number
  totalMissions: number
  totalCountries: number
  totalCities: number
  totalSteaks: number
  totalNightsOut: number
  totalToasts: number
  totalEntries: number
  topCity?: string
  cities?: CityEntry[]
  stampUrls?: string[]
}

const ROOT: React.CSSProperties = {
  width: '1080px',
  height: '1350px',
  backgroundColor: '#0d0b0f',
  fontFamily: FONT.body,
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}

export const YearInReview = React.forwardRef<HTMLDivElement, YearInReviewProps>(
  ({ year, totalMissions, totalCountries, totalCities, totalSteaks, totalNightsOut, totalToasts, totalEntries, topCity, cities = [], stampUrls = [] }, ref) => {
    // Show up to 9 stamps in a 3×3 grid
    const stamps = stampUrls.slice(0, 9)
    // Top 5 cities
    const topCities = cities.slice(0, 5)

    return (
      <div ref={ref} style={ROOT}>
        <InsetFrame />

        {/* Radial gold glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 40% at 50% 15%, rgba(201,168,76,0.06) 0%, transparent 60%)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', height: '100%', padding: '72px 80px' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <BrandMark size="sm" />
            <span style={{ fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: '600' }}>
              Year in Review
            </span>
          </div>

          {/* Year hero */}
          <div style={{ marginTop: '32px' }}>
            <div style={{ fontFamily: FONT.display, fontSize: '160px', fontWeight: 700, color: '#F0EDE8', lineHeight: 0.85, letterSpacing: '-0.04em' }}>
              {year}
            </div>
            <div style={{ height: '2px', width: '80px', backgroundColor: '#C9A84C', marginTop: '16px', opacity: 0.6 }} />
          </div>

          {/* Stats grid — 2 rows of 3 */}
          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '28px 40px' }}>
            {[
              { label: 'Missions', value: totalMissions },
              { label: 'Countries', value: totalCountries },
              { label: 'Cities', value: totalCities },
              { label: 'Nights Out', value: totalNightsOut },
              { label: 'Steaks', value: totalSteaks },
              { label: 'Toasts', value: totalToasts },
            ].map(({ label, value }) => (
              <div key={label}>
                <div style={{ fontFamily: FONT.display, fontSize: '56px', fontWeight: 700, color: '#C9A84C', lineHeight: 1 }}>
                  {value}
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: '12px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#7a7268', marginTop: '4px' }}>
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* Total entries badge */}
          <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontFamily: FONT.display, fontSize: '32px', fontWeight: 700, color: '#F0EDE8' }}>{totalEntries}</span>
            <span style={{ fontFamily: FONT.body, fontSize: '13px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#7a7268' }}>total chronicles</span>
          </div>

          <div style={{ marginTop: '24px' }}><GoldRule /></div>

          {/* Top cities list + stamp grid side by side */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '40px', flex: 1, minHeight: 0 }}>
            {/* Cities column */}
            <div style={{ flex: 1 }}>
              {topCity && (
                <div style={{ marginBottom: '20px' }}>
                  <span style={{ fontFamily: FONT.body, fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: '#7a7268' }}>Top Destination</span>
                  <div style={{ fontFamily: FONT.display, fontSize: '36px', fontWeight: 700, color: '#C9A84C', lineHeight: 1.1, marginTop: '4px' }}>{topCity}</div>
                </div>
              )}
              {topCities.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topCities.map((c, i) => (
                    <div key={c.city} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontFamily: FONT.display, fontSize: '16px', fontWeight: 700, color: 'rgba(201,168,76,0.4)', width: '24px' }}>{i + 1}</span>
                      {c.countryCode && <span style={{ fontSize: '16px' }}>{flagEmoji(c.countryCode)}</span>}
                      <span style={{ fontFamily: FONT.body, fontSize: '15px', color: '#F0EDE8', fontWeight: 500 }}>{c.city}</span>
                      <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#7a7268' }}>x{c.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Stamps grid */}
            {stamps.length > 0 && (
              <div style={{ width: '340px', flexShrink: 0, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', alignContent: 'start' }}>
                {stamps.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    style={{ width: '100%', aspectRatio: '1', borderRadius: '50%', objectFit: 'cover', opacity: 0.55, filter: 'sepia(0.15)' }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', paddingTop: '16px' }}>
            <GoldRule />
            <span style={{ fontFamily: FONT.body, fontSize: '10px', letterSpacing: '0.3em', textTransform: 'uppercase', color: '#7a7268' }}>The Chronicle Continues</span>
          </div>
        </div>
      </div>
    )
  }
)
YearInReview.displayName = 'YearInReview'
