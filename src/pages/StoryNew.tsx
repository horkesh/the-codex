import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { BookOpen, Check } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner, Input } from '@/components/ui'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { fetchEntries } from '@/data/entries'
import { createStory } from '@/data/stories'
import { generateStoryArc } from '@/ai/storyArc'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { cn, formatDate } from '@/lib/utils'
import { STORY_TYPE_COLORS as TYPE_COLORS, STORY_TYPE_LABELS as TYPE_LABELS } from '@/lib/entryTypes'
import type { Entry } from '@/types/app'

// ─── Step 1: Name it ──────────────────────────────────────────────────────────

interface Step1Props {
  title: string
  subtitle: string
  onTitleChange: (v: string) => void
  onSubtitleChange: (v: string) => void
  onNext: () => void
}

function Step1({ title, subtitle, onTitleChange, onSubtitleChange, onNext }: Step1Props) {
  return (
    <motion.div
      key="step1"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-6 pt-4"
    >
      <div>
        <h2 className="font-display text-2xl text-ivory leading-tight">
          What&apos;s the chapter called?
        </h2>
        <p className="text-sm text-ivory-dim font-body mt-1">
          Give this story a title that captures the arc.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Input
          label="Title"
          placeholder="e.g. The Winter Chapter"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          autoFocus
        />
        <Input
          label="Subtitle (optional)"
          placeholder="A brief strapline..."
          value={subtitle}
          onChange={(e) => onSubtitleChange(e.target.value)}
        />
      </div>

      <Button fullWidth onClick={onNext} disabled={!title.trim()}>
        Continue — Select Moments
      </Button>
    </motion.div>
  )
}

// ─── Step 2: Curate entries ───────────────────────────────────────────────────

interface Step2Props {
  entries: Entry[]
  loading: boolean
  selected: Set<string>
  onToggle: (id: string) => void
  onBack: () => void
  onNext: () => void
}

function Step2({ entries, loading, selected, onToggle, onBack, onNext }: Step2Props) {
  const published = entries.filter((e) => e.status === 'published')

  return (
    <motion.div
      key="step2"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-4 pt-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl text-ivory leading-tight">Curate the Moments</h2>
          <p className="text-xs text-ivory-dim font-body mt-0.5">
            {selected.size} selected
          </p>
        </div>
        <Button
          size="sm"
          onClick={onNext}
          disabled={selected.size < 2}
        >
          Review Arc
        </Button>
      </div>

      {selected.size > 0 && selected.size < 2 && (
        <p className="text-xs text-gold font-body">Select at least 2 moments to continue</p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Spinner size="md" />
        </div>
      ) : published.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
          <BookOpen size={32} className="text-ivory-dim opacity-40" />
          <p className="text-sm text-ivory-dim font-body">No published entries yet</p>
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="flex flex-col gap-2"
        >
          {published.map((entry) => {
            const isSelected = selected.has(entry.id)
            const typeColor = TYPE_COLORS[entry.type] ?? TYPE_COLORS.interlude
            const typeLabel = TYPE_LABELS[entry.type] ?? entry.type

            return (
              <motion.button
                key={entry.id}
                type="button"
                variants={staggerItem}
                onClick={() => onToggle(entry.id)}
                className={cn(
                  'w-full text-left flex items-center gap-3 px-3 py-3 rounded-xl border transition-all duration-150',
                  isSelected
                    ? 'border-gold/50 bg-gold/8'
                    : 'border-white/6 bg-slate-dark hover:border-white/15'
                )}
              >
                {/* Type badge */}
                <span className={cn(
                  'shrink-0 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-md border font-body',
                  typeColor
                )}>
                  {typeLabel}
                </span>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ivory font-body leading-tight truncate">{entry.title}</p>
                  <p className="text-xs text-ivory-dim font-body mt-0.5">
                    {formatDate(entry.date)}
                    {entry.city ? ` · ${entry.city}` : ''}
                  </p>
                </div>

                {/* Check indicator */}
                <div className={cn(
                  'shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all',
                  isSelected ? 'bg-gold border-gold' : 'border-white/20'
                )}>
                  {isSelected && <Check size={11} className="text-obsidian" strokeWidth={3} />}
                </div>
              </motion.button>
            )
          })}
        </motion.div>
      )}

      <Button variant="ghost" fullWidth onClick={onBack} className="mt-2">
        Back
      </Button>
    </motion.div>
  )
}

// ─── Step 3: Review & Generate ────────────────────────────────────────────────

