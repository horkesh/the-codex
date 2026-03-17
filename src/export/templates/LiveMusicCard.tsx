import React from 'react'
import { Entry } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BackgroundLayer, getOneliner } from '@/export/templates/shared'

interface LiveMusicCardProps {
  entry: Entry
  backgroundUrl?: string
  variant?: 1 | 2 | 3 | 4
}

const ROOT: React.CSSProperties = {
  width: '1080px',
  height: '1350px',
  backgroundColor: '#0D0B0F',
  fontFamily: 'var(--font-body)',
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}

const INNER: React.CSSProperties = {
  width: '100%', height: '100%',
  display: 'flex', flexDirection: 'column',
  position: 'relative',
}

const Z2: React.CSSProperties = { position: 'relative', zIndex: 2 }

function getMeta(entry: Entry) {
  const m = entry.metadata as Record<string, unknown>
  return { song: (m?.song as string) ?? null }
}

/* ─── V1: Marquee — Jazz club elegant ──────────────────────────────────────── */

function V1({ entry, backgroundUrl }: LiveMusicCardProps) {
  const { song } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Venue top */}
      <div style={{ paddingTop: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', ...Z2 }}>
        {entry.location && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 600,
            letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C',
          }}>
            {entry.location}
          </span>
        )}
        <div style={{ height: 1, width: 64, backgroundColor: '#C9A84C', marginTop: 16, opacity: 0.5 }} />
      </div>
      {/* Song hero */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 80px', ...Z2 }}>
        {song && (
          <h1 style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 72,
            fontWeight: 700, color: '#F0EDE8', textAlign: 'center', lineHeight: 1.1,
            letterSpacing: '-0.02em', margin: '0 0 32px',
          }}>
            {song}
          </h1>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: song ? 36 : 64,
          fontWeight: 700, color: song ? '#C8C0B0' : '#F0EDE8', textAlign: 'center',
          lineHeight: 1.1, margin: '0 0 24px',
        }}>
          {entry.title}
        </h2>
        {oneliner && (
          <p style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22,
            color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center',
            lineHeight: 1.6, maxWidth: 800,
          }}>
            {oneliner}
          </p>
        )}
      </div>
      {/* Bottom: date + badge */}
      <div style={{ paddingBottom: 72, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, ...Z2 }}>
        <div style={{ border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, padding: '5px 14px' }}>
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 11, letterSpacing: '0.3em',
            textTransform: 'uppercase', color: '#C9A84C', fontWeight: 600,
          }}>
            Live Session
          </span>
        </div>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 15, color: '#8C8680',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {formatDate(entry.date)}
        </span>
      </div>
    </div>
  )
}

/* ─── V2: Poster — Gritty concert poster ───────────────────────────────────── */

function V2({ entry, backgroundUrl }: LiveMusicCardProps) {
  const { song } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Noise texture overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none', opacity: 0.08,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.03) 2px, rgba(255,255,255,0.03) 4px)',
      }} />
      {/* Rough border */}
      <div style={{
        position: 'absolute', inset: 16, zIndex: 1, pointerEvents: 'none',
        border: '2px solid rgba(201,168,76,0.2)',
        boxShadow: 'inset 0 0 30px rgba(0,0,0,0.3)',
      }} />
      {/* Content bottom-aligned */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: 80, ...Z2 }}>
        <p style={{
          fontFamily: 'var(--font-body)', fontSize: 13, color: '#C9A84C',
          letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: 600, marginBottom: 16,
        }}>
          Live
        </p>
        {song && (
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 96, fontWeight: 700,
            color: '#F0EDE8', lineHeight: 0.95, letterSpacing: '-0.03em',
            textTransform: 'uppercase', margin: '0 0 24px',
          }}>
            {song}
          </h1>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: song ? 32 : 72,
          fontWeight: 700, color: song ? '#C8C0B0' : '#F0EDE8',
          lineHeight: 1, margin: '0 0 32px',
        }}>
          {entry.title}
        </h2>
        {oneliner && (
          <p style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 20,
            color: '#C8C0B0', lineHeight: 1.5, maxWidth: 800, marginBottom: 32,
          }}>
            {oneliner}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {entry.location && (
            <span style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: '#C9A84C', letterSpacing: '0.05em' }}>
              {entry.location}
            </span>
          )}
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            {formatDate(entry.date)}
          </span>
        </div>
      </div>
    </div>
  )
}

