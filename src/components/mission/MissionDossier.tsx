import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react'
import type { EntryWithParticipants, EntryPhoto, MissionIntel, PhotoAnalysis } from '@/types/app'
import { DayStickyNav } from './DayStickyNav'
import { DayChapter } from './DayChapter'
import { TripTempoGraph } from './TripTempoGraph'
import { MissionVerdict } from './MissionVerdict'
import { EphemeraGallery } from './EphemeraGallery'
import { HighlightReel } from './HighlightReel'

interface Props {
  entry: EntryWithParticipants
  photos: EntryPhoto[]
  isCreator: boolean
  onEntryUpdate: (entry: EntryWithParticipants) => void
  loreSlot?: ReactNode
  controlsSlot?: ReactNode
}

export function MissionDossier({ entry, photos, isCreator, onEntryUpdate: _onEntryUpdate, loreSlot, controlsSlot }: Props) {
  const intel = (entry.metadata as Record<string, unknown>)?.mission_intel as MissionIntel | undefined
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({})

  // Build analyses map from photos
  const analysesMap = useMemo(() => {
    const map = new Map<string, PhotoAnalysis>()
    for (const p of photos) {
      if (p.ai_analysis) {
        map.set(p.id, p.ai_analysis as PhotoAnalysis)
      }
    }
    return map
  }, [photos])

  // Perspective counts per scene
  const perspectiveCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const notes = intel?.gent_scene_notes ?? []
    for (const note of notes) {
      counts[note.sceneId] = (counts[note.sceneId] ?? 0) + 1
    }
    return counts
  }, [intel])

  // Day nav items
  const dayNavItems = useMemo(() =>
    (intel?.days ?? []).map(d => ({ label: d.label, id: `day-${d.dayIndex}` })),
    [intel]
  )

  const extraNavItems = [
    ...(intel?.highlights?.length ? [{ label: 'Highlights', id: 'highlights' }] : []),
    ...(intel?.verdict ? [{ label: 'Verdict', id: 'verdict' }] : []),
    ...(intel?.ephemera?.length ? [{ label: 'Ephemera', id: 'ephemera' }] : []),
  ]

  // Scroll to section
  const scrollToSection = (id: string) => {
    setActiveDay(id)
    dayRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Track active section on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setActiveDay(e.target.id)
          }
        }
      },
      { threshold: 0.3 }
    )

    for (const el of Object.values(dayRefs.current)) {
      if (el) observer.observe(el)
    }

    return () => observer.disconnect()
  }, [intel])

  // Fallback: if no intel, show basic lore
  if (!intel) {
    return (
      <div className="space-y-6 pb-24">
        {loreSlot}
        {controlsSlot}
      </div>
    )
  }

  return (
    <div className="pb-24">
      {/* Day navigation */}
      {dayNavItems.length > 1 && (
        <DayStickyNav
          days={dayNavItems}
          activeDay={activeDay}
          onDayClick={scrollToSection}
          extraItems={extraNavItems}
        />
      )}

      {/* Trip tempo graph */}
      {intel.tempo.length > 2 && (
        <TripTempoGraph points={intel.tempo} className="px-4 py-3" />
      )}

      {/* Trip arc (overall narrative) */}
      {intel.tripArc && (
        <div className="px-4 py-4 border-b border-ivory/5">
          {intel.tripArc.split('\n\n').map((para, i) => (
            <p key={i} className="text-ivory/70 font-body text-sm leading-relaxed mb-3 last:mb-0">
              {i === 0 && (
                <span className="font-display text-gold text-2xl float-left mr-1.5 mt-0.5 leading-none">
                  {para[0]}
                </span>
              )}
              {i === 0 ? para.slice(1) : para}
            </p>
          ))}
        </div>
      )}

      {/* Day chapters */}
      {intel.days.map(chapter => {
        const dayScenes = intel.scenes.filter(s => chapter.sceneIds.includes(s.id))
        return (
          <div
            key={chapter.dayIndex}
            id={`day-${chapter.dayIndex}`}
            ref={el => { dayRefs.current[`day-${chapter.dayIndex}`] = el }}
            className="py-6 border-b border-ivory/5"
          >
            <DayChapter
              chapter={chapter}
              scenes={dayScenes}
              photos={photos}
              analyses={analysesMap}
              participants={entry.participants ?? []}
              isCreator={isCreator}
              perspectiveCounts={perspectiveCounts}
            />
          </div>
        )
      })}

      {/* Highlight reel */}
      {intel.highlights.length > 0 && (
        <div
          id="highlights"
          ref={el => { dayRefs.current.highlights = el }}
          className="px-4 py-6 border-b border-ivory/5"
        >
          <HighlightReel
            highlightIds={intel.highlights}
            photos={photos}
            analyses={analysesMap}
          />
        </div>
      )}

      {/* Verdict */}
      {intel.verdict && (
        <div
          id="verdict"
          ref={el => { dayRefs.current.verdict = el }}
          className="px-4 py-6 border-b border-ivory/5"
        >
          <MissionVerdict verdict={intel.verdict} />
        </div>
      )}

      {/* Ephemera */}
      {intel.ephemera.length > 0 && (
        <div
          id="ephemera"
          ref={el => { dayRefs.current.ephemera = el }}
          className="px-4 py-6 border-b border-ivory/5"
        >
          <EphemeraGallery ephemera={intel.ephemera} />
        </div>
      )}

      {/* Lore section (existing) */}
      {loreSlot && (
        <div className="px-4 py-6">
          {loreSlot}
        </div>
      )}

      {/* Controls (existing) */}
      {controlsSlot}
    </div>
  )
}
