import { useRef, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ImagePlus, Camera } from 'lucide-react'
import { Modal, Button, Input } from '@/components/ui'
import { VerdictCard } from '@/components/circle/VerdictCard'
import { useVerdictIntake } from '@/hooks/useVerdictIntake'
import { cn } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'

interface ProspectIntakeModalProps {
  open: boolean
  mode: 'research' | 'scan'
  onClose: () => void
  onSaved: (personId: string) => void
}

export function POIModal({ open, mode, onClose, onSaved }: ProspectIntakeModalProps) {
  const screenshotInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const {
    step, setStep, setMode,
    analyzeError, verdictResult, portraitLoading,
    dossier, setDossier, duplicateWarning,
    handleAnalyzeFile, handleSave, reset,
  } = useVerdictIntake((personId) => {
    onSaved(personId)
    onClose()
  })

  useEffect(() => {
    if (open) setMode(mode)
  }, [open, mode, setMode])

  // Global paste listener so Ctrl+V works without clicking the drop zone first
  const handleGlobalPaste = useCallback((e: ClipboardEvent) => {
    if (!open || step !== 'input') return
    const item = Array.from(e.clipboardData?.items ?? []).find(i => i.type.startsWith('image/'))
    if (!item) return
    const f = item.getAsFile()
    if (f) {
      e.preventDefault()
      handleAnalyzeFile(f, mode === 'research' ? 'instagram_screenshot' : 'photo')
    }
  }, [open, step, mode, handleAnalyzeFile])

  useEffect(() => {
    document.addEventListener('paste', handleGlobalPaste)
    return () => document.removeEventListener('paste', handleGlobalPaste)
  }, [handleGlobalPaste])

  const handleClose = () => {
    reset()
    onClose()
  }

  const setField = (key: keyof typeof dossier) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setDossier((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <Modal isOpen={open} onClose={handleClose} title="Run Verdict">
      <AnimatePresence mode="wait">

        {/* ── Input step ── */}
        {step === 'input' && (
          <motion.div
            key="input"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-4"
          >
            {/* Research mode — screenshot */}
            {mode === 'research' && (
              <>
                {/* Screenshot drop zone */}
                <div
                  onClick={() => screenshotInputRef.current?.click()}
                  onPaste={(e) => {
                    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
                    if (item) { const f = item.getAsFile(); if (f) handleAnalyzeFile(f, 'instagram_screenshot') }
                  }}
                  className="border-2 border-dashed border-white/15 rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:border-gold/30 transition-colors focus:outline-none"
                  tabIndex={0}
                >
                  <ImagePlus size={22} className="text-ivory-dim" />
                  <p className="text-sm text-ivory-muted font-body text-center">Upload or paste Instagram screenshot</p>
                  <p className="text-xs text-ivory-dim font-body text-center">Works with private profiles · Ctrl+V to paste</p>
                </div>

              </>
            )}

            {/* Scan mode — camera/photo */}
            {mode === 'scan' && (
              <div
                onClick={() => photoInputRef.current?.click()}
                onPaste={(e) => {
                  const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'))
                  if (item) { const f = item.getAsFile(); if (f) handleAnalyzeFile(f, 'photo') }
                }}
                className="border-2 border-dashed border-white/15 rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-gold/30 transition-colors focus:outline-none"
                tabIndex={0}
              >
                <Camera size={24} className="text-ivory-dim" />
                <p className="text-sm text-ivory-muted font-body text-center">Take a photo or upload from gallery</p>
                <p className="text-xs text-ivory-dim font-body text-center">AI will analyze and generate a portrait</p>
              </div>
            )}

            {/* Hidden file inputs */}
            <input
              ref={screenshotInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAnalyzeFile(f, 'instagram_screenshot') }}
            />
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAnalyzeFile(f, 'photo') }}
            />

            {analyzeError && (
              <div className="rounded-lg bg-[--color-error]/10 border border-[--color-error]/30 px-3 py-2">
                <p className="text-xs text-[--color-error] font-body">{analyzeError}</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep('review')}
              className="text-xs text-ivory-dim hover:text-ivory font-body text-center transition-colors py-1"
            >
              Skip — enter details manually
            </button>
          </motion.div>
        )}

        {/* ── Analyzing step ── */}
        {step === 'analyzing' && (
          <motion.div
            key="analyzing"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center justify-center gap-4 py-10"
          >
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-sm text-ivory-muted font-body">Reading the room...</p>
          </motion.div>
        )}

        {/* ── Review step ── */}
        {step === 'review' && (
          <motion.div
            key="review"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col gap-4"
          >
            {/* Images row */}
            <div className="flex items-start gap-4 justify-center">
              {/* Source photo */}
              {verdictResult?.sourcePhotoUrl && (
                <div className="flex flex-col items-center gap-1">
                  <img
                    src={verdictResult.sourcePhotoUrl}
                    alt="Source"
                    className="w-20 h-20 rounded-full overflow-hidden object-cover border border-white/10"
                  />
                  <span className="text-[10px] text-ivory-dim font-body">Source</span>
                </div>
              )}

              {/* Generated portrait or shimmer */}
              <div className="flex flex-col items-center gap-1">
                {portraitLoading ? (
                  <div className="w-20 h-20 rounded-full bg-slate-light/40 border border-gold/20 animate-pulse" />
                ) : verdictResult?.portraitUrl ? (
                  <img
                    src={verdictResult.portraitUrl}
                    alt="AI Portrait"
                    className="w-20 h-20 rounded-full overflow-hidden object-cover border border-gold/30"
                  />
                ) : null}
                {(portraitLoading || verdictResult?.portraitUrl) && (
                  <span className="text-[10px] text-ivory-dim font-body">Portrait</span>
                )}
              </div>
            </div>

            {/* Verdict card */}
            {verdictResult?.verdict && (
              <VerdictCard
                label={verdictResult.verdict.verdict_label}
                score={verdictResult.verdict.score}
                confidence={verdictResult.verdict.confidence}
                vibe={verdictResult.verdict.vibe}
                greenFlags={verdictResult.verdict.green_flags}
                watchouts={verdictResult.verdict.watchouts}
              />
            )}

            {/* Error banner */}
            {analyzeError && (
              <div className="rounded-lg bg-[--color-error]/10 border border-[--color-error]/30 px-3 py-2">
                <p className="text-xs text-[--color-error] font-body">{analyzeError}</p>
              </div>
            )}

            {/* Duplicate warning */}
            {duplicateWarning && (
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/25 px-3 py-2">
                <p className="text-xs text-amber-400 font-body">{duplicateWarning}</p>
              </div>
            )}

            {/* Dossier fields */}
            <Input
              label="Display Name"
              placeholder="Full name or alias"
              value={dossier.display_name}
              onChange={setField('display_name')}
            />
            <Input
              label="Instagram Handle"
              placeholder="@username"
              value={dossier.instagram}
              onChange={setField('instagram')}
            />
            <Input
              as="textarea"
              label="Bio"
              placeholder="Background, bio, or description"
              value={dossier.bio}
              onChange={setField('bio')}
            />
            <Input
              as="textarea"
              label="Why Interesting"
              placeholder="Why is this person on the radar?"
              value={dossier.why_interesting}
              onChange={setField('why_interesting')}
            />
            <Input
              label="Best Opener"
              placeholder="Opening line for when you meet"
              value={dossier.best_opener}
              onChange={setField('best_opener')}
            />

            {/* Category selector */}
            <div className="flex flex-col gap-1">
              <span className="text-ivory-muted text-xs uppercase tracking-widest font-body">Route to</span>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button
                  type="button"
                  onClick={() => setDossier((prev) => ({ ...prev, category: 'contact' }))}
                  className={cn(
                    'flex-1 py-2 text-xs font-body transition-colors',
                    dossier.category === 'contact' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory',
                  )}
                >
                  Add to Circle
                </button>
                <button
                  type="button"
                  onClick={() => setDossier((prev) => ({ ...prev, category: 'person_of_interest' }))}
                  className={cn(
                    'flex-1 py-2 text-xs font-body transition-colors',
                    dossier.category === 'person_of_interest' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory',
                  )}
                >
                  On the Radar
                </button>
              </div>
            </div>

            {/* Visibility toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-ivory-muted text-xs uppercase tracking-widest font-body">Visibility</span>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button
                  type="button"
                  onClick={() => setDossier((prev) => ({ ...prev, visibility: 'private' }))}
                  className={cn(
                    'flex-1 py-2 text-xs font-body transition-colors',
                    dossier.visibility === 'private' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory',
                  )}
                >
                  Keep Private
                </button>
                <button
                  type="button"
                  onClick={() => setDossier((prev) => ({ ...prev, visibility: 'circle' }))}
                  className={cn(
                    'flex-1 py-2 text-xs font-body transition-colors',
                    dossier.visibility === 'circle' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory',
                  )}
                >
                  Share with The Gents
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" fullWidth onClick={() => setStep('input')}>
                Back
              </Button>
              <Button
                fullWidth
                onClick={handleSave}
                disabled={!dossier.display_name.trim()}
              >
                {dossier.category === 'contact' ? 'Add to Circle' : 'Send to On the Radar'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Saving step ── */}
        {step === 'saving' && (
          <motion.div
            key="saving"
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="flex flex-col items-center justify-center gap-4 py-10"
          >
            <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
            <p className="text-sm text-ivory-muted font-body">Saving to The Circle...</p>
          </motion.div>
        )}

      </AnimatePresence>
    </Modal>
  )
}
