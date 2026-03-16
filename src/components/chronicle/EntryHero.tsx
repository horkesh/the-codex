import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Move, Check, X, ZoomIn, ZoomOut } from 'lucide-react'
import { formatDate, flagEmoji } from '@/lib/utils'
import { Badge } from '@/components/ui'
import { Avatar } from '@/components/ui'
import { ENTRY_TYPE_IMAGES } from '@/lib/entryTypes'
import { fadeIn } from '@/lib/animations'
import { getFilter } from '@/lib/photoFilters'
import { updateEntry } from '@/data/entries'
import type { FilterId } from '@/lib/photoFilters'
import type { EntryWithParticipants } from '@/types/app'

interface EntryHeroProps {
  entry: EntryWithParticipants
  filterId?: FilterId
  onEntryUpdate?: (entry: EntryWithParticipants) => void
}

interface CoverCrop {
  x: number // object-position x (0-100)
  y: number // object-position y (0-100)
  scale: number // 1 = normal, up to 2
}

function getCrop(entry: EntryWithParticipants): CoverCrop {
  const meta = entry.metadata as Record<string, unknown> | undefined
  return {
    x: (meta?.cover_pos_x as number) ?? 50,
    y: (meta?.cover_pos_y as number) ?? 50,
    scale: (meta?.cover_scale as number) ?? 1,
  }
}

