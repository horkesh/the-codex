import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Scene, EntryPhoto, PhotoAnalysis, Gent } from '@/types/app'
import { cn } from '@/lib/utils'
import { GentPresenceBar } from './GentPresenceBar'

interface Props {
  scene: Scene
  photos: EntryPhoto[]
  analyses?: Map<string, PhotoAnalysis>
  participants?: Gent[]
  isCreator?: boolean
  onEdit?: () => void
  onShowPerspectives?: () => void
  perspectiveCount?: number
}

export function SceneCard({
  scene, photos, analyses, participants = [],
  isCreator, onEdit, onShowPerspectives, perspectiveCount,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  const heroPhoto = useMemo(() => {
    if (scene.heroPhotoId) return photos.find(p => p.id === scene.heroPhotoId)
    return photos[0]
  }, [scene.heroPhotoId, photos])

  const presentAliases = useMemo(() => {
    if (!analyses) return []
    const all = scene.photoIds
      .map(id => analyses.get(id)?.gents_present ?? [])
      .flat()
    return [...new Set(all)]
  }, [scene, analyses])

  const extraPhotos = photos.filter(p => p.id !== heroPhoto?.id)

  return (
    <div className="bg-ivory/[0.03] border border-ivory/5 rounded-lg overflow-hidden">
      {/* Hero photo */}
      {heroPhoto && (
        <div className="relative h-44 overflow-hidden">
          <img
            src={heroPhoto.url}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 to-transparent" />

          {/* Scene time */}
          {scene.startTime && (
            <span className="absolute top-2 right-2 text-[10px] font-mono text-ivory/50 bg-obsidian/50 px-1.5 py-0.5 rounded">
              {scene.startTime}{scene.endTime && scene.endTime !== scene.startTime ? ` – ${scene.endTime}` : ''}
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 space-y-2">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <h4 className="font-display text-ivory text-sm leading-tight">
              {scene.title ?? 'Unknown Scene'}
            </h4>
            {scene.mood && (
              <span className="text-[10px] font-body text-ivory/30 capitalize">{scene.mood}</span>
            )}
          </div>
          {isCreator && onEdit && (
            <button
              onClick={(e) => { e.stopPropagation(); onEdit() }}
              className="p-1 text-ivory/30 hover:text-gold transition-colors shrink-0"
              aria-label="Edit scene"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
              </svg>
            </button>
          )}
        </div>

        {/* Gent presence */}
        {participants.length > 0 && (
          <GentPresenceBar participants={participants} presentAliases={presentAliases} />
        )}

        {/* Narrative */}
        {scene.narrative && (
          <p className="text-ivory/60 font-body text-xs leading-relaxed">
            {scene.narrative}
          </p>
        )}

        {/* Perspectives indicator */}
        {perspectiveCount != null && perspectiveCount > 0 && (
          <button
            onClick={onShowPerspectives}
            className="flex items-center gap-1.5 text-[10px] font-body text-ivory/30 hover:text-gold transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197" />
            </svg>
            {perspectiveCount} {perspectiveCount === 1 ? 'perspective' : 'perspectives'}
          </button>
        )}

        {/* Expandable photo strip */}
        {extraPhotos.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-body text-ivory/30 hover:text-ivory/50 transition-colors"
            >
              {expanded ? 'Hide photos' : `+${extraPhotos.length} more photos`}
            </button>
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="flex gap-1.5 overflow-x-auto scrollbar-hide"
                >
                  {extraPhotos.map(p => (
                    <img
                      key={p.id}
                      src={p.url}
                      alt=""
                      className="w-16 h-16 object-cover rounded flex-shrink-0 border border-ivory/10"
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  )
}
