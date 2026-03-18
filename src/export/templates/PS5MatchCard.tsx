import React from 'react'
import { Entry, PS5Match } from '@/types/app'
import { formatDate } from '@/lib/utils'
import { BrandMark, BackgroundLayer, InsetFrame, getOneliner, VARIANT_INNER, FONT } from '@/export/templates/shared'

interface PS5MatchCardProps {
  entry: Entry
  backgroundUrl?: string
  variant?: 1 | 2 | 3 | 4
}

const ROOT: React.CSSProperties = {
  width: '1080px',
  height: '1350px',
  backgroundColor: '#0D0B0F',
  fontFamily: FONT.body,
  overflow: 'hidden',
  position: 'relative',
  display: 'flex',
  flexDirection: 'column',
}

const Z2: React.CSSProperties = { position: 'relative', zIndex: 2 }

function getMeta(entry: Entry) {
  const m = entry.metadata as Record<string, unknown>
  const matches = (m?.matches as PS5Match[]) ?? []
  const totalMatches = (m?.total_matches as number) ?? matches.length
  const h2h = (m?.head_to_head_snapshot as Record<string, Record<string, number>>) ?? {}
  return { matches, totalMatches, h2h }
}

function buildPairings(h2h: Record<string, Record<string, number>>) {
  const pairings: Array<{ p1: string; p2: string; p1wins: number; p2wins: number }> = []
  const seen = new Set<string>()
  for (const [p1, opponents] of Object.entries(h2h)) {
    for (const [p2, wins] of Object.entries(opponents)) {
      const key = [p1, p2].sort().join('|')
      if (!seen.has(key)) {
        seen.add(key)
        pairings.push({ p1, p2, p1wins: wins, p2wins: h2h[p2]?.[p1] ?? 0 })
      }
    }
  }
  return pairings
}

function winCounts(h2h: Record<string, Record<string, number>>) {
  const wc: Record<string, number> = {}
  for (const [gent, opponents] of Object.entries(h2h))
    wc[gent] = Object.values(opponents).reduce((a, b) => a + b, 0)
  return wc
}

function GridTexture({ backgroundUrl }: { backgroundUrl?: string }) {
  if (backgroundUrl) return null
  return <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(201,168,76,0.025) 60px, rgba(201,168,76,0.025) 61px), repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(201,168,76,0.025) 60px, rgba(201,168,76,0.025) 61px)', pointerEvents: 'none', zIndex: 1 }} />
}

/* ─── V1: Classic scoreboard ─────────────────────────────────────────────── */

