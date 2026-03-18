import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { Input, DatePicker } from '@/components/ui'
import { Button } from '@/components/ui'
import type { LocationFill } from '@/lib/geo'

export interface ToastFormData {
  title: string
  date: string
  location: string
  description: string
}

interface ToastFormProps {
  onSubmit: (data: ToastFormData) => Promise<void>
  loading: boolean
  detectedLocation?: LocationFill
  suggestedTitle?: string | null
  onRetitle?: () => void
  initialData?: Partial<ToastFormData>
}

const empty: ToastFormData = {
  title: '',
  date: '',
  location: '',
  description: '',
}

interface FieldErrors {
  title?: string
  date?: string
}

export function ToastForm({ onSubmit, loading, detectedLocation, suggestedTitle, onRetitle, initialData }: ToastFormProps) {
  const [form, setForm] = useState<ToastFormData>(() => ({ ...empty, ...initialData }))
  const titleEdited = useRef(!!initialData?.title)

  useEffect(() => {
    if (!detectedLocation) return
    const ow = detectedLocation.overwrite
    setForm((prev) => ({
      ...prev,
      date: prev.date || detectedLocation.date || prev.date,
      location: ow ? (detectedLocation.location ?? prev.location) : (prev.location || detectedLocation.location || prev.location),
    }))
  }, [detectedLocation])

  useEffect(() => {
    if (suggestedTitle && !titleEdited.current) {
      setForm((prev) => ({ ...prev, title: suggestedTitle }))
    }
  }, [suggestedTitle])
  const [errors, setErrors] = useState<FieldErrors>({})

  function set(field: keyof ToastFormData, value: string) {
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
      <div className="relative">
        <Input
          label="The Toast"
          placeholder="What's the occasion?"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
          required
        />
        {onRetitle && (
          <button
            type="button"
            onClick={onRetitle}
            className="absolute right-3 top-[34px] text-ivory-dim hover:text-gold transition-colors"
            aria-label="Regenerate title"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      <DatePicker
        label="Date"
        value={form.date}
        onChange={(v) => set('date', v)}
        error={errors.date}
        required
      />

      <Input
        label="Location"
        placeholder="Bar, rooftop, someone's living room..."
        value={form.location}
        onChange={(e) => set('location', e.target.value)}
      />

      <Input
        as="textarea"
        label="Session Highlights"
        placeholder="What was poured? What was said?"
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
        Log The Toast
      </Button>
    </form>
  )
}
