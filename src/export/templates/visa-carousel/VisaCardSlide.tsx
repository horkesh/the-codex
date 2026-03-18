import React from 'react'
import type { EntryWithParticipants, PassportStamp } from '@/types/app'
import type { CityVisit } from '@/data/entries'
import { flagEmoji, getCoverCrop } from '@/lib/utils'
import { getOneliner, monthYear, calcDuration, visaWord, aliasDisplay, getCityInfo, getCountryVisaInfo, getSeason, SEASON_FILTER, toRoman } from '@/export/templates/shared/utils'
import { BrandMark } from '@/export/templates/shared'

interface VisaCardSlideProps {
  entry: EntryWithParticipants
  stamp: PassportStamp | null
  /** City visit data for companion timeline — optional, provided by Studio */
  cityVisit?: CityVisit | null
}

/* Guilloche wave pattern for border — inlined for html2canvas compat */
function GuillocheFrame() {
  const inset = 20
  const w = 1080 - inset * 2
  const h = 1350 - inset * 2
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: 'absolute', top: inset, left: inset, zIndex: 1, pointerEvents: 'none' }}>
      <defs>
        <pattern id="gc" patternUnits="userSpaceOnUse" width={20} height={20}>
          <path d="M0 10 Q5 0 10 10 Q15 20 20 10" stroke="rgba(100,160,120,0.25)" fill="none" strokeWidth={0.8} />
          <path d="M0 15 Q5 5 10 15 Q15 25 20 15" stroke="rgba(100,160,120,0.15)" fill="none" strokeWidth={0.5} />
        </pattern>
      </defs>
      <rect x={0} y={0} width={w} height={h} rx={8} fill="none" stroke="url(#gc)" strokeWidth={18} />
      <rect x={20} y={20} width={w - 40} height={h - 40} rx={4} fill="none" stroke="rgba(100,160,120,0.12)" strokeWidth={1} />
    </svg>
  )
}

