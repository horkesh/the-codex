import React from 'react'
import { PassportFrame } from '@/export/templates/shared/PassportFrame'
import { BrandMark } from '@/export/templates/shared/BrandMark'

interface DebriefSlideProps {
  debrief: string
  landmarks: string[]
  highlights: string[]
  riskAssessment: string | null
}

export const DebriefSlide = React.forwardRef<HTMLDivElement, DebriefSlideProps>(
  ({ debrief, landmarks, highlights, riskAssessment }, ref) => {
    return (
      <div ref={ref}>
        <PassportFrame header="BILJE\u0160KE-\u0417\u0410\u0411\u0415\u041B\u0415\u0416\u041A\u0415-OBSERVATIONS">
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

            {/* Classified badge */}
            <div style={{ marginBottom: 20 }}>
              <span style={{
                fontFamily: "'Instrument Sans', sans-serif", fontSize: 10, fontWeight: 600,
                letterSpacing: '0.2em', color: '#c9a84c', textTransform: 'uppercase' as const,
                border: '1px solid rgba(201,168,76,0.35)', padding: '4px 14px', borderRadius: 4,
              }}>
                Classified
              </span>
            </div>

            {/* Debrief text */}
            <p style={{
              fontFamily: 'Georgia, serif', fontSize: 16, color: '#2C2C2C',
              lineHeight: 1.65, marginBottom: 24, whiteSpace: 'pre-wrap' as const,
            }}>
              {debrief}
            </p>

            {/* Landmarks */}
            {landmarks.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 24 }}>
                {landmarks.map((l, i) => (
                  <span key={i} style={{
                    fontFamily: "'Instrument Sans', sans-serif", fontSize: 12, color: '#8B7355',
                    background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.2)',
                    padding: '4px 14px', borderRadius: 16,
                  }}>
                    {l}
                  </span>
                ))}
              </div>
            )}

            {/* Key Moments */}
            {highlights.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                {highlights.map((h, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{
                      fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700,
                      color: 'rgba(201,168,76,0.5)', minWidth: 20,
                    }}>
                      {i + 1}.
                    </span>
                    <span style={{
                      fontFamily: 'Georgia, serif', fontSize: 14, color: '#4A4A4A', lineHeight: 1.5,
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
                background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)',
                borderRadius: 8, padding: '12px 16px', marginBottom: 16,
              }}>
                <div style={{ fontFamily: 'monospace', fontSize: 9, letterSpacing: '0.2em', color: 'rgba(180,130,50,0.6)', textTransform: 'uppercase' as const, marginBottom: 4 }}>
                  Risk Assessment
                </div>
                <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: '#8B6914', fontStyle: 'italic', lineHeight: 1.5 }}>
                  {riskAssessment}
                </div>
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

DebriefSlide.displayName = 'DebriefSlide'
