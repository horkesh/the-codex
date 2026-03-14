import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, ImagePlus } from 'lucide-react'
import { Modal, Button, Input, Avatar } from '@/components/ui'
import { analyzeInstagramUrl, analyzeInstagramScreenshot } from '@/ai/instagram'
import { createPerson } from '@/data/people'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import { fadeUp } from '@/lib/animations'
import type { Person } from '@/types/app'

// ─── Types ────────────────────────────────────────────────────────────────────

interface POIModalProps {
  open: boolean
  onClose: () => void
  onSaved: (person: Person) => void
}

type Tab = 'url' | 'screenshot'
type Step = 'input' | 'analyzing' | 'review'

// ─── Component ────────────────────────────────────────────────────────────────

export function POIModal({ open, onClose, onSaved }: POIModalProps) {
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [tab, setTab] = useState<Tab>('url')
  const [step, setStep] = useState<Step>('input')
  const [url, setUrl] = useState('')
  const [analyzeError, setAnalyzeError] = useState('')
  const [saving, setSaving] = useState(false)

  // Review form fields
  const [fields, setFields] = useState({
    display_name: '',
    instagram: '',
    bio: '',
    poi_intel: '',
    why_interesting: '',
    photo_url: '',
  })
  const [visibility, setVisibility] = useState<'private' | 'circle'>('private')

  const resetModal = () => {
    setTab('url')
    setStep('input')
    setUrl('')
    setAnalyzeError('')
    setSaving(false)
    setFields({ display_name: '', instagram: '', bio: '', poi_intel: '', why_interesting: '', photo_url: '' })
    setVisibility('private')
  }

  const handleClose = () => {
    resetModal()
    onClose()
  }

  // ── Analyze URL ──
  const handleAnalyzeUrl = async () => {
    if (!url.trim()) {
      setAnalyzeError('Please paste an Instagram profile URL')
      return
    }
    setAnalyzeError('')
    setStep('analyzing')
    try {
      const result = await analyzeInstagramUrl(url.trim(), 'profile')
      setFields((prev) => ({
        ...prev,
        display_name: result.display_name ?? '',
        instagram: result.username ?? '',
        bio: result.bio ?? '',
        poi_intel: [
          result.apparent_location ? `Location: ${result.apparent_location}` : '',
          result.apparent_interests ? `Interests: ${result.apparent_interests}` : '',
          result.notable_details ?? '',
          result.suggested_approach ? `Approach: ${result.suggested_approach}` : '',
        ].filter(Boolean).join('\n'),
      }))
      setStep('review')
    } catch {
      setAnalyzeError('Could not analyze that URL. Fill in details manually.')
      setStep('review')
    }
  }

  // ── Screenshot upload ──
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStep('analyzing')
    setAnalyzeError('')
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve((reader.result as string).split(',')[1])
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      const result = await analyzeInstagramScreenshot(base64)
      setFields((prev) => ({
        ...prev,
        display_name: result.display_name ?? '',
        instagram: result.username ?? '',
        bio: result.bio ?? '',
        poi_intel: [
          result.apparent_location ? `Location: ${result.apparent_location}` : '',
          result.apparent_interests ? `Interests: ${result.apparent_interests}` : '',
          result.notable_details ?? '',
          result.post_count ? `Posts: ${result.post_count}` : '',
          result.follower_count ? `Followers: ${result.follower_count}` : '',
        ].filter(Boolean).join('\n'),
      }))
      setStep('review')
    } catch {
      setAnalyzeError('Could not analyze screenshot. Fill in details manually.')
      setStep('review')
    }
  }

  // ── Save ──
  const handleSave = async () => {
    if (!gent || !fields.display_name.trim()) return
    setSaving(true)
    try {
      const igHandle = fields.instagram.replace(/^@/, '').trim()
      const person = await createPerson({
        name: fields.display_name.trim(),
        instagram: igHandle || undefined,
        photo_url: fields.photo_url || (igHandle ? `https://unavatar.io/instagram/${igHandle}` : undefined),
        notes: [fields.bio, fields.why_interesting].filter(Boolean).join('\n\n') || undefined,
        labels: ['POI'],
        added_by: gent.id,
      })
      addToast('Person of Interest added', 'success')
      onSaved(person)
      handleClose()
    } catch {
      addToast('Failed to save', 'error')
    } finally {
      setSaving(false)
    }
  }

  const setField = (key: keyof typeof fields) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => setFields((prev) => ({ ...prev, [key]: e.target.value }))

  return (
    <Modal isOpen={open} onClose={handleClose} title="Person of Interest">
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
            {/* Tabs */}
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                type="button"
                onClick={() => setTab('url')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-body transition-colors',
                  tab === 'url' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory'
                )}
              >
                <Link size={13} />
                Instagram URL
              </button>
              <button
                type="button"
                onClick={() => setTab('screenshot')}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-body transition-colors',
                  tab === 'screenshot' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory'
                )}
              >
                <ImagePlus size={13} />
                Screenshot
              </button>
            </div>

            {/* URL tab */}
            {tab === 'url' && (
              <>
                <Input
                  label="Profile URL"
                  placeholder="https://instagram.com/username"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  error={analyzeError}
                />
                <Button fullWidth onClick={handleAnalyzeUrl} disabled={!url.trim()}>
                  Analyze
                </Button>
              </>
            )}

            {/* Screenshot tab */}
            {tab === 'screenshot' && (
              <>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-white/15 rounded-xl p-8 flex flex-col items-center gap-2 cursor-pointer hover:border-gold/30 transition-colors"
                >
                  <ImagePlus size={24} className="text-ivory-dim" />
                  <p className="text-sm text-ivory-muted font-body text-center">
                    Upload profile screenshot
                  </p>
                  <p className="text-xs text-ivory-dim font-body text-center">
                    Works with private profiles
                  </p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleScreenshotUpload}
                />
                {analyzeError && (
                  <p className="text-xs text-[--color-error] font-body">{analyzeError}</p>
                )}
              </>
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
            <p className="text-sm text-ivory-muted font-body">Analyzing profile...</p>
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
            className="flex flex-col gap-3"
          >
            {/* Error banner */}
            {analyzeError && (
              <div className="rounded-lg bg-[--color-error]/10 border border-[--color-error]/30 px-3 py-2">
                <p className="text-xs text-[--color-error] font-body">{analyzeError}</p>
              </div>
            )}

            {/* Photo preview */}
            {(fields.photo_url || fields.instagram) && (
              <div className="flex justify-center pb-1">
                <Avatar
                  src={
                    fields.photo_url ||
                    (fields.instagram
                      ? `https://unavatar.io/instagram/${fields.instagram.replace(/^@/, '')}`
                      : undefined)
                  }
                  name={fields.display_name || 'POI'}
                  size="xl"
                />
              </div>
            )}

            {/* Form fields */}
            <Input
              label="Display Name"
              placeholder="Full name or alias"
              value={fields.display_name}
              onChange={setField('display_name')}
            />
            <Input
              label="Instagram Handle"
              placeholder="@username"
              value={fields.instagram}
              onChange={setField('instagram')}
            />
            <Input
              as="textarea"
              label="Bio"
              placeholder="Profile bio or description"
              value={fields.bio}
              onChange={setField('bio')}
            />
            <Input
              as="textarea"
              label="Vibe / Intel"
              placeholder="AI-extracted intel about this person"
              value={fields.poi_intel}
              onChange={setField('poi_intel')}
            />
            <Input
              as="textarea"
              label="Why Interesting"
              placeholder="Your own notes on why this person is on the radar"
              value={fields.why_interesting}
              onChange={setField('why_interesting')}
            />

            {/* Visibility toggle */}
            <div className="flex flex-col gap-1">
              <span className="text-ivory-muted text-xs uppercase tracking-widest font-body">
                Visibility
              </span>
              <div className="flex rounded-lg overflow-hidden border border-white/10">
                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={cn(
                    'flex-1 py-2 text-xs font-body transition-colors',
                    visibility === 'private' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory'
                  )}
                >
                  Keep Private
                </button>
                <button
                  type="button"
                  onClick={() => setVisibility('circle')}
                  className={cn(
                    'flex-1 py-2 text-xs font-body transition-colors',
                    visibility === 'circle' ? 'bg-gold/15 text-gold' : 'text-ivory-dim hover:text-ivory'
                  )}
                >
                  Share with The Gents
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" fullWidth onClick={() => setStep('input')} disabled={saving}>
                Back
              </Button>
              <Button
                fullWidth
                loading={saving}
                onClick={handleSave}
                disabled={!fields.display_name.trim()}
              >
                Add to Circle
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  )
}
