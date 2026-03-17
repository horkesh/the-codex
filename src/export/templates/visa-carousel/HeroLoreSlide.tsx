import React from 'react'
import type { EntryWithParticipants } from '@/types/app'
import { getOneliner, monthYear, aliasDisplay } from '@/export/templates/shared/utils'
import { getCoverCrop } from '@/lib/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'

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

            {/* Polaroid cover photo */}
            {coverPhoto && (
              <div style={{
                alignSelf: 'center',
                background: '#fff',
                padding: '12px 12px 40px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
                transform: 'rotate(1.5deg)',
                marginBottom: 24,
              }}>
                <img
                  src={coverPhoto}
                  alt=""
                  style={{
                    width: 520, height: 400, objectFit: 'cover',
                    objectPosition: `${crop.x}% ${crop.y}%`,
                    transform: crop.scale !== 1 ? `scale(${crop.scale})` : undefined,
                    display: 'block',
                  }}
                />
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

            <div style={{ flex: 1 }} />
          </div>
        </PassportFrame>
      </div>
    )
  }
)

HeroLoreSlide.displayName = 'HeroLoreSlide'
