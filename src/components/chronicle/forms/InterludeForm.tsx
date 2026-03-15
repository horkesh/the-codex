import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'

export interface InterludeFormData {
  title: string
  date: string
  description: string
}

interface InterludeFormProps {
  onSubmit: (data: InterludeFormData) => Promise<void>
  loading: boolean
  suggestedTitle?: string | null
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

export function InterludeForm({ onSubmit, loading, suggestedTitle, initialData }: InterludeFormProps) {
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
      <Input
        label="What's the moment?"
        placeholder="Name this interlude"
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
