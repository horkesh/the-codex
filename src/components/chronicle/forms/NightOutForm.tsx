import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { LocationFill } from '@/lib/geo'

export interface NightOutFormData {
  title: string
  date: string
  location: string
  description: string
}

interface NightOutFormProps {
  onSubmit: (data: NightOutFormData) => Promise<void>
  loading: boolean
  detectedLocation?: LocationFill
  suggestedTitle?: string | null
  onRetitle?: () => void
  initialData?: Partial<NightOutFormData>
}

const empty: NightOutFormData = {
  title: '',
  date: '',
  location: '',
  description: '',
}

interface FieldErrors {
  title?: string
  date?: string
}

export function NightOutForm({ onSubmit, loading, detectedLocation, suggestedTitle, onRetitle, initialData }: NightOutFormProps) {
  const [form, setForm] = useState<NightOutFormData>(() => ({ ...empty, ...initialData }))
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

  function set(field: keyof NightOutFormData, value: string) {
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
          label="What was the night?"
          placeholder="Enter a title"
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
        label="Venue or Area"
        placeholder="Where did it go down?"
        value={form.location}
        onChange={(e) => set('location', e.target.value)}
      />

      <Input
        as="textarea"
        label="How was it?"
        placeholder="The highlights, the lowlights, the moments..."
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
        Log Night Out
      </Button>
    </form>
  )
}
