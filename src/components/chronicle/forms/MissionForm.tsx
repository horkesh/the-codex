import { useState, useEffect } from 'react'
import { Input } from '@/components/ui'
import { Button } from '@/components/ui'
import { cn } from '@/lib/utils'
import type { LocationFill } from '@/lib/geo'

export interface MissionFormData {
  title: string
  date: string
  city: string
  country: string
  country_code: string
  location: string
  description: string
}

interface MissionFormProps {
  onSubmit: (data: MissionFormData) => Promise<void>
  loading: boolean
  detectedLocation?: LocationFill
  initialData?: Partial<MissionFormData>
}

const empty: MissionFormData = {
  title: '',
  date: '',
  city: '',
  country: '',
  country_code: '',
  location: '',
  description: '',
}

interface FieldErrors {
  title?: string
  date?: string
  city?: string
  country?: string
}

export function MissionForm({ onSubmit, loading, detectedLocation, initialData }: MissionFormProps) {
  const [form, setForm] = useState<MissionFormData>(() => ({ ...empty, ...initialData }))
  const [errors, setErrors] = useState<FieldErrors>({})

  useEffect(() => {
    if (!detectedLocation) return
    const ow = detectedLocation.overwrite
    setForm((prev) => ({
      ...prev,
      // date: never overwritten by an explicit place pick (places have no date)
      date: prev.date || detectedLocation.date || prev.date,
      city: ow ? (detectedLocation.city ?? prev.city) : (prev.city || detectedLocation.city || prev.city),
      country: ow ? (detectedLocation.country ?? prev.country) : (prev.country || detectedLocation.country || prev.country),
      country_code: ow ? (detectedLocation.country_code ?? prev.country_code) : (prev.country_code || detectedLocation.country_code || prev.country_code),
      location: ow ? (detectedLocation.location ?? prev.location) : (prev.location || detectedLocation.location || prev.location),
    }))
  }, [detectedLocation])

  function set(field: keyof MissionFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
    if (errors[field as keyof FieldErrors]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!form.title.trim()) next.title = 'Title is required'
    if (!form.date) next.date = 'Date is required'
    if (!form.city.trim()) next.city = 'City is required'
    if (!form.country.trim()) next.country = 'Country is required'
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
        label="Where did you go?"
        placeholder="Enter a title"
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

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="City"
          placeholder="e.g. Lagos"
          value={form.city}
          onChange={(e) => set('city', e.target.value)}
          error={errors.city}
          required
        />
        <Input
          label="Country"
          placeholder="e.g. Nigeria"
          value={form.country}
          onChange={(e) => set('country', e.target.value)}
          error={errors.country}
          required
        />
      </div>

      <Input
        label="Country Code"
        placeholder="e.g. NG"
        value={form.country_code}
        onChange={(e) => set('country_code', e.target.value.toUpperCase().slice(0, 2))}
        hint="2-letter ISO code — used for the flag"
        maxLength={2}
      />

      <Input
        label="Location"
        placeholder="Specific venue or address"
        value={form.location}
        onChange={(e) => set('location', e.target.value)}
      />

      <Input
        as="textarea"
        label="What happened?"
        placeholder="Describe the mission..."
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
        Log Mission
      </Button>
    </form>
  )
}
