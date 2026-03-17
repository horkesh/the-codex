import React from 'react'
import type { EntryWithParticipants } from '@/types/app'
import { getOneliner, monthYear, aliasDisplay } from '@/export/templates/shared/utils'
import { getCoverCrop } from '@/lib/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface HeroLoreSlideProps {
  entry: EntryWithParticipants
}

export const HeroLoreSlide = React.forwardRef<HTMLDivElement, HeroLoreSlideProps>(
  ({ entry }, ref) => {
    const oneliner = getOneliner(entry)
    const coverPhoto = entry.cover_image_url
    const crop = getCoverCrop(entry)

    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
        <PassportFrame>
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Cover photo — top half */}
            {coverPhoto && (
              <div style={{ position: 'relative', height: 580, overflow: 'hidden', margin: '-60px -55px 0', width: 'calc(100% + 110px)' }}>
                <img
                  src={coverPhoto}
                  alt=""
                  style={{
                    width: '100%', height: '100%', objectFit: 'cover',
                    objectPosition: `${crop.x}% ${crop.y}%`,
                    transform: crop.scale !== 1 ? `scale(${crop.scale})` : undefined,
                  }}
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
                fontStyle: 'italic', fontSize: 32, color: '#5A6B7A',
                textAlign: 'center', lineHeight: 1.5, padding: '28px 20px 16px',
              }}>
                &ldquo;{oneliner}&rdquo;
              </div>
            )}

            {/* Title + date */}
            <div style={{ textAlign: 'center', marginTop: 12 }}>
              <div style={{
                fontFamily: "'Playfair Display', Georgia, serif",
                fontSize: 36, fontWeight: 700, color: '#1B3A5C', letterSpacing: '0.02em',
              }}>
                {entry.title}
              </div>
              <div style={{
                fontFamily: "'Instrument Sans', sans-serif",
                fontSize: 20, color: '#5A6B7A', letterSpacing: '0.1em',
                textTransform: 'uppercase' as const, marginTop: 8,
              }}>
                {monthYear(entry.date)}
              </div>
            </div>

            {/* Participant avatars */}
            {entry.participants.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 36, marginTop: 36 }}>
                {entry.participants.map(p => (
                  <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: '50%', background: '#d4cfc4',
                      border: '2.5px solid rgba(27,58,92,0.12)', overflow: 'hidden',
                    }}>
                      {p.avatar_url ? (
                        <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 600, color: '#1B3A5C' }}>
                          {p.display_name.charAt(0)}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, color: '#8B7355',
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    }}>
                      {aliasDisplay(p.alias, p.full_alias)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* BrandMark */}
            <div style={{ flex: 1 }} />
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
              <BrandMark size="md" />
            </div>
          </div>
        </PassportFrame>
      </div>
    )
  }
)

HeroLoreSlide.displayName = 'HeroLoreSlide'
