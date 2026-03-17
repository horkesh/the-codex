import React from 'react'
import type { Entry } from '@/types/app'
import { flagEmoji } from '@/lib/utils'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'

interface VisaStampPageProps {
  entry: Entry
  backgroundUrl?: string
}

const VISA_LABELS: Record<string, string> = {
  HR: 'VIZA',
  BA: 'VIZA',
  RS: '\u0412\u0418\u0417\u0410',
  ME: '\u0412\u0418\u0417\u0410',
}

function getVisaLabel(countryCode: string | null | undefined): string {
  if (!countryCode) return 'ENTRY VISA'
  return VISA_LABELS[countryCode.toUpperCase()] ?? 'ENTRY VISA'
}

function formatMonthYear(date: string): string {
  return new Date(date + 'T12:00:00Z')
    .toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

function formatStampDate(date: string): string {
  return new Date(date + 'T12:00:00Z')
    .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .toUpperCase()
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 14,
  fontWeight: 700,
  color: '#1B3A5C',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  width: 280,
  flexShrink: 0,
}

const VALUE_STYLE: React.CSSProperties = {
  fontFamily: 'Georgia, serif',
  fontSize: 16,
  color: '#2C2C2C',
}

export const VisaStampPage = React.forwardRef<HTMLDivElement, VisaStampPageProps>(
  ({ entry }, ref) => {
    const participantCount = 'participants' in entry
      ? (entry as unknown as { participants: unknown[] }).participants.length
      : 0

    return (
      <div ref={ref}>
        <PassportFrame header="VIZE-\u0412\u0418\u0417\u0415-VISAS">
          {/* Content wrapper — relative for polaroid positioning */}
          <div style={{ position: 'relative', flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Row 1 — Country emblem + VIZA header */}
            <div style={{ display: 'flex', flexDirection: 'row', gap: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 40, lineHeight: 1 }}>
                {entry.country_code ? flagEmoji(entry.country_code) : ''}
              </span>
              <span
                style={{
                  fontFamily: 'Georgia, serif',
                  fontSize: 56,
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
                  right: 50,
                  top: 100,
                  width: 220,
                  background: '#FFFFFF',
                  padding: '8px 8px 30px',
                  boxShadow: '2px 3px 12px rgba(0,0,0,0.15)',
                  transform: 'rotate(4deg)',
                  zIndex: 4,
                }}
              >
                {/* Tape effect */}
                <div
                  style={{
                    position: 'absolute',
                    top: -4,
                    left: 10,
                    width: 50,
                    height: 14,
                    background: 'rgba(200,190,160,0.6)',
                    transform: 'rotate(-20deg)',
                  }}
                />
                <img
                  src={entry.cover_image_url}
                  alt=""
                  style={{
                    width: '100%',
                    height: 180,
                    objectFit: 'cover',
                    display: 'block',
                  }}
                />
              </div>
            )}

            {/* Data fields */}
            <div style={{ marginTop: 180, display: 'flex', flexDirection: 'column', gap: 28 }}>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
                <span style={LABEL_STYLE}>DESTINATION:</span>
                <span style={VALUE_STYLE}>
                  {entry.city?.toUpperCase() || entry.location?.toUpperCase() || '\u2014'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
                <span style={LABEL_STYLE}>DATE OF TRIP:</span>
                <span style={VALUE_STYLE}>{formatMonthYear(entry.date)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'baseline' }}>
                <span style={LABEL_STYLE}>NUMBER OF GENTS:</span>
                <span style={VALUE_STYLE}>{participantCount > 0 ? String(participantCount) : '\u2014'}</span>
              </div>
            </div>

            {/* Mission stamp area */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-end',
                paddingBottom: 40,
              }}
            >
              <div
                style={{
                  border: '3px solid #8B4513',
                  borderRadius: 8,
                  padding: '12px 24px',
                  transform: 'rotate(-6deg)',
                  display: 'inline-block',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: '#8B4513',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    fontFamily: 'Georgia, serif',
                  }}
                >
                  {entry.title}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: '#8B4513',
                    letterSpacing: '0.15em',
                    fontFamily: 'Georgia, serif',
                    marginTop: 4,
                  }}
                >
                  {formatStampDate(entry.date)}
                </div>
              </div>
            </div>
          </div>
        </PassportFrame>
      </div>
    )
  }
)

VisaStampPage.displayName = 'VisaStampPage'