function V1({ entry, backgroundUrl }: PS5MatchCardProps) {
  const { totalMatches, h2h } = getMeta(entry)
  const pairings = buildPairings(h2h)
  const wc = winCounts(h2h)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center', paddingLeft: '80px', paddingRight: '80px' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GridTexture backgroundUrl={backgroundUrl} />
      <div style={{ paddingTop: '64px', width: '100%', ...Z2 }}>
        <span style={{ fontFamily: FONT.body, fontSize: '13px', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: '600' }}>PS5 SESSION</span>
      </div>
      <h1 style={{ fontFamily: FONT.display, fontSize: '52px', fontWeight: '700', color: '#F0EDE8', lineHeight: '1.1', margin: '20px 0 0', alignSelf: 'flex-start', ...Z2 }}>{entry.title}</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '32px', alignSelf: 'flex-start', marginTop: '16px', marginBottom: '48px', ...Z2 }}>
        <span style={{ fontSize: '15px', color: backgroundUrl ? '#A09890' : '#8C8680', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</span>
        <span style={{ fontSize: '15px', color: '#C9A84C', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{totalMatches} Battles</span>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', ...Z2 }}>
        {pairings.map(({ p1, p2, p1wins, p2wins }) => (
          <div key={`${p1}|${p2}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: '16px' }}>
            <span style={{ fontFamily: FONT.mono, fontSize: '26px', color: '#F0EDE8', textTransform: 'capitalize' }}>{p1}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: '32px', color: '#C9A84C', fontWeight: '700' }}>{p1wins} — {p2wins}</span>
            <span style={{ fontFamily: FONT.mono, fontSize: '26px', color: '#F0EDE8', textTransform: 'capitalize' }}>{p2}</span>
          </div>
        ))}
      </div>
      {Object.keys(wc).length > 0 && (
        <div style={{ width: '100%', display: 'flex', gap: '24px', marginBottom: '40px', ...Z2 }}>
          {Object.entries(wc).map(([gent, wins]) => (
            <div key={gent} style={{ flex: 1, backgroundColor: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '4px', padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontFamily: FONT.mono, fontSize: '40px', fontWeight: '700', color: '#C9A84C', lineHeight: '1' }}>{wins}</span>
              <span style={{ fontSize: '13px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase', textAlign: 'center' }}>{gent}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ flex: 1, ...Z2 }} />
      <div style={{ paddingBottom: '56px', display: 'flex', flexDirection: 'column', alignItems: 'center', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

/* ─── V2: Bold winner-focused ────────────────────────────────────────────── */

function V2({ entry, backgroundUrl }: PS5MatchCardProps) {
  const { totalMatches, h2h } = getMeta(entry)
  const wc = winCounts(h2h)
  const oneliner = getOneliner(entry)
  const sorted = Object.entries(wc).sort((a, b) => b[1] - a[1])
  const winner = sorted[0]
  return (
    <div style={{ ...VARIANT_INNER }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GridTexture backgroundUrl={backgroundUrl} />
      {/* Top label */}
      <div style={{ padding: '72px 80px 0', ...Z2 }}>
        <p style={{ fontFamily: FONT.body, fontSize: '13px', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: '600' }}>THE PITCH</p>
      </div>
      {/* Bottom content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '0 80px', ...Z2 }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '80px', fontWeight: '700', color: '#F0EDE8', lineHeight: '0.95', margin: '0 0 24px' }}>{entry.title}</h1>
        {winner && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '24px' }}>
            <span style={{ fontFamily: FONT.display, fontSize: '64px', fontWeight: '700', color: '#C9A84C', lineHeight: '1', textTransform: 'capitalize' }}>{winner[0]}</span>
            <span style={{ fontSize: '20px', color: '#8C8680' }}>wins with {winner[1]} victories</span>
          </div>
        )}
        {oneliner && <p style={{ fontFamily: FONT.display, fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', lineHeight: '1.5', maxWidth: '800px', marginBottom: '24px' }}>{oneliner}</p>}
        <p style={{ fontSize: '15px', color: '#8C8680', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{formatDate(entry.date)} · {totalMatches} battles</p>
      </div>
      <div style={{ padding: '0 80px 64px', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

/* ─── V3: Minimal — oneliner focus ───────────────────────────────────────── */

function V3({ entry, backgroundUrl }: PS5MatchCardProps) {
  const { totalMatches } = getMeta(entry)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GridTexture backgroundUrl={backgroundUrl} />
      {/* Top badge */}
      <div style={{ paddingTop: '80px', ...Z2 }}>
        <div style={{ border: '1px solid rgba(201,168,76,0.4)', borderRadius: '4px', padding: '6px 16px' }}>
          <span style={{ fontFamily: FONT.body, fontSize: '11px', letterSpacing: '0.35em', textTransform: 'uppercase', color: '#C9A84C', fontWeight: '600' }}>THE PITCH</span>
        </div>
      </div>
      {/* Bottom content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: '40px', padding: '0 80px 80px', ...Z2 }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '64px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.05', margin: '0' }}>{entry.title}</h1>
        {oneliner && <p style={{ fontFamily: FONT.display, fontStyle: 'italic', fontSize: '28px', color: '#C8C0B0', textAlign: 'center', lineHeight: '1.45', maxWidth: '780px' }}>"{oneliner}"</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span style={{ fontSize: '14px', color: '#C9A84C', letterSpacing: '0.15em' }}>{totalMatches} BATTLES</span>
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: '#C9A84C', opacity: 0.5 }} />
          <span style={{ fontSize: '14px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</span>
        </div>
        <BrandMark size="sm" />
      </div>
    </div>
  )
}

/* ─── V4: Stats grid ─────────────────────────────────────────────────────── */

function V4({ entry, backgroundUrl }: PS5MatchCardProps) {
  const { totalMatches, h2h } = getMeta(entry)
  const pairings = buildPairings(h2h)
  const oneliner = getOneliner(entry)
  return (
    <div style={{ ...VARIANT_INNER, alignItems: 'center' }}>
      <BackgroundLayer url={backgroundUrl} gradient="strong" />
      <GridTexture backgroundUrl={backgroundUrl} />
      <div style={{ paddingTop: '72px', ...Z2 }}>
        <p style={{ fontFamily: FONT.body, fontSize: '13px', color: '#C9A84C', letterSpacing: '0.4em', textTransform: 'uppercase', fontWeight: '600' }}>PS5 SESSION · {totalMatches} BATTLES</p>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', padding: '0 80px', gap: '40px', ...Z2 }}>
        <h1 style={{ fontFamily: FONT.display, fontSize: '64px', fontWeight: '700', color: '#F0EDE8', textAlign: 'center', lineHeight: '1.05', margin: '0' }}>{entry.title}</h1>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          {pairings.map(({ p1, p2, p1wins, p2wins }) => (
            <div key={`${p1}|${p2}`} style={{ backgroundColor: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '8px', padding: '24px 32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', minWidth: '200px' }}>
              <span style={{ fontSize: '13px', color: '#8C8680', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p1} vs {p2}</span>
              <span style={{ fontFamily: FONT.mono, fontSize: '40px', fontWeight: '700', color: '#C9A84C' }}>{p1wins} — {p2wins}</span>
            </div>
          ))}
        </div>
        {oneliner && <p style={{ fontFamily: FONT.display, fontStyle: 'italic', fontSize: '22px', color: '#C8C0B0', textAlign: 'center', lineHeight: '1.5', maxWidth: '780px' }}>{oneliner}</p>}
        <p style={{ fontSize: '14px', color: '#8C8680', letterSpacing: '0.15em', textTransform: 'uppercase' }}>{formatDate(entry.date)}</p>
      </div>
      <div style={{ paddingBottom: '56px', ...Z2 }}><BrandMark size="md" /></div>
    </div>
  )
}

export const PS5MatchCard = React.forwardRef<HTMLDivElement, PS5MatchCardProps>(
  ({ variant = 1, ...props }, ref) => {
    const inner = (() => {
      switch (variant) { case 2: return <V2 {...props} />; case 3: return <V3 {...props} />; case 4: return <V4 {...props} />; default: return <V1 {...props} /> }
    })()
    return <div ref={ref} style={ROOT}><InsetFrame />{inner}</div>
  }
)
PS5MatchCard.displayName = 'PS5MatchCard'