export function EntryHero({ entry, filterId, onEntryUpdate }: EntryHeroProps) {
  const filter = getFilter(filterId)
  const crop = getCrop(entry)

  const [editing, setEditing] = useState(false)
  const [pos, setPos] = useState({ x: crop.x, y: crop.y })
  const [scale, setScale] = useState(crop.scale)
  const dragging = useRef(false)
  const lastTouch = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const hasLocation = entry.city || entry.country
  const locationParts: string[] = []
  if (entry.city) locationParts.push(entry.city)
  if (entry.country) locationParts.push(entry.country)
  const locationStr = locationParts.join(', ')

  const hasCover = !!entry.cover_image_url

  function startEdit() {
    setPos({ x: crop.x, y: crop.y })
    setScale(crop.scale)
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
  }

  async function saveEdit() {
    setEditing(false)
    const meta = { ...(entry.metadata as Record<string, unknown> ?? {}), cover_pos_x: pos.x, cover_pos_y: pos.y, cover_scale: scale }
    const updated = { ...entry, metadata: meta }
    onEntryUpdate?.(updated)
    await updateEntry(entry.id, { metadata: meta } as Partial<EntryWithParticipants>).catch(() => {})
  }

  // Drag-to-pan handlers
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!editing) return
    dragging.current = true
    lastTouch.current = { x: e.clientX, y: e.clientY }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [editing])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !editing || !containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const dx = ((e.clientX - lastTouch.current.x) / rect.width) * -100
    const dy = ((e.clientY - lastTouch.current.y) / rect.height) * -100
    lastTouch.current = { x: e.clientX, y: e.clientY }
    setPos((prev) => ({
      x: Math.max(0, Math.min(100, prev.x + dx)),
      y: Math.max(0, Math.min(100, prev.y + dy)),
    }))
  }, [editing])

  const handlePointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  // Current display values
  const displayPos = editing ? pos : { x: crop.x, y: crop.y }
  const displayScale = editing ? scale : crop.scale

  return (
    <div
      ref={containerRef}
      className="relative w-full h-72 overflow-hidden"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{ touchAction: editing ? 'none' : 'auto', cursor: editing ? 'grab' : 'auto' }}
    >
      {/* Background: cover image or fallback */}
      {entry.cover_image_url ? (
        <motion.img
          src={entry.cover_image_url}
          alt={entry.title}
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            filter: filter.css,
            objectPosition: `${displayPos.x}% ${displayPos.y}%`,
            transform: `scale(${displayScale})`,
            transformOrigin: `${displayPos.x}% ${displayPos.y}%`,
          }}
          variants={fadeIn}
          initial="initial"
          animate="animate"
          draggable={false}
        />
      ) : (
        <motion.img
          src={ENTRY_TYPE_IMAGES[entry.type]}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden
          variants={fadeIn}
          initial="initial"
          animate="animate"
        />
      )}

      {/* Photo filter vignette */}
      {entry.cover_image_url && (
        <div className="absolute inset-0 pointer-events-none" style={{ background: filter.vignette }} />
      )}

      {/* Gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-t from-obsidian via-obsidian/40 to-transparent ${editing ? 'opacity-40' : ''}`} />

      {/* Edit mode UI */}
      {editing && (
        <>
          {/* Crosshair guide */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gold/20" />
            <div className="absolute top-1/2 left-0 right-0 h-px bg-gold/20" />
          </div>

          {/* Drag hint */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="flex items-center gap-2 bg-obsidian/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-gold/20">
              <Move size={14} className="text-gold" />
              <span className="text-xs text-ivory-muted font-body">Drag to pan</span>
            </div>
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-14 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-obsidian/70 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
            <button
              type="button"
              className="p-1 text-ivory-muted hover:text-ivory transition-colors"
              onClick={() => setScale((s) => Math.max(1, +(s - 0.1).toFixed(1)))}
            >
              <ZoomOut size={14} />
            </button>
            <input
              type="range"
              min="1"
              max="2"
              step="0.05"
              value={scale}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="w-24 h-1 accent-gold"
            />
            <button
              type="button"
              className="p-1 text-ivory-muted hover:text-ivory transition-colors"
              onClick={() => setScale((s) => Math.min(2, +(s + 0.1).toFixed(1)))}
            >
              <ZoomIn size={14} />
            </button>
          </div>

          {/* Save / Cancel */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="flex items-center gap-1.5 bg-obsidian/70 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10 text-ivory-muted hover:text-ivory transition-colors"
            >
              <X size={14} />
              <span className="text-xs font-body">Cancel</span>
            </button>
            <button
              type="button"
              onClick={saveEdit}
              className="flex items-center gap-1.5 bg-gold/90 rounded-full px-3 py-1.5 text-obsidian hover:bg-gold transition-colors"
            >
              <Check size={14} />
              <span className="text-xs font-body font-semibold">Save</span>
            </button>
          </div>
        </>
      )}

      {/* Normal mode overlays */}
      {!editing && (
        <>
          {/* Badge + date row */}
          <div className="absolute top-4 left-4 right-4 flex items-start justify-between">
            <Badge type={entry.type} size="sm" />
            <span className="text-xs text-ivory-muted font-body bg-obsidian/60 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10">
              {formatDate(entry.date)}
            </span>
          </div>

          {/* Title + location + participants */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 pt-8">
            <h1 className="font-display text-2xl text-ivory font-bold leading-tight line-clamp-2 mb-2">
              {entry.title}
            </h1>

            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 min-w-0">
                {hasLocation && (
                  <>
                    {entry.country_code && (
                      <span className="text-base leading-none" aria-hidden="true">
                        {flagEmoji(entry.country_code)}
                      </span>
                    )}
                    <span className="text-sm text-ivory-muted truncate">
                      {locationStr}
                    </span>
                  </>
                )}
              </div>

              {entry.participants.length > 0 && (
                <div className="flex items-center shrink-0">
                  {entry.participants.map((gent, idx) => (
                    <div
                      key={gent.id}
                      className="relative"
                      style={{ marginLeft: idx === 0 ? 0 : -8, zIndex: entry.participants.length - idx }}
                    >
                      <Avatar
                        src={gent.avatar_url}
                        name={gent.display_name}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Adjust cover button — only when there's a real cover photo */}
          {hasCover && (
            <button
              type="button"
              onClick={startEdit}
              className="absolute top-4 right-32 flex items-center gap-1.5 bg-obsidian/50 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/10 text-ivory-muted hover:text-ivory hover:border-white/20 transition-colors"
            >
              <Move size={12} />
              <span className="text-[10px] font-body tracking-wide uppercase">Adjust</span>
            </button>
          )}
        </>
      )}
    </div>
  )
}