export const VisaCardSlide = React.forwardRef<HTMLDivElement, VisaCardSlideProps>(
  ({ entry, stamp, cityVisit }, ref) => {
    const cc = entry.country_code?.toUpperCase() ?? null
    const oneliner = getOneliner(entry)
    const dateEnd = (entry.metadata as Record<string, unknown>)?.date_end as string | undefined
    const duration = calcDuration(entry.date, dateEnd)
    const coverPhoto = entry.cover_image_url
    const crop = getCoverCrop(entry)
    const cityInfo = getCityInfo(entry.city, entry.id)
    const countryInfo = getCountryVisaInfo(cc)
    const seasonFilter = SEASON_FILTER[getSeason(entry.date)]
    const isReturn = (cityVisit?.visitNumber ?? 1) > 1

    return (
      <div ref={ref} style={{ width: 1080, height: 1350, backgroundColor: '#F5F0E1', position: 'relative', overflow: 'hidden', fontFamily: "Georgia, 'Times New Roman', serif" }}>
        <GuillocheFrame />

        {/* ── Photo band ── */}
        <div style={{ position: 'relative', width: '100%', height: 520, overflow: 'hidden' }}>
          {coverPhoto ? (
            <img
              src={coverPhoto}
              alt=""
              style={{
                width: '100%', height: '100%', objectFit: 'cover',
                objectPosition: `${crop.x}% ${crop.y}%`,
                transform: crop.scale !== 1 ? `scale(${crop.scale})` : undefined,
                display: 'block',
                filter: seasonFilter,
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #1B3A5C 0%, #2C5A8C 100%)' }} />
          )}
          {/* Bottom gradient fade to cream */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160, background: 'linear-gradient(to top, #F5F0E1, transparent)' }} />
          {/* Flag + VIZA/RETURN overlay on photo */}
          <div style={{ position: 'absolute', bottom: 24, left: 55, display: 'flex', alignItems: 'center', gap: 14, zIndex: 2 }}>
            {cc && <span style={{ fontSize: 36, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>{flagEmoji(cc)}</span>}
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 28, fontWeight: 700, color: '#fff',
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
            }}>
              {isReturn ? 'RETURN' : visaWord(cc)}
            </span>
            {isReturn && cityVisit && (
              <span style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 14, fontWeight: 600, color: '#fff',
                letterSpacing: '0.15em', textTransform: 'uppercase' as const,
                background: 'rgba(0,0,0,0.3)', padding: '4px 12px', borderRadius: 4,
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}>
                Mission {toRoman(cityVisit.visitNumber)}
              </span>
            )}
          </div>
          {/* Multi-language header in top-right */}
          <div style={{ position: 'absolute', top: 20, right: 55, zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.15em', color: 'rgba(255,255,255,0.6)', fontVariant: 'small-caps' as const, textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              VIZE-{'\u0412\u0418\u0417\u0415'}-VISAS
            </span>
            {cityInfo && (
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic', fontSize: 12, color: 'rgba(255,255,255,0.45)',
                letterSpacing: '0.04em', textShadow: '0 1px 4px rgba(0,0,0,0.3)',
              }}>
                {cityInfo.greeting}
              </span>
            )}
          </div>
        </div>

        {/* ── Content area ── */}
        <div style={{ position: 'relative', zIndex: 2, padding: '28px 55px 0', display: 'flex', flexDirection: 'column', height: 830, boxSizing: 'border-box' }}>

          {/* Destination */}
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 52, fontWeight: 700, color: '#1B3A5C',
              letterSpacing: '0.02em', lineHeight: 1.05,
            }}>
              {(entry.city && entry.country)
                ? `${entry.city.toUpperCase()}, ${entry.country.toUpperCase()}`
                : entry.city?.toUpperCase() ?? '\u2014'}
            </div>
            {cityInfo && (
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic', fontSize: 20, color: countryInfo.accent,
                letterSpacing: '0.06em', opacity: 0.6, marginTop: 4,
              }}>
                {cityInfo.epithet}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 14 }}>
              <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 20, color: '#5A6B7A', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                {monthYear(entry.date)}
              </span>
              {duration && (
                <span style={{
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 16, fontWeight: 600, color: '#8B7355',
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                  background: 'rgba(139,115,85,0.1)', padding: '5px 14px', borderRadius: 6,
                }}>
                  {duration}
                </span>
              )}
            </div>
          </div>

          {/* Companion timeline strip */}
          {cityVisit && cityVisit.totalVisits > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
              <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 600, letterSpacing: '0.2em', color: '#8B7355', textTransform: 'uppercase' as const, marginRight: 8 }}>
                {entry.city} Timeline
              </span>
              {[...cityVisit.companions, { id: entry.id, date: entry.date }]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map(v => {
                  const isCurrent = v.id === entry.id
                  return (
                    <div key={v.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                      <div style={{ width: '100%', height: 4, borderRadius: 2, background: isCurrent ? countryInfo.accent : `${countryInfo.accent}30` }} />
                      <span style={{ fontFamily: 'monospace', fontSize: 8, color: isCurrent ? '#2C2C2C' : '#8B7355', fontWeight: isCurrent ? 700 : 400 }}>
                        {new Date(v.date + 'T12:00:00Z').toLocaleDateString('en-GB', { month: 'short', year: '2-digit', timeZone: 'UTC' })}
                      </span>
                    </div>
                  )
                })}
            </div>
          )}

          {/* Thin rule */}
          <div style={{ height: 1, background: 'rgba(27,58,92,0.1)', marginBottom: 24 }} />

          {/* Bearer row */}
          {entry.participants.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 28 }}>
              <span style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 11, fontWeight: 600,
                letterSpacing: '0.25em', color: '#8B7355', textTransform: 'uppercase' as const,
                writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)',
              }}>
                Bearers
              </span>
              <div style={{ display: 'flex', gap: 32 }}>
                {entry.participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', background: '#d4cfc4',
                      border: '2.5px solid rgba(27,58,92,0.12)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 20, fontWeight: 600, color: '#1B3A5C' }}>
                          {p.display_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#2C2C2C', lineHeight: '1.2' }}>
                        {p.display_name.split(' ')[0]}
                      </div>
                      <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, color: '#8B7355', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                        {aliasDisplay(p.alias, p.full_alias)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* One-liner + stamp row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, flex: 1 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {oneliner && (
                <div style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic', fontSize: 24, color: '#5A6B7A',
                  lineHeight: 1.55,
                }}>
                  &ldquo;{oneliner}&rdquo;
                </div>
              )}
            </div>
            {stamp?.image_url ? (
              <img
                src={stamp.image_url}
                alt="Mission stamp"
                style={{
                  width: 160, height: 160, borderRadius: '50%', flexShrink: 0,
                  transform: 'rotate(-12deg)', opacity: 0.45, filter: 'sepia(0.15)',
                }}
              />
            ) : (
              <div style={{
                width: 140, height: 140, border: '3px solid #8B4513', borderRadius: '50%',
                transform: 'rotate(-12deg)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                opacity: 0.4, padding: 10, flexShrink: 0,
              }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 15, fontWeight: 700, color: '#8B4513', textTransform: 'uppercase' as const, letterSpacing: '0.06em', lineHeight: 1.15 }}>
                  {entry.city ?? entry.title}
                </span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#8B4513', marginTop: 4 }}>
                  {monthYear(entry.date)}
                </span>
              </div>
            )}
          </div>

          {/* BrandMark */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 16, paddingTop: 12 }}>
            <BrandMark size="md" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 8, width: '100%', textAlign: 'center', fontSize: 8, letterSpacing: '0.3em', color: 'rgba(27,58,92,0.25)', textTransform: 'uppercase' as const, zIndex: 3 }}>
          THE GENTS CHRONICLES
        </div>
      </div>
    )
  }
)

VisaCardSlide.displayName = 'VisaCardSlide'
