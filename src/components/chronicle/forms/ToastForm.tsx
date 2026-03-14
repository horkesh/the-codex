import { useState, useEffect } from 'react'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
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

export function ToastForm({ onSubmit, loading, detectedLocation }: ToastFormProps) {
  const [form, setForm] = useState<ToastFormData>(empty)

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

  function set(field: keyof ToastFormData, value: string) {
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
        label="The Toast"
        placeholder="What's the occasion?"
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