interface Step3Props {
  selectedEntries: Entry[]
  generatedLore: string
  generating: boolean
  onGenerate: () => void
  onBack: () => void
  onSave: () => void
  saving: boolean
}

function Step3({ selectedEntries, generatedLore, generating, onGenerate, onBack, onSave, saving }: Step3Props) {
  const dates = selectedEntries.map((e) => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime())
  const earliest = dates[0]
  const latest = dates[dates.length - 1]

  const places = Array.from(
    new Set(selectedEntries.map((e) => e.city).filter(Boolean))
  ) as string[]

  return (
    <motion.div
      key="step3"
      variants={fadeUp}
      initial="initial"
      animate="animate"
      exit="exit"
      className="flex flex-col gap-5 pt-4"
    >
      <div>
        <h2 className="font-display text-xl text-ivory leading-tight">Review & Generate</h2>
        <p className="text-xs text-ivory-dim font-body mt-0.5">
          Let Claude craft the narrative arc for this chapter.
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-slate-mid border border-white/8 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-ivory-dim font-body uppercase tracking-widest">Moments</span>
          <span className="text-sm text-ivory font-body">{selectedEntries.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-ivory-dim font-body uppercase tracking-widest">Date Range</span>
          <span className="text-sm text-ivory font-body">
            {formatDate(earliest.toISOString())} — {formatDate(latest.toISOString())}
          </span>
        </div>
        {places.length > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-xs text-ivory-dim font-body uppercase tracking-widest">Places</span>
            <span className="text-sm text-ivory font-body">{places.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Generate button */}
      <Button
        variant="outline"
        fullWidth
        onClick={onGenerate}
        loading={generating}
        disabled={generating}
      >
        {generatedLore ? 'Regenerate Arc' : 'Generate Arc'}
      </Button>

      {/* Generated lore */}
      <AnimatePresence>
        {generatedLore && (
          <motion.div
            variants={fadeUp}
            initial="initial"
            animate="animate"
            exit="exit"
            className="bg-gold/5 border-l-2 border-gold/40 rounded-r-xl px-4 py-4"
          >
            <p className="font-display italic text-ivory-muted text-sm leading-relaxed whitespace-pre-wrap">
              {generatedLore}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button variant="ghost" fullWidth onClick={onBack} disabled={saving || generating}>
          Back
        </Button>
        <Button
          fullWidth
          loading={saving}
          onClick={onSave}
          disabled={saving || generating}
        >
          Save Story
        </Button>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function StoryNew() {
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  const [step, setStep] = useState(1)

  // Step 1
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')

  // Step 2
  const [entries, setEntries] = useState<Entry[]>([])
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Step 3
  const [generatedLore, setGeneratedLore] = useState('')
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load entries when reaching step 2
  useEffect(() => {
    if (step !== 2 || entries.length > 0) return
    setEntriesLoading(true)
    fetchEntries()
      .then(setEntries)
      .catch(() => addToast('Failed to load entries', 'error'))
      .finally(() => setEntriesLoading(false))
  }, [step])

  const toggleEntry = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedEntries = entries.filter((e) => selectedIds.has(e.id))

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const result = await generateStoryArc(title, selectedEntries, [])
      setGeneratedLore(result ?? '')
    } catch {
      addToast('Failed to generate arc — try again', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!gent) return
    setSaving(true)
    try {
      const story = await createStory({
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        created_by: gent.id,
        entry_ids: Array.from(selectedIds),
        lore: generatedLore || null,
        cover_url: null,
        stamp_url: null,
        status: 'draft',
      })
      addToast('Story created', 'success')
      navigate(`/passport/stories/${story.id}`)
    } catch {
      addToast('Failed to save story', 'error')
    } finally {
      setSaving(false)
    }
  }

  const stepLabel = `${step} of 3`

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="New Story"
        back
        subtitle={stepLabel}
      />

      <PageWrapper>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <Step1
              title={title}
              subtitle={subtitle}
              onTitleChange={setTitle}
              onSubtitleChange={setSubtitle}
              onNext={() => setStep(2)}
            />
          )}

          {step === 2 && (
            <Step2
              entries={entries}
              loading={entriesLoading}
              selected={selectedIds}
              onToggle={toggleEntry}
              onBack={() => setStep(1)}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <Step3
              selectedEntries={selectedEntries}
              generatedLore={generatedLore}
              generating={generating}
              onGenerate={handleGenerate}
              onBack={() => setStep(2)}
              onSave={handleSave}
              saving={saving}
            />
          )}
        </AnimatePresence>
      </PageWrapper>
    </div>
  )
}
