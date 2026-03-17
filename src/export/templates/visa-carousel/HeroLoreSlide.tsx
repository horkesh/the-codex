import React from 'react'
import type { EntryWithParticipants } from '@/types/app'
import { getOneliner } from '@/export/templates/shared/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface HeroLoreSlideProps {
  entry: EntryWithParticipants
}

function monthYear(date: string): string {
  return new Date(date + 'T12:00:00Z')
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

export const HeroLoreSlide = React.forwardRef<HTMLDivElement, HeroLoreSlideProps>(
  ({ entry }, ref) => {
    const oneliner = getOneliner(entry)
    const coverPhoto = entry.cover_image_url

    return (
      <div ref={ref}>
        <PassportFrame>
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Cover photo — top half */}
            {coverPhoto && (
              <div style={{ position: 'relative', height: 580, overflow: 'hidden', margin: '-60px -55px 0', width: 'calc(100% + 110px)' }}>
                <img
                  src={coverPhoto}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(180deg, transparent 50%, rgba(245,240,225,0.95) 100%)',
                }} />
              </div>
            )}

            {/* One-liner */}
            {oneliner && (
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontStyle: 'italic', fontSize: 22, color: '#5A6B7A',
                textAlign: 'center', lineHeight: 1.55, padding: '24px 30px 16px',
              }}>
                &ldquo;{oneliner}&rdquo;
              </div>
            )}

            {/* Title + date */}
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 22, fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.02em',
              }}>
                {entry.title}
              </div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 14, color: '#5A6B7A', letterSpacing: '0.1em',
                textTransform: 'uppercase' as const, marginTop: 6,
              }}>
                {monthYear(entry.date)}
              </div>
            </div>

            {/* Participant avatars */}
            {entry.participants.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginTop: 32 }}>
                {entry.participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: '50%', background: '#d4cfc4',
                      border: '2px solid rgba(27,58,92,0.12)', overflow: 'hidden',
                    }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 600, color: '#1B3A5C' }}>
                          {p.display_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, color: '#8B7355',
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    }}>
                      {p.alias === 'lorekeeper' ? 'Lorekeeper' : p.alias === 'bass' ? 'Beard & Bass' : p.alias === 'keys' ? 'Keys & Cocktails' : p.full_alias ?? p.alias}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* BrandMark */}
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

HeroLoreSlide.displayName = 'HeroLoreSlide'