/* ─── V3: Setlist — Paper setlist card ──────────────────────────────────────── */

function V3({ entry, backgroundUrl }: LiveMusicCardProps) {
  const { song } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...INNER, backgroundColor: '#F5F0E1', alignItems: 'center', justifyContent: 'center' }}>
      {backgroundUrl && <BackgroundLayer url={backgroundUrl} gradient="strong" />}
      {/* Ruled lines */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.12,
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(27,58,92,0.3) 39px, rgba(27,58,92,0.3) 40px)',
      }} />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 32, padding: 80, ...Z2 }}>
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
          letterSpacing: '0.35em', textTransform: 'uppercase', color: '#8B7355',
        }}>
          Setlist
        </span>
        {song && (
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 64, fontWeight: 700,
            color: '#1B3A5C', textAlign: 'center', lineHeight: 1.1, margin: 0,
          }}>
            {song}
          </h1>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: song ? 28 : 56,
          fontWeight: 700, color: song ? '#5A6B7A' : '#1B3A5C',
          textAlign: 'center', lineHeight: 1.1, margin: 0,
        }}>
          {entry.title}
        </h2>
        {entry.location && (
          <span style={{
            fontFamily: 'var(--font-body)', fontSize: 18, color: '#8B7355',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>
            {entry.location}
          </span>
        )}
        <span style={{
          fontFamily: 'var(--font-body)', fontSize: 15, color: '#8B7355',
          letterSpacing: '0.12em', textTransform: 'uppercase',
        }}>
          {formatDate(entry.date)}
        </span>
        {oneliner && (
          <p style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22,
            color: '#5A6B7A', textAlign: 'center', lineHeight: 1.6, maxWidth: 700,
            marginTop: 16,
          }}>
            &ldquo;{oneliner}&rdquo;
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── V4: Vinyl — Record sleeve ─────────────────────────────────────────────── */

function V4({ entry, backgroundUrl }: LiveMusicCardProps) {
  const { song } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...INNER, alignItems: 'center', justifyContent: 'flex-end' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      {/* Vinyl grooves — concentric rings */}
      <svg
        width={500} height={500}
        viewBox="0 0 500 500"
        style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1, opacity: 0.08 }}
      >
        {Array.from({ length: 12 }, (_, i) => (
          <circle key={i} cx={250} cy={250} r={60 + i * 18} fill="none" stroke="#C9A84C" strokeWidth={0.8} />
        ))}
        <circle cx={250} cy={250} r={40} fill="none" stroke="#C9A84C" strokeWidth={2} />
        <circle cx={250} cy={250} r={8} fill="#C9A84C" opacity={0.3} />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, padding: 80, ...Z2 }}>
        {song && (
          <h1 style={{
            fontFamily: 'var(--font-display)', fontSize: 56, fontWeight: 700,
            color: '#F0EDE8', textAlign: 'center', lineHeight: 1.1, margin: 0,
          }}>
            {song}
          </h1>
        )}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: song ? 28 : 56,
          fontWeight: 700, color: song ? '#C8C0B0' : '#F0EDE8',
          textAlign: 'center', lineHeight: 1.1, margin: 0,
        }}>
          {entry.title}
        </h2>
        {entry.location && (
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 18, color: '#C9A84C', letterSpacing: '0.1em' }}>
            {entry.location}
          </span>
        )}
        <span style={{ fontFamily: 'var(--font-body)', fontSize: 15, color: '#8C8680', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {formatDate(entry.date)}
        </span>
        {oneliner && (
          <p style={{
            fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22,
            color: backgroundUrl ? '#C8C0B0' : '#8C8680', textAlign: 'center',
            lineHeight: 1.6, maxWidth: 700, marginTop: 16,
          }}>
            {oneliner}
          </p>
        )}
      </div>
    </div>
  )
}

/* ─── Export ──────────────────────────────────────────────────────────────────── */

export const LiveMusicCard = React.forwardRef<HTMLDivElement, LiveMusicCardProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) {
        case 2: return <V2 {...props} />
        case 3: return <V3 {...props} />
        case 4: return <V4 {...props} />
        default: return <V1 {...props} />
      }
    })()
    return <div ref={ref} style={ROOT}>{inner}</div>
  }
)
LiveMusicCard.displayName = 'LiveMusicCard'
