/**
 * Shared overlapping avatar stack for Momento overlays.
 * Renders gent avatars as overlapping circles with initial fallback.
 */
import type { Gent } from '@/types/app'
import { FONT } from '@/export/templates/shared/utils'

interface AvatarStackProps {
  gents: Gent[]
  size?: number
  overlap?: number
  borderWidth?: number
  borderColor?: string
  fallbackColor?: string
  boxShadow?: string
}

export function AvatarStack({
  gents,
  size = 24,
  overlap = 4,
  borderWidth = 1,
  borderColor = '#C9A84C',
  fallbackColor = '#C9A84C',
  boxShadow,
}: AvatarStackProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {gents.map((g, i) => (
        <div
          key={g.id}
          style={{
            width: `${size}px`,
            height: `${size}px`,
            borderRadius: '50%',
            border: `${borderWidth}px solid ${borderColor}`,
            boxShadow,
            overflow: 'hidden',
            marginLeft: i > 0 ? `-${overlap}px` : 0,
            position: 'relative',
            zIndex: gents.length - i,
            backgroundColor: '#1e1a28',
          }}
        >
          {g.avatar_url ? (
            <img
              src={g.avatar_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: `${Math.round(size * 0.4)}px`,
              color: fallbackColor,
              fontFamily: FONT.body,
              fontWeight: '600',
            }}>
              {g.display_name?.charAt(0)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
