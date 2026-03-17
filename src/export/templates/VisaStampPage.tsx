import React from 'react'
import type { Entry } from '@/types/app'
import { flagEmoji } from '@/lib/utils'
import { getOneliner } from '@/export/templates/shared/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface VisaStampPageProps {
  entry: Entry
  backgroundUrl?: string
}

const VISA_LABELS: Record<string, string> = {
  HR: 'VIZA',
  BA: 'VIZA',
  RS: '\u0412\u0418\u0417\u0410',
  ME: '\u0412\u0418\u0417\u0410',
  HU: 'VIZA',
  SI: 'VIZUM',
}

function getVisaLabel(cc: string | null | undefined): string {
  if (!cc) return 'ENTRY VISA'
  return VISA_LABELS[cc.toUpperCase()] ?? 'ENTRY VISA'
}

function formatMonthYear(date: string): string {
  return new Date(date + 'T12:00:00Z')
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 13,
  fontWeight: 700,
  color: '#1B3A5C',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  width: 260,
  flexShrink: 0,
}

const VALUE_STYLE: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 16,
  color: '#2C2C2C',
  fontWeight: 500,
}

export const VisaStampPage = React.forwardRef<HTMLDivElement, VisaStampPageProps>(
  ({ entry }, ref) => {
    const participantCount = 'participants' in entry
      ? (entry as unknown as { participants: unknown[] }).participants.length
      : 0
    const gentsDisplay = participantCount > 3 ? `3+${participantCount - 3}` : String(participantCount || '\u2014')
    const oneliner = getOneliner(entry)
    const meta = entry.metadata as Record<string, unknown> | undefined
    const stampImageUrl = meta?.stamp_image_url as string | undefined

    return (
      <div ref={ref}>
        <PassportFrame header="VIZE-\u0412\u0418\u0417\u0415-VISAS">
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Row 1 — Country emblem + VIZA header */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 14, alignItems: 'center' }}>
              {entry.country_code && (
                <span style={{ fontSize: 38, lineHeight: 1 }}>
                  {flagEmoji(entry.country_code)}
                </span>
              )}
              <span
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontSize: 54,
                  fontWeight: 700,
                  color: '#1B3A5C',
                  letterSpacing: '0.08em',
                }}
              >
                {getVisaLabel(entry.country_code)}
              </span>
            </div>

            {/* Cover photo — polaroid style */}
            {entry.cover_image_url && (
              <div
                style={{
                  position: 'absolute',
                  right: 40,
                  top: 80,
                  width: 200,
                  background: '#FFFFFF',
                  padding: '6px 6px 24px',
                  boxShadow: '2px 3px 12px rgba(0,0,0,0.12)',
                  transform: 'rotate(5deg)',
                  zIndex: 4,
                }}
              >
                {/* Tape */}
                <div
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: 14,
                    width: 40,
                    height: 12,
                    background: 'rgba(200,190,160,0.55)',
                    transform: 'rotate(-14deg)',
                    borderRadius: 1,
                  }}
                />
                <img
                  src={entry.cover_image_url}
                  alt=""
                  style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }}
                />
              </div>
            )}

            {/* Data fields */}
            <div style={{ marginTop: 160, display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', borderBottom: '1px solid rgba(27,58,92,0.08)', paddingBottom: 10 }}>
                <span style={LABEL_STYLE}>Destination:</span>
                <span style={VALUE_STYLE}>
                  {entry.city?.toUpperCase() || entry.location?.toUpperCase() || '\u2014'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', borderBottom: '1px solid rgba(27,58,92,0.08)', paddingBottom: 10 }}>
                <span style={LABEL_STYLE}>Date of Trip:</span>
                <span style={VALUE_STYLE}>{formatMonthYear(entry.date)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline', borderBottom: '1px solid rgba(27,58,92,0.08)', paddingBottom: 10 }}>
                <span style={LABEL_STYLE}>Number of Gents:</span>
                <span style={VALUE_STYLE}>{gentsDisplay}</span>
              </div>
            </div>

            {/* Lore one-liner */}
            {oneliner && (
              <div
                style={{
                  fontFamily: "'Playfair Display', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: 14,
                  color: '#8B7355',
                  textAlign: 'center',
                  marginTop: 32,
                  lineHeight: 1.5,
                  padding: '0 20px',
                }}
              >
                &ldquo;{oneliner}&rdquo;
              </div>
            )}

            {/* Mission stamp */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                paddingBottom: 24,
                marginTop: 20,
              }}
            >
              {stampImageUrl ? (
                <img
                  src={stampImageUrl}
                  alt="Mission stamp"
                  style={{
                    width: 120,
                    height: 120,
                    borderRadius: '50%',
                    transform: 'rotate(-6deg)',
                    opacity: 0.7,
                    filter: 'sepia(0.15)',
                  }}
                />
              ) : (
                <div
                  style={{
                    border: '3px solid #8B4513',
                    borderRadius: 8,
                    padding: '14px 28px',
                    transform: 'rotate(-6deg)',
                    display: 'inline-block',
                    textAlign: 'center',
                    opacity: 0.65,
                  }}
                >
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: '#8B4513',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      fontFamily: 'Georgia, serif',
                      lineHeight: 1.2,
                      maxWidth: 180,
                    }}
                  >
                    {entry.title}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: '#8B4513',
                      letterSpacing: '0.12em',
                      fontFamily: 'Georgia, serif',
                      marginTop: 6,
                    }}
                  >
                    {formatMonthYear(entry.date)}
                  </div>
                </div>
              )}
            </div>

            {/* BrandMark */}
            <div style={{ display: 'flex', justifyContent: 'center', paddingBottom: 8 }}>
              <BrandMark size="sm" />
            </div>
          </div>
        </PassportFrame>
      </div>
    )
  }
)

VisaStampPage.displayName = 'VisaStampPage'
