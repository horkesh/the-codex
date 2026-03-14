import { useState, useCallback } from 'react'
import { useAuthStore } from '@/store/auth'
import { scanPersonVerdict } from '@/ai/personVerdict'
import { generatePersonPortrait } from '@/ai/personPortrait'
import { createPersonScanDraft, updatePersonScan, confirmPersonScan, uploadPersonScanPhoto } from '@/data/personScans'
import { createPersonFromScan, findPersonByInstagram } from '@/data/people'
import { normalizeInstagramHandle } from '@/lib/instagram'
import type { PersonVerdict, DossierDraft, VerdictSourceType } from '@/types/app'

// Score at or above this routes to 'contact'; below routes to 'person_of_interest'
const CONTACT_SCORE_THRESHOLD = 8.0

export type IntakeStep = 'input' | 'analyzing' | 'review' | 'saving'
export type IntakeTab = 'screenshot' | 'photo'

export interface VerdictResult {
  verdict: PersonVerdict
  portraitUrl: string | null
  sourcePhotoUrl: string | null
  scanId: string
}

// Factory avoids sharing array references across resets
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
  const [tab, setTab] = useState<IntakeTab>('screenshot')
  const [analyzeError, setAnalyzeError] = useState('')
  const [verdictResult, setVerdictResult] = useState<VerdictResult | null>(null)
  const [portraitLoading, setPortraitLoading] = useState(false)
  const [dossier, setDossier] = useState<DossierDraft>(createEmptyDossier)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('input')
    setTab('screenshot')
    setAnalyzeError('')
    setVerdictResult(null)
    setPortraitLoading(false)
    setDossier(createEmptyDossier())
    setDuplicateWarning(null)
  }, [])

  const handleAnalyzeFile = useCallback(async (file: File) => {
    if (!gent) return
    setAnalyzeError('')
    setStep('analyzing')

    try {
      // Read base64 and upload source photo in parallel — both need only `file`
      const [base64, sourcePhotoUrl] = await Promise.all([
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve((reader.result as string).split(',')[1])
          reader.onerror = reject
          reader.readAsDataURL(file)
        }),
        uploadPersonScanPhoto(gent.id, file),
      ])

      // AI verdict (needs base64 from above)
      const verdict = await scanPersonVerdict({ photo_base64: base64, mime_type: file.type || 'image/jpeg' })

      // Create draft scan record
      const sourceType: VerdictSourceType = tab === 'screenshot' ? 'instagram_screenshot' : 'photo'
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
        display_name: null,
        bio: null,
        why_interesting: verdict.why_interesting,
        best_opener: verdict.best_opener,
        green_flags: verdict.green_flags,
        watchouts: verdict.watchouts,
        review_payload: verdict as unknown as Record<string, unknown>,
        instagram_handle: null,
        instagram_source_url: null,
        generated_avatar_url: null,
      })

      // Pre-fill dossier and advance to review immediately
      setDossier({
        display_name: '',
        instagram: '',
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

      // Generate portrait in background — don't block review
      generatePersonPortrait({ appearance: verdict.appearance, traits: verdict.trait_words, scan_id: scan.id })
        .then((result) => {
          setVerdictResult((prev) => prev ? { ...prev, portraitUrl: result.portrait_url } : prev)
          updatePersonScan(scan.id, { generated_avatar_url: result.portrait_url }).catch(() => {})
        })
        .catch(() => {})
        .finally(() => setPortraitLoading(false))

    } catch (err) {
      setAnalyzeError((err as Error).message)
      setStep('input')
    }
  }, [gent, tab])

  const handleSave = useCallback(async () => {
    if (!gent || !dossier.display_name.trim()) return
    setStep('saving')
    setDuplicateWarning(null)

    try {
      const normalizedHandle = normalizeInstagramHandle(dossier.instagram)

      // Duplicate check
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
        labels: [],
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
    step, setStep, tab, setTab,
    analyzeError,
    verdictResult,
    portraitLoading,
    dossier, setDossier,
    duplicateWarning,
    handleAnalyzeFile,
    handleSave,
    reset,
  }
}
