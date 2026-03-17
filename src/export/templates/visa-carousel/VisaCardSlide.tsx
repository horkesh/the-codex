import React from 'react'
import type { EntryWithParticipants, PassportStamp } from '@/types/app'
import { flagEmoji } from '@/lib/utils'
import { getOneliner } from '@/export/templates/shared/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface VisaCardSlideProps {
  entry: EntryWithParticipants
  stamp: PassportStamp | null
}

const VISA_MAP: Record<string, string> = {
  HR: 'VIZA', RS: '\u0412\u0418\u0417\u0410', BA: 'VIZA', HU: 'VIZA', ME: 'VIZA', SI: 'VIZUM',
}

function visaWord(cc: string | null): string {
  if (!cc) return 'ENTRY VISA'
  return VISA_MAP[cc.toUpperCase()] ?? 'ENTRY VISA'
}

function monthYear(date: string): string {
  return new Date(date + 'T12:00:00Z')
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

function calcDuration(start: string, end?: string): string | null {
  if (!end) return null
  const s = new Date(start + 'T12:00:00Z')
  const e = new Date(end + 'T12:00:00Z')
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1
  return days <= 0 ? null : days === 1 ? '1 DAY' : `${days} DAYS`
}

export const VisaCardSlide = React.forwardRef<HTMLDivElement, VisaCardSlideProps>(
  ({ entry, stamp }, ref) => {
    const cc = entry.country_code?.toUpperCase() ?? null
    const oneliner = getOneliner(entry)
    const dateEnd = (entry.metadata as Record<string, unknown>)?.date_end as string | undefined
    const duration = calcDuration(entry.date, dateEnd)
    const coverPhoto = entry.cover_image_url

    return (
      <div ref={ref}>
        <PassportFrame header="VIZE-\u0412\u0418\u0417\u0415-VISAS">
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Photo band */}
            {coverPhoto && (
              <div style={{ position: 'relative', height: 380, overflow: 'hidden', margin: '-60px -55px 0', width: 'calc(100% + 110px)' }}>
                <img
                  src={coverPhoto}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', filter: 'sepia(0.08) contrast(1.05)' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, rgba(245,240,225,0.2) 0%, transparent 25%, transparent 50%, rgba(245,240,225,0.95) 100%)',
                }} />
                {/* Flag + VIZA overlaid */}
                <div style={{ position: 'absolute', bottom: 12, left: 55, display: 'flex', alignItems: 'center', gap: 12 }}>
                  {cc && <span style={{ fontSize: 36, lineHeight: 1 }}>{flagEmoji(cc)}</span>}
                  <span style={{
                    fontFamily: "'Playfair Display', Georgia, serif",
                    fontSize: 52,
                    fontWeight: 700,
                    color: '#1B3A5C',
                    letterSpacing: '0.06em',
                    lineHeight: 1,
                    textShadow: '0 1px 4px rgba(245,240,225,0.9)',
                  }}>
                    {visaWord(cc)}
                  </span>
                </div>
              </div>
            )}

            {/* Destination */}
            <div style={{ marginTop: coverPhoto ? 16 : 0, marginBottom: 16 }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 32,
                fontWeight: 700,
                color: '#1B3A5C',
                letterSpacing: '0.03em',
                lineHeight: 1.15,
              }}>
                {(entry.city && entry.country) ? `${entry.city.toUpperCase()}, ${entry.country.toUpperCase()}` : entry.city?.toUpperCase() ?? '\u2014'}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
                <span style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: '#5A6B7A', letterSpacing: '0.08em', textTransform: 'uppercase' as const }}>
                  {monthYear(entry.date)}
                </span>
                {duration && (
                  <span style={{
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 11, fontWeight: 600, color: '#8B7355',
                    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
                    background: 'rgba(139,115,85,0.1)', padding: '3px 10px', borderRadius: 4,
                  }}>
                    {duration}
                  </span>
                )}
              </div>
            </div>

            {/* Bearer row */}
            {entry.participants.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 16, padding: '14px 0',
                borderTop: '1px solid rgba(27,58,92,0.08)', borderBottom: '1px solid rgba(27,58,92,0.08)',
                marginBottom: 16,
              }}>
                <span style={{
                  fontFamily: "'Instrument Sans', sans-serif", fontSize: 9, fontWeight: 600,
                  letterSpacing: '0.2em', color: '#8B7355', textTransform: 'uppercase' as const,
                  writingMode: 'vertical-lr' as const, transform: 'rotate(180deg)',
                }}>
                  Bearers
                </span>
                <div style={{ display: 'flex', gap: 20 }}>
                  {entry.participants.map(p => (
                    <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 40, height: 40, borderRadius: '50%', background: '#d4cfc4',
                        border: '2px solid rgba(27,58,92,0.12)', overflow: 'hidden',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: 16, fontWeight: 600, color: '#1B3A5C' }}>
                            {p.display_name.charAt(0)}
                          </span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 13, fontWeight: 600, color: '#2C2C2C', lineHeight: '1.2' }}>
                          {p.display_name.split(' ')[0]}
                        </div>
                        <div style={{ fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, color: '#8B7355', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>
                          {p.alias === 'lorekeeper' ? 'Lorekeeper' : p.alias === 'bass' ? 'Beard & Bass' : p.alias === 'keys' ? 'Keys & Cocktails' : p.full_alias ?? p.alias}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* One-liner */}
            {oneliner && (
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic', fontSize: 16, color: '#5A6B7A',
                textAlign: 'center', lineHeight: 1.55, padding: '0 20px',
                marginTop: 8,
              }}>
                &ldquo;{oneliner}&rdquo;
              </div>
            )}

            {/* Stamp overlay */}
            {stamp?.image_url ? (
              <img
                src={stamp.image_url}
                alt="Mission stamp"
                style={{
                  position: 'absolute', bottom: 20, right: 0,
                  width: 130, height: 130, borderRadius: '50%',
                  transform: 'rotate(-12deg)', opacity: 0.5, filter: 'sepia(0.15)',
                }}
              />
            ) : (
              <div style={{
                position: 'absolute', bottom: 20, right: 0,
                width: 110, height: 110, border: '3px solid #8B4513', borderRadius: '50%',
                transform: 'rotate(-12deg)', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', textAlign: 'center',
                opacity: 0.45, padding: 8,
              }}>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 10, fontWeight: 700, color: '#8B4513', textTransform: 'uppercase' as const, letterSpacing: '0.06em', lineHeight: 1.15 }}>
                  {entry.city ?? entry.title}
                </span>
                <span style={{ fontFamily: 'Georgia, serif', fontSize: 8, color: '#8B4513', marginTop: 3 }}>
                  {monthYear(entry.date)}
                </span>
              </div>
            )}

            {/* BrandMark at bottom */}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
              <BrandMark size="sm" />
            </div>
          </div>
        </PassportFrame>
      </div>
    )
  }
)

VisaCardSlide.displayName = 'VisaCardSlide'
