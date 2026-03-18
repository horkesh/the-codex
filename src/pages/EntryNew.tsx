import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { LocateFixed, X as XIcon, Lock, Unlock, BookOpen } from 'lucide-react'
import { TopBar } from '@/components/layout'
import { PageWrapper } from '@/components/layout'
import { EntryTypeSelector } from '@/components/chronicle/EntryTypeSelector'
import { ParticipantSelector } from '@/components/chronicle/ParticipantSelector'
import { PhotoUpload, usePendingPhotos } from '@/components/chronicle/PhotoUpload'
import { SavedPlacesBar } from '@/components/chronicle/SavedPlacesBar'
import { fetchLocations } from '@/data/locations'
import { MissionForm } from '@/components/chronicle/forms/MissionForm'
import { NightOutForm } from '@/components/chronicle/forms/NightOutForm'
import { SteakForm } from '@/components/chronicle/forms/SteakForm'
import { PlaystationForm } from '@/components/chronicle/forms/PlaystationForm'
import { ToastForm } from '@/components/chronicle/forms/ToastForm'
import { InterludeForm } from '@/components/chronicle/forms/InterludeForm'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { createEntry, addEntryParticipants, addPersonAppearances, updateEntryCover, updateEntryLore, updateEntry } from '@/data/entries'
import { ContactTagger } from '@/components/chronicle/ContactTagger'
import { fetchProspectById, updateProspect } from '@/data/prospects'
import { generateLoreFull } from '@/ai/lore'
import { generateTitle } from '@/ai/title'
import { notifyOthers } from '@/hooks/usePushNotifications'
import { generateCover } from '@/ai/cover'
import { generateStamp } from '@/ai/stamp'
import { createMissionStamp, updateStampImage } from '@/data/stamps'
import { createMissionStory } from '@/data/stories'
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
  toast:       ['Ceremonial', 'Liquid Courage', 'Bittersweet', 'Celebratory'],
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
  const titleGenFired = useRef(false)
  const firstPhotoRef = useRef<File | null>(null)
  const prospectHandled = useRef(false)
  const handleGeoDetected = useCallback((loc: LocationFill) => setLocationFill(loc), [])

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

  const maxPhotos = selectedType === 'mission' ? 20 : selectedType === 'night_out' ? 15 : 10
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
        location: formData.location ?? locationFill?.location ?? undefined,
        city,
        country,
        country_code,
        description: formData.description ?? undefined,
        metadata: {
          ...(formData.metadata ?? {}),
          ...(locationFill?.time ? { time_of_day: locationFill.time } : {}),
          ...(moodTags.length > 0 ? { mood_tags: moodTags } : {}),
          ...(fullChronicle ? { full_chronicle: true } : {}),
        },
        created_by: gent.id,
        visibility,
      })

      // 2. Add participants (always include creator)
      const allParticipantIds = Array.from(new Set([gent.id, ...participants]))
      if (allParticipantIds.length > 0) {
        await addEntryParticipants(entry.id, allParticipantIds)
      }

      // 2b. Tag people present (person_appearances)
      if (taggedPeople.length > 0) {
        addPersonAppearances(entry.id, taggedPeople, gent.id).catch(() => {})
      }

      // 3. Upload pending photos; promote first to cover image
      let uploadedUrls: string[] = []
      if (pendingFiles.length > 0) {
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

      // 4. For missions, create story first to get day labels for lore generation
      let storyDayLabels: string[] | undefined
      if (selectedType === 'mission' && city && country) {
        try {
          const story = await createMissionStory({
            id: entry.id,
            title: formData.title,
            date: formData.date,
            cover_image_url: entry.cover_image_url ?? null,
            created_by: entry.created_by,
            metadata: entry.metadata as Record<string, unknown>,
          })
          if (story?.metadata?.day_episodes && story.metadata.day_episodes.length > 1) {
            storyDayLabels = story.metadata.day_episodes.map(d => d.label)
          }
        } catch { /* non-critical */ }
      }

      // 4b. Fire generateLoreFull async — saves lore, oneliner, and suggested title
      const entryWithParticipants = {
        ...entry,
        participants: [],
      }
      generateLoreFull(entryWithParticipants, uploadedUrls, storyDayLabels).then(async (result) => {
        if (!result) return
        try {
          const meta = {
            ...(entry.metadata as Record<string, unknown> ?? {}),
            lore_oneliner: result.oneliner,
          }
          const updates: Partial<typeof entry> = { metadata: meta } as Partial<typeof entry>
          if (result.suggested_title) updates.title = result.suggested_title
          await Promise.all([
            updateEntryLore(entry.id, result.lore),
            updateEntry(entry.id, updates),
          ])
          // Save per-day lore to story
          if (result.day_lore && storyDayLabels) {
            const { fetchStoryByEntryId, updateStory } = await import('@/data/stories')
            const story = await fetchStoryByEntryId(entry.id)
            if (story?.metadata?.day_episodes) {
              const episodes = story.metadata.day_episodes.map((ep, i) => ({
                ...ep,
                lore: result.day_lore?.[i] || ep.lore,
              }))
              await updateStory(story.id, { metadata: { ...story.metadata, day_episodes: episodes } }).catch(() => {})
            }
          }
        } catch {
          // non-critical — lore will be visible on next visit
        }
      }).catch(() => {})

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
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location,
      description: data.description,
      metadata: {
        cut: data.cut || null,
        score: data.score ? parseFloat(data.score) : null,
        verdict: data.verdict || null,
      },
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
          onFilesAdded={addFiles}
          onFileRemoved={removeFile}
          className="w-full"
        />

        {/* Saved places — shown for location-aware entry types */}
        {selectedType !== 'playstation' && selectedType !== 'interlude' && (
          <SavedPlacesBar places={savedPlaces} onSelect={setLocationFill} />
        )}

        {/* Place detected from photo */}
        {locationFill?.matchedPlaceName && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gold/8 border border-gold/20">
            <LocateFixed size={13} className="text-gold shrink-0" />
            <span className="text-gold text-xs font-body flex-1">
              Photo taken at: <span className="font-semibold">{locationFill.matchedPlaceName}</span>
            </span>
            <button
              type="button"
              onClick={() => setLocationFill(undefined)}
              className="text-gold/50 hover:text-gold transition-colors"
            >
              <XIcon size={13} />
            </button>
          </div>
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
      {/* Upload progress overlay */}
      {submitting && (
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
