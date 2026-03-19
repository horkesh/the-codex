import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Wine, Trash2, Check } from 'lucide-react'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner } from '@/components/ui'
import { ToastLayout } from '@/components/chronicle/ToastLayout'
import { useEntry } from '@/hooks/useEntry'
import { useToastSession } from '@/hooks/useToastSession'
import { publishToastDraft, deleteToastDraft } from '@/data/toast'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'

export default function ToastDraftReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  const { entry, photos, loading, notFound } = useEntry(id)
  const { session, loading: sessionLoading } = useToastSession(id)

  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (loading || sessionLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Spinner size="md" />
      </div>
    )
  }

  if (notFound || !entry) {
    return (
      <>
        <TopBar title="Draft Not Found" back />
        <PageWrapper scrollable padded>
          <div className="flex flex-col items-center gap-4 pt-20">
            <Wine size={40} className="text-ivory-dim" />
            <p className="text-ivory-dim font-body text-sm">This draft no longer exists.</p>
            <Button variant="outline" size="md" onClick={() => navigate('/chronicle')}>
              Back to Chronicle
            </Button>
          </div>
        </PageWrapper>
      </>
    )
  }

  const isCreator = gent?.id === entry.created_by

  async function handlePublish() {
    if (!entry || publishing) return
    setPublishing(true)
    try {
      await publishToastDraft(entry.id, {})
      addToast('Toast published to Chronicle.', 'success')
      navigate(`/chronicle/${entry.id}`, { replace: true })
    } catch {
      addToast('Failed to publish.', 'error')
    } finally {
      setPublishing(false)
    }
  }

  async function handleDiscard() {
    if (!entry || deleting) return
    setDeleting(true)
    try {
      await deleteToastDraft(entry.id)
      addToast('Draft discarded.', 'success')
      navigate('/chronicle', { replace: true })
    } catch {
      addToast('Failed to discard.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const controlsSlot = isCreator ? (
    <div className="space-y-3 pt-2">
      <Button
        variant="primary"
        size="md"
        fullWidth
        loading={publishing}
        onClick={handlePublish}
      >
        <Check size={16} />
        Publish to Chronicle
      </Button>
      <Button
        variant="ghost"
        size="md"
        fullWidth
        className="text-[--color-error] hover:bg-[--color-error]/10"
        loading={deleting}
        onClick={handleDiscard}
      >
        <Trash2 size={16} />
        Discard Draft
      </Button>
    </div>
  ) : undefined

  return (
    <>
      <TopBar title="Review Draft" back />
      <PageWrapper scrollable padded>
        <ToastLayout
          entry={entry}
          session={session}
          people={[]}
          photos={photos}
          isCreator={isCreator}
          controlsSlot={controlsSlot}
        />
      </PageWrapper>
    </>
  )
}
