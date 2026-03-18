import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { Input, DatePicker } from '@/components/ui'
import { Button } from '@/components/ui'

export interface InterludeFormData {
  title: string
  date: string
  description: string
}

interface InterludeFormProps {
  onSubmit: (data: InterludeFormData) => Promise<void>
  loading: boolean
  suggestedTitle?: string | null
  onRetitle?: () => void
  initialData?: Partial<InterludeFormData>
}

const empty: InterludeFormData = {
  title: '',
  date: '',
  description: '',
}

interface FieldErrors {
  title?: string
  date?: string
}

export function InterludeForm({ onSubmit, loading, suggestedTitle, onRetitle, initialData }: InterludeFormProps) {
  const [form, setForm] = useState<InterludeFormData>(() => ({ ...empty, ...initialData }))
  const [errors, setErrors] = useState<FieldErrors>({})
  const titleEdited = useRef(!!initialData?.title)

  useEffect(() => {
    if (suggestedTitle && !titleEdited.current) {
      setForm((prev) => ({ ...prev, title: suggestedTitle }))
    }
  }, [suggestedTitle])

  function set(field: keyof InterludeFormData, value: string) {
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
          label="What's the moment?"
          placeholder="Name this interlude"
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
        as="textarea"
        label="The thought or observation"
        placeholder="What needed to be said? What do you want to remember?"
        value={form.description}
        onChange={(e) => set('description', e.target.value)}
        rows={8}
        className="min-h-[180px]"
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
        Log Interlude
      </Button>
    </form>
  )
}
