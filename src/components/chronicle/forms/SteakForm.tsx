import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import { fetchEntries } from '@/data/entries'
import type { LocationFill } from '@/lib/geo'

export interface SteakFormData {
  title: string
  date: string
  location: string
  description: string
  cut: string
  score: string
  verdict: string
}

interface SteakFormProps {
  onSubmit: (data: SteakFormData) => Promise<void>
  loading: boolean
  detectedLocation?: LocationFill
  initialData?: Partial<SteakFormData>
}

const CUTS = ['Ribeye', 'Wagyu', 'T-Bone', 'Striploin', 'Fillet', 'Other']

const empty: SteakFormData = {
  title: '',
  date: '',
  location: '',
  description: '',
  cut: '',
  score: '',
  verdict: '',
}

interface FieldErrors {
  title?: string
  date?: string
  score?: string
}

export function SteakForm({ onSubmit, loading, detectedLocation, initialData }: SteakFormProps) {
  const [form, setForm] = useState<SteakFormData>(() => ({ ...empty, ...initialData }))
  const [vol, setVol] = useState<number | null>(null)
  const titleEdited = useRef(!!initialData?.title)

  // Fetch vol number once on mount
  useEffect(() => {
    fetchEntries({ type: 'steak' }).then((entries) => setVol(entries.length + 1)).catch(() => setVol(1))
  }, [])

  // Auto-fill title from vol + location (unless user has manually edited it)
  useEffect(() => {
    if (vol === null || titleEdited.current) return
    const locationPart = form.location ? ` at ${form.location}` : ''
    setForm((prev) => ({ ...prev, title: `The Table${locationPart} · Vol. ${vol}` }))
  }, [vol, form.location]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!detectedLocation) return
    const ow = detectedLocation.overwrite
    setForm((prev) => ({
      ...prev,
      date: prev.date || detectedLocation.date || prev.date,
      location: ow ? (detectedLocation.location ?? prev.location) : (prev.location || detectedLocation.location || prev.location),
    }))
  }, [detectedLocation])
  const [errors, setErrors] = useState<FieldErrors>({})

  function set(field: keyof SteakFormData, value: string) {
    if (field === 'title') titleEdited.current = true
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (!form.date) next.date = 'Date is required'
    if (form.score) {
      const n = Number(form.score)
      if (isNaN(n) || n < 1 || n > 10) {
        next.score = 'Score must be between 1 and 10'
      }
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Input
        label="The Table"
        placeholder="Name the occasion"
        value={form.title}
        onChange={(e) => set('title', e.target.value)}
        error={errors.title}
        required
      />

      <Input
        label="Date"
        type="date"
        value={form.date}
        onChange={(e) => set('date', e.target.value)}
        error={errors.date}
        required
        className={cn(!form.date && 'text-ivory-dim')}
      />

      <Input
        label="Restaurant"
        placeholder="Where was this?"
        value={form.location}
        onChange={(e) => set('location', e.target.value)}
      />

      {/* Cut selector */}
      <div className="flex flex-col gap-1.5">
        <label className="text-ivory-muted text-xs uppercase tracking-widest font-body">
          The Cut
        </label>
        <div className="grid grid-cols-3 gap-2">
          {CUTS.map((cut) => (
            <button
              key={cut}
              type="button"
              onClick={() => set('cut', cut)}
              className={cn(
                'h-9 rounded-md border text-sm font-body transition-all duration-150',
                form.cut === cut
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-white/10 bg-white/5 text-ivory-muted hover:border-white/20 hover:text-ivory',
              )}
            >
              {cut}
            </button>
          ))}
        </div>
      </div>

      <Input
        label="The Verdict, out of 10"
        type="number"
        placeholder="1 – 10"
        min={1}
        max={10}
        step={0.5}
        value={form.score}
        onChange={(e) => set('score', e.target.value)}
        error={errors.score}
        hint="Half points allowed"
      />

      <Input
        as="textarea"
        label="In one line, the verdict"
        placeholder="e.g. Perfectly rested, crust like armour — the best ribeye in Lagos."
        value={form.verdict}
        onChange={(e) => set('verdict', e.target.value)}
        rows={2}
      />

      <Input
        as="textarea"
        label="The Full Story"
        placeholder="Describe the experience..."
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={4}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        disabled={loading}
        className="mt-2"
      >
        Log The Table
      </Button>
    </form>
  )
}
