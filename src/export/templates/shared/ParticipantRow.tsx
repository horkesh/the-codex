import type { Gent } from '@/types/app'
import { FONT, COLOR, aliasDisplay } from './utils'

interface ParticipantRowProps {
  participants: Gent[]
  /** Avatar diameter in px (default 44) */
  size?: number
}

/**
 * Horizontal row of participant avatars + aliases for dark-bg export templates.
 * Mirrors the visa carousel pattern but sized for single-card templates.
 */
export function ParticipantRow({ participants, size = 44 }: ParticipantRowProps) {
  if (participants.length === 0) return null
  const fontSize = Math.round(size * 0.22)
  const labelSize = Math.max(9, Math.round(size * 0.2))

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size * 0.55 }}>
      {participants.map(p => (
        <div key={p.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <div style={{
            width: size, height: size, borderRadius: '50%', overflow: 'hidden',
            border: `1.5px solid ${COLOR.goldFaint}`, background: COLOR.obsidian,
          }}>
            {p.avatar_url ? (
              <img src={p.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize, fontWeight: 600, color: COLOR.gold, fontFamily: FONT.display,
              }}>
                {p.display_name.charAt(0)}
              </div>
            )}
          </div>
          <span style={{
            fontFamily: FONT.body, fontSize: labelSize, color: COLOR.ivoryFaint,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            {aliasDisplay(p.alias, p.full_alias)}
          </span>
        </div>
      ))}
    </div>
  )
}
