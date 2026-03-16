import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { scanPersonVerdict } from '@/ai/personVerdict'
import { generatePersonPortrait } from '@/ai/personPortrait'
import { createPersonScanDraft, updatePersonScan, confirmPersonScan, uploadPersonScanPhoto } from '@/data/personScans'
import { createPersonFromScan, findPersonByInstagram } from '@/data/people'
import { normalizeInstagramHandle } from '@/lib/instagram'
import { imageToJpegBase64 } from '@/lib/image'
import type { PersonVerdict, DossierDraft, VerdictSourceType } from '@/types/app'

const CONTACT_SCORE_THRESHOLD = 8.0

export type IntakeStep = 'input' | 'analyzing' | 'review' | 'saving'
export type IntakeMode = 'research' | 'scan'

export interface VerdictResult {
  verdict: PersonVerdict
  portraitUrl: string | null
  sourcePhotoUrl: string | null
  scanId: string
}

function createEmptyDossier(): DossierDraft {
  return {
    display_name: '',
    instagram: '',
    bio: '',
    why_interesting: '',
    best_opener: '',
    green_flags: [],
    watchouts: [],
    category: 'person_of_interest',
    visibility: 'private',
  }
}


export function useVerdictIntake(onSaved: (personId: string) => void) {
  const { gent } = useAuthStore()
  const [step, setStep] = useState<IntakeStep>('input')
  const [mode, setMode] = useState<IntakeMode>('research')
  const [analyzeError, setAnalyzeError] = useState('')
  const [verdictResult, setVerdictResult] = useState<VerdictResult | null>(null)
  const [portraitLoading, setPortraitLoading] = useState(false)
  const [dossier, setDossier] = useState<DossierDraft>(createEmptyDossier)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('input')
    setMode('research')
    setAnalyzeError('')
    setVerdictResult(null)
    setPortraitLoading(false)
    setDossier(createEmptyDossier())
    setDuplicateWarning(null)
  }, [])

  // Shared analysis runner — used by both file upload and handle lookup
  const runVerdictAnalysis = useCallback(async (
    compressedBase64: string,
    file: File,
    sourceType: VerdictSourceType,
    knownHandle?: string,
  ) => {
    if (!gent) return

    const sourcePhotoUrl = await uploadPersonScanPhoto(gent.id, file)

    const verdict = await scanPersonVerdict({ photo_base64: compressedBase64, mime_type: 'image/jpeg', source_type: sourceType })

    const handle = knownHandle ?? verdict.instagram_handle ?? null

    const scan = await createPersonScanDraft({
      created_by: gent.id,
      source_type: sourceType,
      source_photo_url: sourcePhotoUrl,
      appearance_description: verdict.appearance,
      trait_words: verdict.trait_words,
      score: verdict.score,
      verdict_label: verdict.verdict_label,
      confidence: verdict.confidence,
      recommended_category: verdict.score >= CONTACT_SCORE_THRESHOLD ? 'contact' : 'person_of_interest',
      display_name: verdict.display_name ?? null,
      bio: null,
      why_interesting: verdict.why_interesting,
      best_opener: verdict.best_opener,
      green_flags: verdict.green_flags,
      watchouts: verdict.watchouts,
      review_payload: verdict as unknown as Record<string, unknown>,
      instagram_handle: handle,
      instagram_source_url: null,
      generated_avatar_url: null,
    })

    setDossier({
      display_name: verdict.display_name ?? '',
      instagram: handle ?? '',
      bio: '',
      why_interesting: verdict.why_interesting ?? '',
      best_opener: verdict.best_opener ?? '',
      green_flags: verdict.green_flags ?? [],
      watchouts: verdict.watchouts ?? [],
      category: verdict.score >= CONTACT_SCORE_THRESHOLD ? 'contact' : 'person_of_interest',
      visibility: 'private',
    })
    setVerdictResult({ verdict, portraitUrl: null, sourcePhotoUrl, scanId: scan.id })
    setPortraitLoading(true)
    setStep('review')

    generatePersonPortrait({ appearance: verdict.appearance, traits: verdict.trait_words, scan_id: scan.id })
      .then((result) => {
        setVerdictResult((prev) => prev ? { ...prev, portraitUrl: result.portrait_url } : prev)
        updatePersonScan(scan.id, { generated_avatar_url: result.portrait_url }).catch(() => {})
      })
      .catch(() => {})
      .finally(() => setPortraitLoading(false))
  }, [gent])

  // File upload (screenshot or photo)
  const handleAnalyzeFile = useCallback(async (file: File, sourceType: VerdictSourceType) => {
    if (!gent) return
    setAnalyzeError('')
    setStep('analyzing')

    try {
      const compressedBase64 = await imageToJpegBase64(file, { maxPx: 1024, quality: 0.82 })
      await runVerdictAnalysis(compressedBase64, file, sourceType)
    } catch (err) {
      setAnalyzeError((err as Error).message)
      setStep('input')
    }
  }, [gent, runVerdictAnalysis])

  // Instagram handle lookup — fetches profile picture via unavatar proxy
  const handleAnalyzeHandle = useCallback(async (handle: string) => {
    if (!gent) return
    setAnalyzeError('')
    setStep('analyzing')

    const cleanHandle = normalizeInstagramHandle(handle) || handle.replace(/^@/, '').trim()

    try {
      const res = await fetch(`https://unavatar.io/instagram/${cleanHandle}?fallback=false`)
      if (!res.ok) throw new Error(`@${cleanHandle} not found or profile is private`)

      const blob = await res.blob()
      const file = new File([blob], `${cleanHandle}.jpg`, { type: blob.type || 'image/jpeg' })

      const compressedBase64 = await imageToJpegBase64(file, { maxPx: 1024, quality: 0.82 })
      await runVerdictAnalysis(compressedBase64, file, 'instagram_screenshot', cleanHandle)
    } catch (err) {
      setAnalyzeError((err as Error).message)
      setStep('input')
    }
  }, [gent, runVerdictAnalysis])

  const handleSave = useCallback(async () => {
    if (!gent || !dossier.display_name.trim()) return
    setStep('saving')
    setDuplicateWarning(null)

    try {
      const normalizedHandle = normalizeInstagramHandle(dossier.instagram)

      if (normalizedHandle) {
        const existingName = await findPersonByInstagram(normalizedHandle)
        if (existingName) {
          setDuplicateWarning(`@${normalizedHandle} is already in the circle as "${existingName}".`)
          setStep('review')
          return
        }
      }

      const photoUrl = verdictResult?.sourcePhotoUrl ??
        (normalizedHandle ? `https://unavatar.io/instagram/${normalizedHandle}` : null)

      const poiIntel = [
        dossier.why_interesting,
        dossier.best_opener ? `Opener: ${dossier.best_opener}` : '',
        dossier.green_flags?.length ? `Green flags: ${dossier.green_flags.join(', ')}` : '',
        dossier.watchouts?.length ? `Watch out: ${dossier.watchouts.join(', ')}` : '',
      ].filter(Boolean).join('\n\n') || null

      const person = await createPersonFromScan({
        name: dossier.display_name.trim(),
        instagram: normalizedHandle,
        instagram_source_url: null,
        photo_url: photoUrl,
        portrait_url: verdictResult?.portraitUrl ?? null,
        bio: dossier.bio || null,
        poi_intel: poiIntel,
        category: dossier.category,
        poi_visibility: dossier.visibility,
        tier: 'acquaintance',
        added_by: gent.id,
        labels: verdictResult?.verdict?.trait_words ?? [],
      })

      if (verdictResult?.scanId) {
        await confirmPersonScan(verdictResult.scanId, person.id)
      }

      onSaved(person.id)
    } catch (err) {
      setAnalyzeError((err as Error).message || 'Failed to save. Please try again.')
      setStep('review')
    }
  }, [gent, dossier, verdictResult, onSaved])

  return {
    step, setStep, mode, setMode,
    analyzeError,
    verdictResult,
    portraitLoading,
    dossier, setDossier,
    duplicateWarning,
    handleAnalyzeFile,
    handleAnalyzeHandle,
    handleSave,
    reset,
  }
}
