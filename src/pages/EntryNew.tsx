import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Unlock, BookOpen, MapPin, ChevronRight } from 'lucide-react'
import { TopBar } from '@/components/layout'
import { PageWrapper } from '@/components/layout'
import { EntryTypeSelector } from '@/components/chronicle/EntryTypeSelector'
import { ParticipantSelector } from '@/components/chronicle/ParticipantSelector'
import { PhotoUpload, usePendingPhotos } from '@/components/chronicle/PhotoUpload'
import { LocationSearchModal } from '@/components/places/LocationSearchModal'
import { fetchLocations } from '@/data/locations'
import { MissionForm } from '@/components/chronicle/forms/MissionForm'
import { NightOutForm } from '@/components/chronicle/forms/NightOutForm'
import { SteakForm } from '@/components/chronicle/forms/SteakForm'
import { PlaystationForm } from '@/components/chronicle/forms/PlaystationForm'
import { ToastForm } from '@/components/chronicle/forms/ToastForm'
import { InterludeForm } from '@/components/chronicle/forms/InterludeForm'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { createEntry, addEntryParticipants, addPersonAppearances, updateEntryCover, updateEntryLore, updateEntry } from '@/data/entries'
import { fetchAllGents } from '@/data/gents'
import { ContactTagger } from '@/components/chronicle/ContactTagger'
import { fetchProspectById, updateProspect } from '@/data/prospects'
import { launchToastSession } from '@/ai/toast'
import { generateLoreFull } from '@/ai/lore'
import { generateTitle } from '@/ai/title'
import { notifyOthers } from '@/hooks/usePushNotifications'
import { generateCover } from '@/ai/cover'
import { generateStamp } from '@/ai/stamp'
import { createMissionStamp, updateStampImage } from '@/data/stamps'
import { groupIntoDays } from '@/lib/dayBoundary'
import { MissionProcessingOverlay, type ProcessingStage } from '@/components/mission/MissionProcessingOverlay'
import { clusterIntoScenes } from '@/lib/sceneEngine'
import { analyzePhotos, enrichScenesWithAnalysis } from '@/ai/missionIntel'
import { generateMissionNarrative } from '@/ai/missionLore'
import { buildMissionIntel, mergeNarratives } from '@/lib/missionIntelBuilder'
import { fetchCrossMissionContext, fetchEntryPhotos } from '@/data/entries'
import type { MissionIntel, EntryPhoto, StoryDayEpisode } from '@/types/app'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { fadeUp } from '@/lib/animations'
import type { EntryType, PS5Match, GentAlias } from '@/types/app'
import type { LocationFill } from '@/lib/geo'
import type { SavedLocation } from '@/types/app'
import type { MissionFormData } from '@/components/chronicle/forms/MissionForm'
import type { NightOutFormData } from '@/components/chronicle/forms/NightOutForm'
import type { SteakFormData } from '@/components/chronicle/forms/SteakForm'
import type { PlaystationFormData } from '@/components/chronicle/forms/PlaystationForm'
import type { ToastFormData } from '@/components/chronicle/forms/ToastForm'
import type { InterludeFormData } from '@/components/chronicle/forms/InterludeForm'

type Step = 'select' | 'form'

// Generic + type-specific mood pills
const GENERIC_MOODS = ['Chaotic', 'Elegant', 'Spontaneous', 'Mellow', 'Nostalgic', 'Euphoric']
const TYPE_MOODS: Partial<Record<EntryType, string[]>> = {
  mission:     ['Adventurous', 'Cultural', 'Hedonistic', 'Exhausting'],
  night_out:   ['Rowdy', 'Sophisticated', 'Late Night', 'Dance Floor'],
  steak:       ['Indulgent', 'Refined', 'Experimental', 'Carnivorous'],
  playstation: ['Competitive', 'Grudge Match', 'Casual', 'Heated'],
  toast:       ['Confessional', 'Intimate', 'Electric', 'Unhinged', 'Sophisticated', 'Late Night'],
  gathering:   ['Intimate', 'Grand', 'Impromptu', 'Festive'],
  interlude:   ['Reflective', 'Serendipitous', 'Fleeting', 'Quiet'],
}
function getMoodOptions(type: EntryType | null): string[] {
  return [...GENERIC_MOODS, ...(type ? TYPE_MOODS[type] ?? [] : [])]
}

