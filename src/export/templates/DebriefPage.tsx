import React from 'react'
import type { Entry } from '@/types/app'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'

interface DebriefPageProps {
  entry: Entry
  backgroundUrl?: string
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export const DebriefPage = React.forwardRef<HTMLDivElement, DebriefPageProps>(
  ({ entry }, ref) => {
    const meta = entry.metadata as Record<string, unknown>
    const debrief = meta?.mission_debrief as string | undefined
    const landmarks = Array.isArray(meta?.landmarks) ? (meta.landmarks as string[]) : []
    const riskAssessment = meta?.risk_assessment as string | undefined

    const locationParts = [entry.city, entry.country].filter(Boolean).join(', ')
    const subtitle = locationParts
      ? `${locationParts} — ${formatDate(entry.date)}`
      : formatDate(entry.date)

    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
        <PassportFrame header="BILJEŠKE-ЗАБЕЛЕЖКЕ-OBSERVATIONS">
          {/* Mission title */}
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: '#1B3A5C',
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              lineHeight: 1.2,
            }}
          >
            {entry.title}
          </div>

          {/* Location + Date */}
          <div
            style={{
              fontSize: 13,
              color: '#5A7A9A',
              textAlign: 'center',
              fontFamily: 'Georgia, serif',
              marginTop: 8,
            }}
          >
            {subtitle}
          </div>

          {/* Gold divider */}
          <div
            style={{
              width: '60%',
              height: 1,
              background: '#C9A84C',
              margin: '20px auto',
              opacity: 0.5,
            }}
          />

          {/* Debrief text or empty state */}
          {debrief ? (
            <div
              style={{
                fontSize: 14,
                color: '#2C2C2C',
                lineHeight: 1.75,
                fontFamily: '"Instrument Sans", sans-serif',
                textAlign: 'justify',
                whiteSpace: 'pre-wrap',
              }}
            >
              {debrief}
            </div>
          ) : (
            <div
              style={{
                fontSize: 24,
                color: 'rgba(27,58,92,0.15)',
                fontWeight: 700,
                letterSpacing: '0.2em',
                textAlign: 'center',
                marginTop: 100,
              }}
            >
              AWAITING FIELD REPORT
            </div>
          )}

          {/* Landmarks */}
          {landmarks.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: '0.2em',
                  color: '#1B3A5C',
                  textTransform: 'uppercase',
                  marginTop: 24,
                  marginBottom: 8,
                }}
              >
                LOCATIONS IDENTIFIED
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#5A7A9A',
                  fontStyle: 'italic',
                }}
              >
                {landmarks.join(' — ')}
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          {riskAssessment && (
            <div
              style={{
                border: '1px solid rgba(139,69,19,0.3)',
                borderRadius: 6,
                padding: '12px 16px',
                marginTop: 20,
                background: 'rgba(139,69,19,0.03)',
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: '0.2em',
                  color: '#8B4513',
                  textTransform: 'uppercase',
                  marginBottom: 6,
                }}
              >
                RISK ASSESSMENT
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: '#5A4A3A',
                  fontStyle: 'italic',
                  lineHeight: 1.5,
                }}
              >
                {riskAssessment}
              </div>
            </div>
          )}
        </PassportFrame>
      </div>
    )
  }
)

DebriefPage.displayName = 'DebriefPage'
