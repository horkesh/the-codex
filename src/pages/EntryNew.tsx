import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { LocateFixed, X as XIcon } from 'lucide-react'
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
import { createEntry, addEntryParticipants, updateEntryCover } from '@/data/entries'
import { fetchProspectById, updateProspect } from '@/data/prospects'
import { generateLore } from '@/ai/lore'
import { notifyOthers } from '@/hooks/usePushNotifications'
import { generateCover } from '@/ai/cover'
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
  const prospectHandled = useRef(false)
  const handleGeoDetected = useCallback((loc: LocationFill) => setLocationFill(loc), [])

  useEffect(() => {
    fetchLocations().then(setSavedPlaces)
  }, [])

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

  const { pendingFiles, addFiles, removeFile, uploadAll, clearFiles } = usePendingPhotos()

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
      // 1. Create the entry
      const entry = await createEntry({
        type: selectedType,
        title: formData.title,
        date: formData.date,
        location: formData.location ?? undefined,
        city: formData.city ?? undefined,
        country: formData.country ?? undefined,
        country_code: formData.country_code ?? undefined,
        description: formData.description ?? undefined,
        metadata: formData.metadata ?? {},
        created_by: gent.id,
      })

      // 2. Add participants (always include creator)
      const allParticipantIds = Array.from(new Set([gent.id, ...participants]))
      if (allParticipantIds.length > 0) {
        await addEntryParticipants(entry.id, allParticipantIds)
      }

      // 3. Upload pending photos; promote first to cover image
      let uploadedUrls: string[] = []
      if (pendingFiles.length > 0) {
        const { urls, firstError } = await uploadAll(entry.id)
        uploadedUrls = urls
        clearFiles()
        if (uploadedUrls[0]) {
          await updateEntryCover(entry.id, uploadedUrls[0])
        } else {
          // All uploads failed — show the actual error so we can diagnose
          addToast(`Upload failed: ${firstError ?? 'unknown error'}`, 'error')
        }
      }

      // 4. Fire generateLore async — don't await
      const entryWithParticipants = {
        ...entry,
        participants: [],
      }
      generateLore(entryWithParticipants).catch(() => {
        // silently ignore — lore gen failures are non-critical
      })

      // 5. AI cover only when no photo was uploaded (interlude never gets AI cover)
      if (uploadedUrls.length === 0 && selectedType !== 'interlude') {
        generateCover(entry).catch(() => {
          // silently ignore
        })
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
    })
  }

  async function submitNightOut(data: NightOutFormData) {
    await handleSubmit({
      title: data.title,
      date: data.date,
      location: data.location,
      description: data.description,
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
            initialData={prospectPrefill ? {
              title: prospectPrefill.title,
              date: prospectPrefill.date,
              location: prospectPrefill.location,
            } : undefined}
          />
        )}
        {selectedType === 'steak' && (
          <SteakForm onSubmit={submitSteak} loading={submitting} detectedLocation={locationFill} />
        )}
        {selectedType === 'playstation' && (
          <PlaystationForm onSubmit={submitPlaystation} loading={submitting} />
        )}
        {selectedType === 'toast' && (
          <ToastForm onSubmit={submitToast} loading={submitting} detectedLocation={locationFill} />
        )}
        {selectedType === 'interlude' && (
          <InterludeForm onSubmit={submitInterlude} loading={submitting} />
        )}

        {/* Participants */}
        <div className="border-t border-white/8 pt-4">
          <ParticipantSelector
            selectedIds={participants}
            onChange={setParticipants}
          />
        </div>

        {/* Photos — shown for all entry types */}
        <div className="border-t border-white/8 pt-4">
          <PhotoUpload
            entryId={null}
            onGeoDetected={handleGeoDetected}
            onFilesAdded={addFiles}
            onFileRemoved={removeFile}
            className="w-full"
          />
        </div>
      </motion.div>
    )
  }

  return (
    <>
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
