import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { scanPersonVerdict } from '@/ai/personVerdict'
import { generatePersonPortrait } from '@/ai/personPortrait'
import { createPersonScanDraft, updatePersonScan, confirmPersonScan, findPersonByInstagram } from '@/data/personScans'
import { createPersonFromScan } from '@/data/people'
import { normalizeInstagramHandle } from '@/lib/instagram'
import type { PersonVerdict, DossierDraft, VerdictSourceType } from '@/types/app'

export type IntakeStep = 'input' | 'analyzing' | 'review' | 'saving'
export type IntakeTab = 'screenshot' | 'photo'

export interface VerdictResult {
  verdict: PersonVerdict
  portraitUrl: string | null
  sourcePhotoUrl: string | null
  scanId: string
  portraitLoading: boolean
}

const EMPTY_DOSSIER: DossierDraft = {
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

export function useVerdictIntake(onSaved: (personId: string) => void) {
  const { gent } = useAuthStore()
  const [step, setStep] = useState<IntakeStep>('input')
  const [tab, setTab] = useState<IntakeTab>('screenshot')
  const [analyzeError, setAnalyzeError] = useState('')
  const [verdictResult, setVerdictResult] = useState<VerdictResult | null>(null)
  const [dossier, setDossier] = useState<DossierDraft>(EMPTY_DOSSIER)
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('input')
    setTab('screenshot')
    setAnalyzeError('')
    setVerdictResult(null)
    setDossier(EMPTY_DOSSIER)
    setDuplicateWarning(null)
  }, [])

  const handleAnalyzeFile = useCallback(async (file: File) => {
    if (!gent) return
    setAnalyzeError('')
    setStep('analyzing')

    try {
      // 1. Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })

      // 2. Upload source photo (non-blocking; failure is non-fatal)
      let sourcePhotoUrl: string | null = null
      const tempId = crypto.randomUUID()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const storagePath = `${gent.id}/${tempId}/source.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('person-scans')
        .upload(storagePath, file, { contentType: file.type, upsert: false })
      if (!uploadErr) {
        sourcePhotoUrl = supabase.storage.from('person-scans').getPublicUrl(storagePath).data.publicUrl
      }

      // 3. AI verdict
      const verdict = await scanPersonVerdict({ photo_base64: base64, mime_type: file.type || 'image/jpeg' })

      // 4. Create draft scan record
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
        recommended_category: verdict.score >= 8.0 ? 'contact' : 'person_of_interest',
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

      // 5. Pre-fill dossier from verdict — go to review immediately
      setDossier({
        display_name: '',
        instagram: '',
        bio: '',
        why_interesting: verdict.why_interesting ?? '',
        best_opener: verdict.best_opener ?? '',
        green_flags: verdict.green_flags ?? [],
        watchouts: verdict.watchouts ?? [],
        category: verdict.score >= 8.0 ? 'contact' : 'person_of_interest',
        visibility: 'private',
      })

      setVerdictResult({ verdict, portraitUrl: null, sourcePhotoUrl, scanId: scan.id, portraitLoading: true })
      setStep('review')

      // 6. Generate portrait in background — don't block review
      generatePersonPortrait({ appearance: verdict.appearance, traits: verdict.trait_words, scan_id: scan.id })
        .then((result) => {
          setVerdictResult((prev) => prev ? { ...prev, portraitUrl: result.portrait_url, portraitLoading: false } : prev)
          updatePersonScan(scan.id, { generated_avatar_url: result.portrait_url }).catch(() => {})
        })
        .catch(() => {
          setVerdictResult((prev) => prev ? { ...prev, portraitLoading: false } : prev)
        })

    } catch (err) {
      const msg = (err as Error).message
      setAnalyzeError(msg)
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

      // Build photo_url: prefer source photo, fall back to unavatar for Instagram
      const photoUrl = verdictResult?.sourcePhotoUrl ??
        (normalizedHandle ? `https://unavatar.io/instagram/${normalizedHandle}` : null)

      // Build poi_intel from dossier fields
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
    dossier, setDossier,
    duplicateWarning,
    handleAnalyzeFile,
    handleSave,
    reset,
  }
}
