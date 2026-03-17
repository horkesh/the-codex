import React from 'react'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'

interface DebriefSlideProps {
  debrief: string
  landmarks: string[]
  highlights: string[]
  riskAssessment: string | null
}

export const DebriefSlide = React.forwardRef<HTMLDivElement, DebriefSlideProps>(
  ({ debrief, landmarks, highlights, riskAssessment }, ref) => {
    return (
      <div ref={ref} style={{ width: 1080, height: 1350 }}>
        <PassportFrame header="BILJE\u0160KE-\u0417\u0410\u0411\u0415\u041B\u0415\u0416\u041A\u0415-OBSERVATIONS">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Classified badge */}
            <div style={{ marginBottom: 28 }}>
              <span style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 14, fontWeight: 600,
                letterSpacing: '0.2em', color: '#c9a84c', textTransform: 'uppercase' as const,
                border: '1.5px solid rgba(201,168,76,0.35)', padding: '6px 20px', borderRadius: 4,
              }}>
                Classified
              </span>
            </div>

            {/* Debrief text */}
            <p style={{
              fontFamily: 'Georgia, serif', fontSize: 22, color: '#2C2C2C',
              lineHeight: 1.65, marginBottom: 28, whiteSpace: 'pre-wrap' as const,
            }}>
              {debrief}
            </p>

            {/* Landmarks */}
            {landmarks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 10, marginBottom: 28 }}>
                {landmarks.map((l, i) => (
                  <span key={i} style={{
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 16, color: '#8B7355',
                    background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
                    padding: '6px 18px', borderRadius: 20,
                  }}>
                    {l}
                  </span>
                ))}
              </div>
            )}

            {/* Key Moments */}
            {highlights.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
                {highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <span style={{
                      fontFamily: "'Playfair Display', serif", fontSize: 22, fontWeight: 700,
                      color: 'rgba(201,168,76,0.5)', minWidth: 28,
                    }}>
                      {i + 1}.
                    </span>
                    <span style={{
                      fontFamily: 'Georgia, serif', fontSize: 20, color: '#4A4A4A', lineHeight: 1.5,
                    }}>
                      {h}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Risk Assessment */}
            {riskAssessment && (
              <div style={{
                background: 'rgba(245,158,11,0.06)', border: '1.5px solid rgba(245,158,11,0.18)',
                borderRadius: 10, padding: '16px 22px', marginBottom: 20,
              }}>
                <div style={{ fontFamily: 'monospace', fontSize: 12, letterSpacing: '0.2em', color: 'rgba(180,130,50,0.6)', textTransform: 'uppercase' as const, marginBottom: 6 }}>
                  Risk Assessment
                </div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 18, color: '#8B6914', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {riskAssessment}
                </div>
              </div>
            )}

            <div style={{ flex: 1 }} />
          </div>
        </PassportFrame>
      </div>
    )
  }
)

DebriefSlide.displayName = 'DebriefSlide'
