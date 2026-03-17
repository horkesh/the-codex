import React from 'react'
import type { EntryWithParticipants, PassportStamp } from '@/types/app'
import { flagEmoji, getCoverCrop } from '@/lib/utils'
import { getOneliner, monthYear, calcDuration, visaWord, aliasDisplay } from '@/export/templates/shared/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'

interface VisaCardSlideProps {
  entry: EntryWithParticipants
  stamp: PassportStamp | null
}

export const VisaCardSlide = React.forwardRef<HTMLDivElement, VisaCardSlideProps>(
  ({ entry, stamp }, ref) => {
    const cc = entry.country_code?.toUpperCase() ?? null
    const oneliner = getOneliner(entry)
    const dateEnd = (entry.metadata as Record<string, unknown>)?.date_end as string | undefined
    const duration = calcDuration(entry.date, dateEnd)
    const coverPhoto = entry.cover_image_url
    const crop = getCoverCrop(entry)

    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
        <PassportFrame header="VIZE-\u0412\u0418\u0417\u0415-VISAS">
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Flag + VIZA header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
              {cc && <span style={{ fontSize: 48, lineHeight: 1 }}>{flagEmoji(cc)}</span>}
              <span style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 64,
                fontWeight: 700,
                color: '#1B3A5C',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}>
                {visaWord(cc)}
              </span>
            </div>

            {/* Polaroid photo */}
            {coverPhoto && (
              <div style={{
                alignSelf: 'center',
                background: '#fff',
                padding: '12px 12px 40px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
                transform: 'rotate(-2deg)',
                marginBottom: 24,
              }}>
                <img
                  src={coverPhoto}
                  alt=""
                  style={{
                    width: 420, height: 320, objectFit: 'cover',
                    objectPosition: `${crop.x}% ${crop.y}%`,
                    transform: crop.scale !== 1 ? `scale(${crop.scale})` : undefined,
                    filter: 'sepia(0.08) contrast(1.05)',
                    display: 'block',
                  }}
                />
              </div>
            )}

            {/* Destination */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 48,
                fontWeight: 700,
                color: '#1B3A5C',
                letterSpacing: '0.03em',
                lineHeight: 1.1,
              }}>
                {(entry.city && entry.country) ? `${entry.city.toUpperCase()}, ${entry.country.toUpperCase()}` : entry.city?.toUpperCase() ?? '\u2014'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 10 }}>
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

            {/* Bearer row */}
            {entry.participants.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 20, padding: '18px 0',
                borderTop: '1.5px solid rgba(27,58,92,0.08)', borderBottom: '1.5px solid rgba(27,58,92,0.08)',
                marginBottom: 20,
              }}>
                <span style={{
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, fontWeight: 600,
                  letterSpacing: '0.2em', color: '#8B7355', textTransform: 'uppercase' as const,
                  writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)',
                }}>
                  Bearers
                </span>
                <div style={{ display: 'flex', gap: 28 }}>
                  {entry.participants.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{
                        width: 56, height: 56, borderRadius: '50%', background: '#d4cfc4',
                        border: '2.5px solid rgba(27,58,92,0.12)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 22, fontWeight: 600, color: '#1B3A5C' }}>
                            {p.display_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 20, fontWeight: 600, color: '#2C2C2C', lineHeight: '1.2' }}>
                          {p.display_name.split(' ')[0]}
                        </div>
                        <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: '#8B7355', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                          {aliasDisplay(p.alias, p.full_alias)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* One-liner + stamp row */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginTop: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {oneliner && (
                  <div style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontStyle: 'italic', fontSize: 24, color: '#5A6B7A',
                    lineHeight: 1.5,
                  }}>
                    &ldquo;{oneliner}&rdquo;
                  </div>
                )}
              </div>
              {/* Stamp — in flow, not overlapping */}
              {stamp?.image_url ? (
                <img
                  src={stamp.image_url}
                  alt="Mission stamp"
                  style={{
                    width: 150, height: 150, borderRadius: '50%', flexShrink: 0,
                    transform: 'rotate(-12deg)', opacity: 0.5, filter: 'sepia(0.15)',
                  }}
                />
              ) : (
                <div style={{
                  width: 130, height: 130, border: '3px solid #8B4513', borderRadius: '50%',
                  transform: 'rotate(-12deg)', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                  opacity: 0.45, padding: 10, flexShrink: 0,
                }}>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 14, fontWeight: 700, color: '#8B4513', textTransform: 'uppercase' as const, letterSpacing: '0.06em', lineHeight: 1.15 }}>
                    {entry.city ?? entry.title}
                  </span>
                  <span style={{ fontFamily: 'Georgia, serif', fontSize: 11, color: '#8B4513', marginTop: 4 }}>
                    {monthYear(entry.date)}
                  </span>
                </div>
              )}
            </div>

            {/* Bottom spacing for BrandMark in PassportFrame */}
            <div style={{ flex: 1 }} />
          </div>
        </PassportFrame>
      </div>
    )
  }
)

VisaCardSlide.displayName = 'VisaCardSlide'