// Compute a head-to-head snapshot from match list
function buildH2HSnapshot(matches: PS5Match[]): Record<string, Record<string, number>> {
  const snapshot: Record<string, Record<string, number>> = {}
  for (const match of matches) {
    if (!match.winner) continue
    const loser: GentAlias = match.winner === match.p1 ? match.p2 : match.p1
    if (!snapshot[match.winner]) snapshot[match.winner] = {}
    snapshot[match.winner][loser] = (snapshot[match.winner][loser] ?? 0) + 1
  }
  return snapshot
}

export default function EntryNew() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  const [step, setStep] = useState<Step>('select')
  const [selectedType, setSelectedType] = useState<EntryType | null>(null)
  const [participants, setParticipants] = useState<string[]>(() => (gent ? [gent.id] : []))
  const [submitting, setSubmitting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null)
  const [missionStage, setMissionStage] = useState<ProcessingStage | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState({ done: 0, total: 0 })
  const [locationFill, setLocationFill] = useState<LocationFill | undefined>()
  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([])
  const [prospectId, setProspectId] = useState<string | null>(null)
  const [prospectPrefill, setProspectPrefill] = useState<{
    title: string
    date: string
    location: string
    city: string
    country: string
  } | null>(null)
  const [visibility, setVisibility] = useState<'shared' | 'private'>('shared')
  const [taggedPeople, setTaggedPeople] = useState<string[]>([])
  const [moodTags, setMoodTags] = useState<string[]>([])
  const [fullChronicle, setFullChronicle] = useState(false)
  const [suggestedTitle, setSuggestedTitle] = useState<string | null>(null)
  const [showLocationSearch, setShowLocationSearch] = useState(false)
  const [photoGps, setPhotoGps] = useState<{ lat: number; lng: number }[]>([])
  const titleGenFired = useRef(false)
  const firstPhotoRef = useRef<File | null>(null)
  const prospectHandled = useRef(false)
  const handleGeoDetected = useCallback((loc: LocationFill) => setLocationFill(loc), [])
  const handleGpsCollected = useCallback((points: { lat: number; lng: number }[]) => {
    setPhotoGps(prev => [...prev, ...points])
  }, [])

  useEffect(() => {
    fetchLocations().then(setSavedPlaces)
  }, [])

  // Reset mood/chronicle state when entry type changes
  useEffect(() => {
    setMoodTags([])
    setFullChronicle(false)
  }, [selectedType])

  // Prospect pre-fill: read query params once and pre-populate the form
  useEffect(() => {
    if (prospectHandled.current) return
    const fromProspect = searchParams.get('from') === 'prospect'
    const pid = searchParams.get('id')
    if (!fromProspect || !pid) return
    prospectHandled.current = true
    setProspectId(pid)
    fetchProspectById(pid).then((prospect) => {
      if (!prospect) return
      const today = new Date().toISOString().split('T')[0]
      setProspectPrefill({
        title: prospect.event_name ?? prospect.venue_name ?? '',
        date: prospect.event_date ?? today,
        location: prospect.venue_name ?? '',
        city: prospect.city ?? '',
        country: prospect.country ?? '',
      })
      setSelectedType('night_out')
      setStep('form')
    }).catch(() => {})
  }, [searchParams])

  const maxPhotos = selectedType === 'mission' ? 40 : selectedType === 'night_out' ? 15 : 10
  const { pendingFiles, addFiles: rawAddFiles, removeFile, uploadAll, clearFiles } = usePendingPhotos(maxPhotos)

  const handleRetitle = useCallback(() => {
    if (pendingFiles.length === 0 || !selectedType) return
    titleGenFired.current = false
    generateTitle(pendingFiles[0], selectedType, {
      location: locationFill?.location,
      city: locationFill?.city,
      country: locationFill?.country,
      date: locationFill?.date,
    }).then((title) => {
      if (title) setSuggestedTitle(title)
    })
  }, [pendingFiles, selectedType, locationFill])

  // Wrap addFiles to store the first photo for deferred title generation
  const addFiles = useCallback((files: File[]) => {
    rawAddFiles(files)
    if (!titleGenFired.current && files.length > 0 && selectedType) {
      firstPhotoRef.current = files[0]
      // Fallback: if geo detection doesn't fire within 3s, generate without location
      setTimeout(() => {
        if (!titleGenFired.current && firstPhotoRef.current && selectedType) {
          titleGenFired.current = true
          generateTitle(firstPhotoRef.current, selectedType, {
            location: locationFill?.location,
            city: locationFill?.city,
            country: locationFill?.country,
            date: locationFill?.date,
          }).then((title) => {
            if (title) setSuggestedTitle(title)
          })
        }
      }, 3000)
    }
  }, [rawAddFiles, selectedType, locationFill])

  // Fire title gen immediately when location arrives (if photo is pending)
  useEffect(() => {
    if (!locationFill || !firstPhotoRef.current || titleGenFired.current || !selectedType) return
    titleGenFired.current = true
    generateTitle(firstPhotoRef.current, selectedType, {
      location: locationFill.location,
      city: locationFill.city,
      country: locationFill.country,
      date: locationFill.date,
    }).then((title) => {
      if (title) setSuggestedTitle(title)
    })
  }, [locationFill, selectedType])

  function handleTypeSelect(type: EntryType) {
    if (type === 'gathering') {
      navigate('/gathering/new')
      return
    }
    if (type === 'toast') {
      launchToastSession(gent!.id).catch((err) => {
        console.error('Failed to launch Toast:', err)
        setSelectedType(type)
        setStep('form')
      })
      return
    }
    setSelectedType(type)
    setStep('form')
  }

  // Generic submit handler — called by each form with its specific data
  async function handleSubmit(formData: {
    title: string
    date: string
    location?: string
    city?: string
    country?: string
    country_code?: string
    description?: string
    metadata?: Record<string, unknown>
  }) {
    if (!gent || !selectedType) return
    setSubmitting(true)

    try {
      // 1. Create the entry — fall back to geo-detected city/country when form doesn't provide them
      const city = formData.city || locationFill?.city || undefined
      const country = formData.country || locationFill?.country || undefined
      const country_code = formData.country_code || locationFill?.country_code || undefined
      const entry = await createEntry({
        type: selectedType,
        title: formData.title,
        date: formData.date,
        location: formData.location || locationFill?.location || undefined,
        city,
        country,
        country_code,
        description: formData.description ?? undefined,
        metadata: {
          ...(formData.metadata ?? {}),
          ...(locationFill?.time ? { time_of_day: locationFill.time } : {}),
          ...(moodTags.length > 0 ? { mood_tags: moodTags } : {}),
          ...(fullChronicle ? { full_chronicle: true } : {}),
          ...(photoGps.length > 0 ? { photo_gps: photoGps } : {}),
        },
        created_by: gent.id,
        visibility,
      })

      // 2. Add participants (always include creator)
      const allParticipantIds = Array.from(new Set([gent.id, ...participants]))
      if (allParticipantIds.length > 0) {
        await addEntryParticipants(entry.id, allParticipantIds)
      }

      // Fetch all gent objects for participant names in AI narratives
      const allGents = await fetchAllGents()
      const participantGents = allGents.filter((g) => allParticipantIds.includes(g.id))

      // 2b. Tag people present (person_appearances)
      if (taggedPeople.length > 0) {
        addPersonAppearances(entry.id, taggedPeople, gent.id, allParticipantIds).catch(() => {})
      }

      // 3. Upload pending photos; promote first to cover image
      let uploadedUrls: string[] = []
      if (pendingFiles.length > 0) {
        if (selectedType === 'mission') setMissionStage('uploading')
        setUploadProgress({ done: 0, total: pendingFiles.length })
        const { urls, firstError } = await uploadAll(entry.id, (done, total) => setUploadProgress({ done, total }))
        uploadedUrls = urls
        setUploadProgress(null)
        clearFiles()
        if (uploadedUrls[0]) {
          await updateEntryCover(entry.id, uploadedUrls[0])
        } else {
          // All uploads failed — show the actual error so we can diagnose
          addToast(`Upload failed: ${firstError ?? 'unknown error'}`, 'error')
        }
      }

      // 4. For missions, run the full intelligence pipeline
      if (selectedType === 'mission' && city && country && uploadedUrls.length > 0) {
        try {
          // Stage: EXIF extraction (photos already uploaded with GPS)
          setMissionStage('extracting_exif')
          const freshPhotos = await fetchEntryPhotos(entry.id) as unknown as EntryPhoto[]

          // Build and save day_episodes to entry metadata
          const dateEnd = (formData.metadata as Record<string, unknown>)?.date_end as string | undefined
          const photoData = freshPhotos.map(p => {
            let exifDate: string | null = null
            let exifTime: string | null = null
            if (p.exif_taken_at) {
              const d = new Date(p.exif_taken_at)
              exifDate = d.toISOString().split('T')[0]
              exifTime = d.toISOString().split('T')[1]?.slice(0, 5) ?? null
            }
            return { id: p.id, exifDate, exifTime }
          })
          const dayEps = groupIntoDays(photoData, formData.date, dateEnd)
          if (dayEps.length >= 1) {
            const metaWithDays = { ...(entry.metadata as Record<string, unknown> ?? {}), day_episodes: dayEps }
            await updateEntry(entry.id, { metadata: metaWithDays } as Partial<typeof entry>).catch(() => {})
            Object.assign(entry, { metadata: metaWithDays })
          }

          // Stage: Scene clustering
          setMissionStage('clustering_scenes')
          const rawScenes = clusterIntoScenes(freshPhotos, formData.date, dateEnd)

          // Stage: AI photo analysis
          setMissionStage('analyzing_photos')
          const analyses = await analyzePhotos(
            freshPhotos, 'mission', city, country,
            (done, total) => setAnalysisProgress({ done, total }),
          )
          const enrichedScenes = enrichScenesWithAnalysis(rawScenes, analyses)

          // Stage: Narrative generation
          setMissionStage('generating_narrative')
          const crossContext = await fetchCrossMissionContext(city, entry.id).catch(() => null)
          const entryForNarrative = { ...entry, participants: participantGents }
          const soundtrackMood = (formData.metadata as Record<string, unknown>)?.soundtrack as { overall_mood?: string } | undefined
          const narrativeResult = await generateMissionNarrative(
            entryForNarrative, enrichedScenes, analyses, uploadedUrls,
            crossContext, null, soundtrackMood?.overall_mood,
          )

          // Stage: Build intel
          setMissionStage('building_intel')
          const baseIntel = buildMissionIntel(freshPhotos, enrichedScenes, analyses)
          const fullIntel: MissionIntel = narrativeResult
            ? mergeNarratives({
                ...baseIntel,
                tripArc: null, verdict: null,
                crossMissionRefs: [], processed_at: new Date().toISOString(),
              }, narrativeResult)
            : { ...baseIntel, tripArc: null, verdict: null,
                crossMissionRefs: [], processed_at: new Date().toISOString() }

          // Save intel + lore — also populate day_episodes with per-day narratives
          const prevMeta = entry.metadata as Record<string, unknown> ?? {}
          const existingEpisodes = prevMeta.day_episodes as StoryDayEpisode[] | undefined
          const updatedMeta: Record<string, unknown> = {
            ...prevMeta,
            mission_intel: fullIntel,
            lore_oneliner: narrativeResult?.oneliner ?? null,
          }
          // Copy per-day narratives from mission_intel.days to day_episodes
          if (existingEpisodes && fullIntel.days) {
            updatedMeta.day_episodes = existingEpisodes.map((ep, i) => ({
              ...ep,
              lore: fullIntel.days[i]?.narrative ?? ep.lore,
            }))
          }
          const titleUpdate = narrativeResult?.titles?.[0]
          await updateEntry(entry.id, {
            metadata: updatedMeta,
            ...(titleUpdate ? { title: titleUpdate } : {}),
          } as Partial<typeof entry>)
          if (narrativeResult?.arc) {
            await updateEntryLore(entry.id, narrativeResult.arc)
          }

          setMissionStage('complete')
        } catch (err) {
          console.error('Mission intelligence pipeline error:', err)
          setMissionStage(null)
          // Fallback to legacy lore generation — use day labels from entry metadata
          const entryWithParticipants = { ...entry, participants: participantGents }
          const fbMeta = entry.metadata as Record<string, unknown> | undefined
          const fbEpisodes = fbMeta?.day_episodes as StoryDayEpisode[] | undefined
          const fallbackDayLabels = fbEpisodes && fbEpisodes.length > 1
            ? fbEpisodes.map(d => d.label)
            : undefined
          // Build per-day photo index mapping — map photoIds to indices in uploadedUrls
          // uploadedUrls corresponds to the same order as the entry photos
          const allPhotoIds = fbEpisodes?.flatMap(ep => ep.photoIds) ?? []
          const fbPhotoIndices = fbEpisodes && fbEpisodes.length > 1
            ? fbEpisodes.map(ep => ep.photoIds.map(pid => allPhotoIds.indexOf(pid)).filter(idx => idx >= 0))
            : undefined
          generateLoreFull(entryWithParticipants, uploadedUrls, fallbackDayLabels, fbPhotoIndices).then(async (result) => {
            if (!result) return
            const meta: Record<string, unknown> = { ...(fbMeta ?? {}), lore_oneliner: result.oneliner }
            // Save per-day lore + selected photos to entry.metadata.day_episodes
            if (result.day_lore && fbEpisodes) {
              meta.day_episodes = fbEpisodes.map((ep, i) => {
                // Map AI-selected photo indices back to photo IDs
                const selectedIds = result.day_selected_photos?.[i]
                  ?.map(idx => allPhotoIds[idx])
                  .filter((id): id is string => !!id) ?? ep.selectedPhotoIds
                return {
                  ...ep,
                  lore: result.day_lore?.[i] || ep.lore,
                  oneliner: result.day_oneliners?.[i] || ep.oneliner,
                  selectedPhotoIds: selectedIds,
                }
              })
            }
            const updates: Partial<typeof entry> = { metadata: meta } as Partial<typeof entry>
            if (result.suggested_title) updates.title = result.suggested_title
            await Promise.all([updateEntryLore(entry.id, result.lore), updateEntry(entry.id, updates)])
          }).catch(() => {})
        }
      } else {
        // Non-mission entries: use existing lore pipeline
        const entryWithParticipants = { ...entry, participants: participantGents }
        generateLoreFull(entryWithParticipants, uploadedUrls).then(async (result) => {
          if (!result) return
          try {
            const meta = { ...(entry.metadata as Record<string, unknown> ?? {}), lore_oneliner: result.oneliner }
            const updates: Partial<typeof entry> = { metadata: meta } as Partial<typeof entry>
            if (result.suggested_title) updates.title = result.suggested_title
            await Promise.all([updateEntryLore(entry.id, result.lore), updateEntry(entry.id, updates)])
          } catch { /* non-critical */ }
        }).catch(() => {})
      }

      // 5. AI cover only when no photo was uploaded (interlude never gets AI cover)
      if (uploadedUrls.length === 0 && selectedType !== 'interlude') {
        generateCover(entry).catch(() => {
          // silently ignore
        })
      }

      // 5b. Auto-create passport stamp for missions (story already created in step 4)
      if (selectedType === 'mission' && city && country) {
        createMissionStamp({
          id: entry.id,
          title: formData.title,
          city,
          country,
          country_code: country_code ?? '',
          date: formData.date,
        }).then((stamp) => {
          generateStamp(stamp).then((url) => {
            if (url) updateStampImage(stamp.id, url).catch(() => {})
          }).catch(() => {})
        }).catch(() => {})
      }

      // 6. If coming from a prospect, mark it as converted
      if (prospectId) {
        updateProspect(prospectId, { status: 'converted', converted_entry_id: entry.id }).catch(() => {})
      }

      // 7. Notify other gents (fire-and-forget)
      notifyOthers({
        title: `New ${ENTRY_TYPE_META[selectedType].label} logged`,
        body: formData.title,
        url: `/chronicle/${entry.id}`,
        tag: `entry-${entry.id}`,
        senderGentId: gent.id,
      })

      // 8. Success toast + navigate
      addToast('Entry logged.', 'success')
      navigate(`/chronicle/${entry.id}`)
    } catch (err) {
      console.error('Failed to create entry:', err)
      addToast('Something went wrong. Please try again.', 'error')
      setSubmitting(false)
    }
  }

  // Form-type-specific submit wrappers
  async function submitMission(data: MissionFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      city: data.city,
      country: data.country,
      country_code: data.country_code,
      location: data.location,
      description: data.description,
      metadata: data.date_end ? { date_end: data.date_end } : undefined,
    })
  }

  async function submitNightOut(data: NightOutFormData) {
    const meta: Record<string, unknown> = {}
    if (data.flavour) meta.flavour = data.flavour
    if (data.song) meta.song = data.song
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location,
      description: data.description,
      metadata: Object.keys(meta).length > 0 ? meta : undefined,
    })
  }

  async function submitSteak(data: SteakFormData) {
    const meta: Record<string, unknown> = {
      cut: data.cut || null,
      score: data.score ? parseFloat(data.score) : null,
      verdict: data.verdict || null,
    }
    if (data.flavour) meta.flavour = data.flavour
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location,
      description: data.description,
      metadata: meta,
    })
  }

  async function submitPlaystation(data: PlaystationFormData) {
    const head_to_head_snapshot = buildH2HSnapshot(data.matches)
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location,
      metadata: {
        matches: data.matches,
        head_to_head_snapshot,
        total_matches: data.matches.length,
      },
    })
  }

  async function submitToast(data: ToastFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location,
      description: data.description,
    })
  }

  async function submitInterlude(data: InterludeFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      description: data.description,
    })
  }

  const typeMeta = selectedType ? ENTRY_TYPE_META[selectedType] : null
  const topBarTitle =
    step === 'select'
      ? 'New Entry'
      : typeMeta
        ? `New ${typeMeta.label}`
        : 'New Entry'

  // Render the appropriate form for the selected type
  function renderForm() {
    if (!selectedType) return null

    return (
      <motion.div
        key={selectedType}
        variants={fadeUp}
        initial="initial"
        animate="animate"
        className="flex flex-col gap-6 pb-4"
      >
        {/* Type badge */}
        <div className="flex items-center gap-2 pt-1">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center shrink-0"
            style={{ background: `color-mix(in srgb, ${typeMeta?.borderColor} 60%, transparent)` }}
          >
            {typeMeta && <typeMeta.Icon size={16} aria-hidden="true" />}
          </div>
          <span className="text-ivory-muted font-body text-sm">{typeMeta?.label}</span>
        </div>

        {/* Photos — primary action, placed prominently at the top */}
        <PhotoUpload
          entryId={null}
          maxPhotos={maxPhotos}
          onGeoDetected={handleGeoDetected}
          onGpsCollected={handleGpsCollected}
          onFilesAdded={addFiles}
          onFileRemoved={removeFile}
          className="w-full"
        />

        {/* Location bar — tappable to open search, like Instagram */}
        {selectedType !== 'interlude' && (
          <>
            {locationFill?.city || locationFill?.location || locationFill?.matchedPlaceName ? (
              <button
                type="button"
                onClick={() => setShowLocationSearch(true)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-gold/8 border border-gold/20 w-full text-left group"
              >
                <MapPin size={14} className="text-gold shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-gold text-xs font-body truncate">
                    {locationFill.matchedPlaceName || locationFill.location || locationFill.city}
                  </p>
                  {locationFill.city && (locationFill.matchedPlaceName || locationFill.location) && (
                    <p className="text-gold/60 text-[10px] font-body truncate">
                      {locationFill.city}{locationFill.country ? `, ${locationFill.country}` : ''}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className="text-gold/40 group-hover:text-gold/60 shrink-0 transition-colors" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLocationSearch(true)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-dashed border-white/15 w-full text-left group hover:border-white/25 transition-colors"
              >
                <MapPin size={14} className="text-ivory-dim shrink-0" />
                <span className="text-ivory-dim text-xs font-body flex-1">Add Location</span>
                <ChevronRight size={14} className="text-ivory-dim/40 group-hover:text-ivory-dim/60 shrink-0 transition-colors" />
              </button>
            )}
          </>
        )}

        {/* The form */}
        {selectedType === 'mission' && (
          <MissionForm
            onSubmit={submitMission}
            loading={submitting}
            detectedLocation={locationFill}
            suggestedTitle={suggestedTitle}
            onRetitle={suggestedTitle ? handleRetitle : undefined}
            initialData={prospectPrefill ? {
              title: prospectPrefill.title,
              date: prospectPrefill.date,
              location: prospectPrefill.location,
              city: prospectPrefill.city,
              country: prospectPrefill.country,
            } : undefined}
          />
        )}
        {selectedType === 'night_out' && (
          <NightOutForm
            onSubmit={submitNightOut}
            loading={submitting}
            detectedLocation={locationFill}
            suggestedTitle={suggestedTitle}
            onRetitle={suggestedTitle ? handleRetitle : undefined}
            initialData={prospectPrefill ? {
              title: prospectPrefill.title,
              date: prospectPrefill.date,
              location: prospectPrefill.location,
            } : undefined}
          />
        )}
        {selectedType === 'steak' && (
          <SteakForm onSubmit={submitSteak} loading={submitting} detectedLocation={locationFill} suggestedTitle={suggestedTitle} onRetitle={suggestedTitle ? handleRetitle : undefined} />
        )}
        {selectedType === 'playstation' && (
          <PlaystationForm onSubmit={submitPlaystation} loading={submitting} detectedLocation={locationFill} suggestedTitle={suggestedTitle} onRetitle={suggestedTitle ? handleRetitle : undefined} />
        )}
        {selectedType === 'toast' && (
          <ToastForm onSubmit={submitToast} loading={submitting} detectedLocation={locationFill} suggestedTitle={suggestedTitle} onRetitle={suggestedTitle ? handleRetitle : undefined} />
        )}
        {selectedType === 'interlude' && (
          <InterludeForm onSubmit={submitInterlude} loading={submitting} suggestedTitle={suggestedTitle} onRetitle={suggestedTitle ? handleRetitle : undefined} />
        )}

        {/* Participants */}
        <div className="border-t border-white/8 pt-4">
          <ParticipantSelector
            selectedIds={participants}
            onChange={setParticipants}
          />
        </div>

        {/* Tag people from Circle */}
        <ContactTagger
          selectedIds={taggedPeople}
          onChange={setTaggedPeople}
        />

        {/* Mood / energy tags */}
        <div className="border-t border-white/8 pt-4">
          <p className="text-xs tracking-widest text-ivory-dim uppercase font-body mb-2.5">Mood</p>
          <div className="flex flex-wrap gap-2">
            {getMoodOptions(selectedType).map(tag => {
              const active = moodTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setMoodTags(prev => active ? prev.filter(t => t !== tag) : [...prev, tag])}
                  className={`px-3 py-1 rounded-full text-xs font-body transition-all ${
                    active
                      ? 'bg-gold/20 text-gold border border-gold/40'
                      : 'bg-white/5 text-ivory-dim border border-white/8 hover:border-white/20'
                  }`}
                >
                  {tag}
                </button>
              )
            })}
          </div>
        </div>

        {/* Full Chronicle toggle (mission / night_out) */}
        {(selectedType === 'mission' || selectedType === 'night_out') && (
          <div className="border-t border-white/8 pt-4">
            <button
              type="button"
              onClick={() => setFullChronicle(v => !v)}
              className="flex items-center gap-3 w-full py-2 group"
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                fullChronicle ? 'bg-gold/15' : 'bg-white/5'
              }`}>
                <BookOpen size={14} className={fullChronicle ? 'text-gold' : 'text-ivory-dim'} />
              </div>
              <div className="text-left">
                <p className={`text-sm font-body ${fullChronicle ? 'text-gold' : 'text-ivory'}`}>
                  Full Chronicle
                </p>
                <p className="text-[11px] text-ivory-dim font-body">
                  Deeper, more detailed narrative with specific moments
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Visibility toggle */}
        <div className="border-t border-white/8 pt-4">
          <button
            type="button"
            onClick={() => setVisibility((v) => (v === 'shared' ? 'private' : 'shared'))}
            className="flex items-center gap-3 w-full py-2 group"
          >
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              visibility === 'private' ? 'bg-gold/15' : 'bg-white/5'
            }`}>
              {visibility === 'private' ? (
                <Lock size={14} className="text-gold" />
              ) : (
                <Unlock size={14} className="text-ivory-dim" />
              )}
            </div>
            <div className="text-left">
              <p className={`text-sm font-body ${visibility === 'private' ? 'text-gold' : 'text-ivory'}`}>
                {visibility === 'private' ? 'Private' : 'Shared'}
              </p>
              <p className="text-[11px] text-ivory-dim font-body">
                {visibility === 'private' ? 'Only you can see this entry' : 'Visible to all Gents'}
              </p>
            </div>
          </button>
        </div>

      </motion.div>
    )
  }

  return (
    <>
      {/* Mission intelligence pipeline overlay */}
      {missionStage && (
        <MissionProcessingOverlay
          stage={missionStage}
          photoProgress={uploadProgress ?? undefined}
          analysisProgress={analysisProgress}
        />
      )}

      {/* Upload progress overlay */}
      {submitting && !missionStage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-obsidian/90 backdrop-blur-sm">
          <img
            src="/logo-gold.webp"
            alt=""
            className="w-16 h-16 animate-spin mb-4"
            style={{ animationDuration: '2.5s' }}
          />
          <p className="text-ivory font-display text-lg mb-1">
            {uploadProgress
              ? `Uploading ${uploadProgress.done}/${uploadProgress.total} photos`
              : 'Creating entry...'}
          </p>
          {uploadProgress && (
            <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-2">
              <div
                className="h-full bg-gold rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.done / uploadProgress.total) * 100 : 0}%` }}
              />
            </div>
          )}
          <p className="text-ivory-dim/50 text-xs font-body mt-3">This may take a moment</p>
        </div>
      )}

      {/* Location search modal */}
      {showLocationSearch && (
        <LocationSearchModal
          onSelect={(fill) => setLocationFill(fill)}
          onClose={() => setShowLocationSearch(false)}
          savedPlaces={savedPlaces}
        />
      )}

      <TopBar
        title={topBarTitle}
        back
      />
      <PageWrapper>
        <AnimatePresence mode="wait">
          {step === 'select' && (
            <motion.div
              key="select"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <EntryTypeSelector onSelect={handleTypeSelect} />
            </motion.div>
          )}
          {step === 'form' && (
            <motion.div
              key="form"
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              {renderForm()}
            </motion.div>
          )}
        </AnimatePresence>
      </PageWrapper>
    </>
  )
}
