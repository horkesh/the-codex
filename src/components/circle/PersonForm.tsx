import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import type { Person } from '@/types/app'

export interface PersonFormData {
  name: string
  instagram: string
  met_location: string
  met_date: string
  birthday: string
  notes: string
  labels: string[]
}

interface PersonFormProps {
  person?: Person
  onSave: (data: PersonFormData) => Promise<void>
  onClose: () => void
  isOpen: boolean
}

function getInitialData(person?: Person): PersonFormData {
  return {
    name: person?.name ?? '',
    instagram: person?.instagram ?? '',
    met_location: person?.met_location ?? '',
    met_date: person?.met_date ?? '',
    birthday: person?.birthday ?? '',
    notes: person?.notes ?? '',
    labels: person?.labels ?? [],
  }
}

export function PersonForm({ person, onSave, onClose, isOpen }: PersonFormProps) {
  const [form, setForm] = useState<PersonFormData>(() => getInitialData(person))
  const [labelInput, setLabelInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  // Reset form when modal opens / person changes
  useEffect(() => {
    if (isOpen) {
      setForm(getInitialData(person))
      setLabelInput('')
      setNameError('')
    }
  }, [isOpen, person])

  const set = <K extends keyof PersonFormData>(key: K, value: PersonFormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const addLabel = () => {
    const trimmed = labelInput.trim()
    if (!trimmed) return
    if (!form.labels.includes(trimmed)) {
      set('labels', [...form.labels, trimmed])
    }
    setLabelInput('')
  }

  const removeLabel = (label: string) => {
    set('labels', form.labels.filter((l) => l !== label))
  }

  const handleLabelKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addLabel()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setNameError('Name is required')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  const title = person ? 'Edit Contact' : 'Add to Circle'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Name */}
        <Input
          label="Full Name"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => {
            set('name', (e.target as HTMLInputElement).value)
            if (nameError) setNameError('')
          }}
          error={nameError}
          autoComplete="off"
          autoFocus
        />

        {/* Instagram */}
        <Input
          label="Instagram"
          placeholder="@handle"
          value={form.instagram}
          onChange={(e) => set('instagram', (e.target as HTMLInputElement).value)}
          autoComplete="off"
        />

        {/* Met location */}
        <Input
          label="Where did you meet?"
          placeholder="Where did you meet?"
          value={form.met_location}
          onChange={(e) => set('met_location', (e.target as HTMLInputElement).value)}
          autoComplete="off"
        />

        {/* Met date */}
        <Input
          label="Date Met"
          type="date"
          value={form.met_date}
          onChange={(e) => set('met_date', (e.target as HTMLInputElement).value)}
          className="[color-scheme:dark]"
        />

        {/* Birthday */}
        <Input
          label="Birthday"
          type="date"
          value={form.birthday}
          onChange={(e) => set('birthday', (e.target as HTMLInputElement).value)}
          className="[color-scheme:dark]"
        />

        {/* Notes */}
        <Input
          as="textarea"
          label="Shared Notes"
          placeholder="Shared notes (visible to all Gents)"
          value={form.notes}
          onChange={(e) => set('notes', (e.target as HTMLTextAreaElement).value)}
        />

        {/* Labels */}
        <div className="flex flex-col gap-1.5">
          <label className="text-ivory-muted text-xs uppercase tracking-widest font-body">
            Labels
          </label>

          {/* Existing labels */}
          {form.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1">
              {form.labels.map((label) => (
                <span
                  key={label}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-light px-2.5 py-1 text-xs font-body text-ivory-dim"
                >
                  {label}
                  <button
                    type="button"
                    onClick={() => removeLabel(label)}
                    className="text-ivory-dim hover:text-ivory transition-colors"
                    aria-label={`Remove ${label}`}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Label input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              onKeyDown={handleLabelKeyDown}
              placeholder="Type a label and press Enter"
              className={cn(
                'flex-1 h-9 bg-slate-mid border border-white/10 rounded-[--radius-md]',
                'px-3 text-sm font-body text-ivory placeholder:text-ivory-dim',
                'focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20',
                'transition-colors duration-200',
              )}
            />
            <button
              type="button"
              onClick={addLabel}
              className={cn(
                'h-9 px-3 rounded-[--radius-md] text-xs font-body font-medium',
                'bg-slate-light text-ivory-muted hover:text-ivory transition-colors duration-150',
              )}
            >
              Add
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            fullWidth
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={saving}
            disabled={!form.name.trim() || saving}
          >
            {person ? 'Save Changes' : 'Add Contact'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
