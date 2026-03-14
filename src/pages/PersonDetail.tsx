import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Instagram, MapPin, Calendar, Trash2, Edit2 } from 'lucide-react'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Avatar, Spinner, Modal } from '@/components/ui'
import { usePerson } from '@/hooks/usePerson'
import { PrivateNoteSection } from '@/components/circle/PrivateNoteSection'
import { PersonForm } from '@/components/circle/PersonForm'
import type { PersonFormData } from '@/components/circle/PersonForm'
import { deletePerson, updatePerson } from '@/data/people'
import { useUIStore } from '@/store/ui'
import { cn, formatDate } from '@/lib/utils'
import type { PersonWithPrivateNote } from '@/types/app'

function SectionDivider({ label, icon }: { label: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 my-4">
      <div className="flex-1 h-px bg-white/10" />
      <div className="flex items-center gap-1.5 shrink-0">
        {icon}
        <span className="text-[10px] uppercase tracking-widest text-ivory-dim font-body">
          {label}
        </span>
      </div>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  )
}

export default function PersonDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { addToast } = useUIStore()
  const { person, setPerson, loading, notFound } = usePerson(id)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSaveEdit = async (data: PersonFormData) => {
    if (!person) return
    const igHandle = data.instagram?.replace(/^@/, '').trim()
    const instagramChanged = (data.instagram || '') !== (person.instagram || '')
    const updated = await updatePerson(person.id, {
      name: data.name,
      instagram: data.instagram || null,
      photo_url: igHandle && instagramChanged
        ? `https://unavatar.io/instagram/${igHandle}`
        : person.photo_url,
      met_location: data.met_location || null,
      met_date: data.met_date || null,
      notes: data.notes || null,
      labels: data.labels,
    })
    // Preserve private_note from existing person
    setPerson({ ...updated, private_note: person.private_note } as PersonWithPrivateNote)
    addToast('Contact updated', 'success')
    setShowEditForm(false)
  }

  const handleDelete = async () => {
    if (!person) return
    setDeleting(true)
    try {
      await deletePerson(person.id)
      addToast('Contact removed', 'info')
      navigate(-1)
    } catch {
      addToast('Failed to delete contact', 'error')
      setDeleting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Contact" back />
        <div className="flex-1 flex items-center justify-center">
          <Spinner size="md" />
        </div>
      </div>
    )
  }

  // Not found
  if (notFound || !person) {
    return (
      <div className="flex flex-col h-full">
        <TopBar title="Not Found" back />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-4">
          <p className="text-ivory-dim text-sm font-body">This contact could not be found.</p>
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            Go back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title={person.name}
        back
        right={
          <button
            type="button"
            onClick={() => setShowEditForm(true)}
            className="flex items-center justify-center w-8 h-8 text-ivory-muted hover:text-ivory transition-colors"
            aria-label="Edit contact"
          >
            <Edit2 size={16} />
          </button>
        }
      />

      <PageWrapper>
        {/* Avatar — large, centered */}
        <div className="flex flex-col items-center gap-2 pt-4 pb-2">
          {person.portrait_url ? (
            <div className="flex items-end gap-3">
              <Avatar src={person.photo_url} name={person.name} size="xl" />
              <div className="flex flex-col items-center gap-1 mb-0.5">
                <img
                  src={person.portrait_url}
                  alt={`${person.name} portrait`}
                  className="w-14 h-14 rounded-xl object-cover border border-gold/30"
                />
                <span className="text-[9px] text-ivory-dim font-body">AI Portrait</span>
              </div>
            </div>
          ) : (
            <Avatar src={person.photo_url} name={person.name} size="xl" />
          )}

          {/* Name */}
          <h2 className="font-display text-2xl text-ivory text-center leading-tight">
            {person.name}
          </h2>

          {/* Instagram */}
          {person.instagram && (
            <a
              href={`https://instagram.com/${person.instagram.replace(/^@/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-gold hover:text-gold-light transition-colors font-body"
            >
              <Instagram size={14} />
              @{person.instagram.replace(/^@/, '')}
            </a>
          )}
        </div>

        {/* Info row: location + date */}
        {(person.met_location || person.met_date) && (
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {person.met_location && (
              <div className="flex items-center gap-1.5 text-xs text-ivory-dim font-body">
                <MapPin size={12} className="text-gold-muted shrink-0" />
                {person.met_location}
              </div>
            )}
            {person.met_date && (
              <div className="flex items-center gap-1.5 text-xs text-ivory-dim font-body">
                <Calendar size={12} className="text-gold-muted shrink-0" />
                {formatDate(person.met_date)}
              </div>
            )}
          </div>
        )}

        {/* Labels */}
        {person.labels.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5 mt-3">
            {person.labels.map((label) => (
              <span
                key={label}
                className={cn(
                  'inline-flex items-center rounded-full px-2.5 py-1',
                  'bg-slate-light text-ivory-dim text-xs font-body',
                )}
              >
                {label}
              </span>
            ))}
          </div>
        )}

        {/* Shared Notes */}
        <SectionDivider label="Shared Notes" />
        {person.notes ? (
          <p className="text-sm text-ivory-muted font-body leading-relaxed whitespace-pre-wrap">
            {person.notes}
          </p>
        ) : (
          <p className="text-sm text-ivory-dim font-body italic text-center">
            No shared notes yet
          </p>
        )}

        {/* Private Note */}
        <div className="mt-2">
          <PrivateNoteSection
            personId={person.id}
            initialNote={person.private_note}
          />
        </div>

        {/* Delete button */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="danger"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            className="gap-2 bg-transparent border border-[--color-error]/40 text-[--color-error] hover:bg-[--color-error]/10"
          >
            <Trash2 size={14} />
            Remove from Circle
          </Button>
        </div>
      </PageWrapper>

      {/* Edit modal */}
      <PersonForm
        isOpen={showEditForm}
        onClose={() => setShowEditForm(false)}
        onSave={handleSaveEdit}
        person={person}
      />

      {/* Delete confirm modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Remove Contact"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ivory-muted font-body">
            Are you sure you want to remove{' '}
            <span className="text-ivory font-medium">{person.name}</span> from your
            circle? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              fullWidth
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              fullWidth
              loading={deleting}
              onClick={handleDelete}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
