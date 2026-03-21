import React from 'react'
import type { EntryWithParticipants, PassportStamp } from '@/types/app'
import type { CityVisit } from '@/data/entries'
import { flagEmoji, getCoverCrop } from '@/lib/utils'
import { getOneliner, monthYear, calcDuration, visaWord, aliasDisplay, getCityInfo, getCountryVisaInfo, getSeason, SEASON_FILTER, toRoman, visaNumber } from '@/export/templates/shared/utils'
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

    const visaNo = visaNumber(entry.id, cc)
    const entryDate = new Date(entry.date + 'T12:00:00Z')
    const exitDate = dateEnd ? new Date(dateEnd + 'T12:00:00Z') : null
    const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })

    return (
      <div ref={ref} style={{ width: 1080, height: 1350, backgroundColor: '#F5F0E1', position: 'relative', overflow: 'hidden', fontFamily: "Georgia, 'Times New Roman', serif", display: 'flex', flexDirection: 'column' }}>
        <GuillocheFrame />

        {/* ── Country header (above photo) ── */}
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '28px 55px 14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 6 }}>
            {cc && <span style={{ fontSize: 28, lineHeight: 1 }}>{flagEmoji(cc)}</span>}
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 18, fontWeight: 600, letterSpacing: '0.15em',
              color: countryInfo.accent, textTransform: 'uppercase' as const,
            }}>
              {countryInfo.header}
            </span>
          </div>
          <div style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 14, fontWeight: 600, letterSpacing: '0.2em',
            color: '#5A6B7A', textTransform: 'uppercase' as const,
          }}>
            V\u00cdZUM &middot; VISA &middot; VISUM
          </div>
          {cityInfo && (
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontStyle: 'italic', fontSize: 14, color: countryInfo.accent,
              opacity: 0.5, letterSpacing: '0.04em', marginTop: 4,
            }}>
              {cityInfo.greeting}
            </div>
          )}
          <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.15em', color: '#8B7355', marginTop: 4 }}>
            No. {visaNo}
          </div>
        </div>

        {/* ── Photo band ── */}
        <div style={{ position: 'relative', width: '100%', height: 600, overflow: 'hidden', flexShrink: 0 }}>
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
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 120, background: 'linear-gradient(to top, #F5F0E1, transparent)' }} />
          {/* Flag + VIZA/RETURN overlay on photo */}
          <div style={{ position: 'absolute', bottom: 16, left: 55, display: 'flex', alignItems: 'center', gap: 14, zIndex: 2 }}>
            {cc && <span style={{ fontSize: 36, lineHeight: 1, filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}>{flagEmoji(cc)}</span>}
            <span style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 52, fontWeight: 700, color: '#fff',
              letterSpacing: '0.06em', textTransform: 'uppercase' as const,
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
              }}>
                Mission {toRoman(cityVisit.visitNumber)}
              </span>
            )}
          </div>
        </div>

        {/* ── Content area ── */}
        <div style={{ position: 'relative', zIndex: 2, padding: '16px 55px 0', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>

          {/* Destination + epithet + month/duration */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontFamily: "'Playfair Display', Georgia, serif",
              fontSize: 42, fontWeight: 700, color: '#1B3A5C',
              letterSpacing: '0.02em', lineHeight: 1.05,
            }}>
              {(entry.city && entry.country)
                ? `${entry.city.toUpperCase()}, ${entry.country.toUpperCase()}`
                : entry.city?.toUpperCase() ?? '\u2014'}
            </div>
            {cityInfo && (
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic', fontSize: 18, color: countryInfo.accent,
                letterSpacing: '0.06em', opacity: 0.6, marginTop: 2,
              }}>
                {cityInfo.epithet}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10 }}>
              <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 18, color: '#5A6B7A', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                {monthYear(entry.date)}
              </span>
              {duration && (
                <span style={{
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, fontWeight: 600, color: '#8B7355',
                  letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                  background: 'rgba(139,115,85,0.1)', padding: '4px 12px', borderRadius: 6,
                }}>
                  {duration}
                </span>
              )}
            </div>
          </div>

          {/* Entry / Exit / Type row — matching in-app */}
          <div style={{ display: 'flex', borderTop: '1px solid rgba(27,58,92,0.1)', borderBottom: '1px solid rgba(27,58,92,0.1)', padding: '12px 0', marginBottom: 18 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#8B7355', textTransform: 'uppercase' as const, marginBottom: 4 }}>Entry</div>
              <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 18, color: '#2C2C2C' }}>{fmtDate(entryDate)}</div>
            </div>
            {exitDate && (
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#8B7355', textTransform: 'uppercase' as const, marginBottom: 4 }}>Exit</div>
                <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 18, color: '#2C2C2C' }}>{fmtDate(exitDate)}</div>
              </div>
            )}
            {duration && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: '0.2em', color: '#8B7355', textTransform: 'uppercase' as const, marginBottom: 4 }}>Type</div>
                <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 18, color: '#2C2C2C' }}>{duration}</div>
              </div>
            )}
          </div>

          {/* Bearer row */}
          {entry.participants.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
              <span style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, fontWeight: 600,
                letterSpacing: '0.25em', color: '#8B7355', textTransform: 'uppercase' as const,
                writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)',
              }}>
                Bearers
              </span>
              <div style={{ display: 'flex', gap: 28 }}>
                {entry.participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', background: '#d4cfc4',
                      border: '2px solid rgba(27,58,92,0.12)', overflow: 'hidden',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span style={{ fontSize: 18, fontWeight: 600, color: '#1B3A5C' }}>
                          {p.display_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 18, fontWeight: 600, color: '#2C2C2C', lineHeight: '1.2' }}>
                        {p.display_name.split(' ')[0]}
                      </div>
                      <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 11, color: '#8B7355', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                        {aliasDisplay(p.alias, p.full_alias)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* One-liner + stamp row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {oneliner && (
                <div style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic', fontSize: 22, color: '#5A6B7A',
                  lineHeight: 1.5,
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
                  width: 130, height: 130, borderRadius: '50%', flexShrink: 0,
                  transform: 'rotate(-12deg)', opacity: 0.45, filter: 'sepia(0.15)',
                }}
              />
            ) : (
              <div style={{
                width: 120, height: 120, border: '3px solid #8B4513', borderRadius: '50%',
                transform: 'rotate(-12deg)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                opacity: 0.4, padding: 8, flexShrink: 0,
              }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#8B4513', textTransform: 'uppercase' as const, letterSpacing: '0.06em', lineHeight: 1.15 }}>
                  {entry.city ?? entry.title}
                </span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 10, color: '#8B4513', marginTop: 3 }}>
                  {monthYear(entry.date)}
                </span>
              </div>
            )}
          </div>

          {/* BrandMark */}
          <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 12, marginTop: 24 }}>
            <BrandMark size="sm" />
          </div>
        </div>

        {/* Footer */}
        <div style={{ position: 'absolute', bottom: 6, width: '100%', textAlign: 'center', fontSize: 8, letterSpacing: '0.3em', color: 'rgba(27,58,92,0.25)', textTransform: 'uppercase' as const, zIndex: 3 }}>
          THE GENTS CHRONICLES
        </div>
      </div>
    )
  }
)

VisaCardSlide.displayName = 'VisaCardSlide'
