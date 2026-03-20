import type { DayChapter as DayChapterType, EntryPhoto, PhotoAnalysis, Scene, Gent } from '@/types/app'
import { SceneCard } from './SceneCard'
import { RouteMap } from './RouteMap'

interface Props {
  chapter: DayChapterType
  scenes: Scene[]
  photos: EntryPhoto[]
  analyses: Map<string, PhotoAnalysis>
  participants: Gent[]
  isCreator: boolean
  onEditScene?: (scene: Scene) => void
  onShowPerspectives?: (scene: Scene) => void
  perspectiveCounts?: Record<string, number>
}

export function DayChapter({
  chapter, scenes, photos, analyses, participants,
  isCreator, onEditScene, onShowPerspectives, perspectiveCounts,
}: Props) {
  const dayPhotos = photos.filter(p => chapter.photoIds.includes(p.id))

  return (
    <section className="space-y-4">
      {/* Day header */}
      <div className="px-4">
        <h2 className="font-display text-gold text-lg">{chapter.label}</h2>
        <div className="flex gap-3 mt-1">
          <span className="text-[10px] font-body text-ivory/30">
            {chapter.stats.photoCount} photos
          </span>
          <span className="text-[10px] font-body text-ivory/30">
            {chapter.stats.sceneCount} scenes
          </span>
          {chapter.stats.venuesVisited.length > 0 && (
            <span className="text-[10px] font-body text-ivory/30">
              {chapter.stats.venuesVisited.length} venues
            </span>
          )}
        </div>
      </div>

      {/* Morning briefing */}
      {chapter.briefing && (
        <div className="px-4">
          <p className="text-ivory/40 font-body text-xs italic leading-relaxed border-l-2 border-gold/20 pl-3">
            {chapter.briefing}
          </p>
        </div>
      )}

      {/* Route map */}
      {chapter.route && chapter.route.points.length >= 2 && (
        <div className="px-4">
          <RouteMap route={chapter.route} dayLabel={chapter.label} />
        </div>
      )}

      {/* Scene cards */}
      <div className="px-4 space-y-3">
        {scenes.map(scene => {
          const scenePhotos = photos.filter(p => scene.photoIds.includes(p.id))
          return (
            <SceneCard
              key={scene.id}
              scene={scene}
              photos={scenePhotos}
              analyses={analyses}
              participants={participants}
              isCreator={isCreator}
              onEdit={onEditScene ? () => onEditScene(scene) : undefined}
              onShowPerspectives={onShowPerspectives ? () => onShowPerspectives(scene) : undefined}
              perspectiveCount={perspectiveCounts?.[scene.id]}
            />
          )
        })}
      </div>

      {/* Day narrative */}
      {chapter.narrative && (
        <div className="px-4">
          <p className="text-ivory/70 font-body text-sm leading-relaxed">
            {chapter.narrative}
          </p>
        </div>
      )}

      {/* Evening debrief */}
      {chapter.debrief && (
        <div className="px-4">
          <p className="text-ivory/40 font-body text-xs italic leading-relaxed border-l-2 border-gold/20 pl-3">
            {chapter.debrief}
          </p>
        </div>
      )}

      {/* Food/drink inventory */}
      {chapter.stats.foodDrinks.length > 0 && (
        <div className="px-4">
          <div className="flex flex-wrap gap-1.5">
            {chapter.stats.foodDrinks.map((item, i) => (
              <span
                key={i}
                className="px-2 py-0.5 text-[10px] font-body text-ivory/40 border border-ivory/10 rounded-full"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
