import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router'
import { Wine, Trash2, Check } from 'lucide-react'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner } from '@/components/ui'
import { ToastLayout } from '@/components/chronicle/ToastLayout'
import { useEntry } from '@/hooks/useEntry'
import { useToastSession } from '@/hooks/useToastSession'
import { publishToastDraft, deleteToastDraft } from '@/data/toast'
import { checkToastAchievements } from '@/data/achievements'
import { fetchAppearancesByEntry } from '@/data/personAppearances'
import { fetchPeopleByIds } from '@/data/people'
import { notifyOthers } from '@/hooks/usePushNotifications'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { supabase } from '@/lib/supabase'

export default function ToastDraftReview() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  const { entry, photos, loading, notFound } = useEntry(id)
  const { session, loading: sessionLoading } = useToastSession(id)
  const [toastPeople, setToastPeople] = useState<Array<{ id: string; name: string; photo_url: string | null }>>([])

  useEffect(() => {
    if (!id) return
    fetchAppearancesByEntry(id)
      .then(async (appearances) => {
        if (appearances.length === 0) { setToastPeople([]); return }
        const personIds = appearances.map(a => a.person_id)
        const people = await fetchPeopleByIds(personIds)
        setToastPeople(people.map(p => ({ id: p.id, name: p.name, photo_url: p.photo_url })))
      })
      .catch(() => setToastPeople([]))
  }, [id])

  const [publishing, setPublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [removedConfessions, setRemovedConfessions] = useState<Set<string>>(new Set())

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

  // Filter out removed confessions for preview
  const filteredSession = useMemo(() => {
    if (!session || removedConfessions.size === 0) return session
    return {
      ...session,
      confessions: session.confessions.filter(c => !removedConfessions.has(c.id)),
    }
  }, [session, removedConfessions])

  async function handlePublish() {
    if (!entry || publishing) return
    setPublishing(true)
    try {
      if (removedConfessions.size > 0) {
        await supabase
          .from('toast_confessions' as any)
          .delete()
          .in('id', Array.from(removedConfessions))
      }
      await publishToastDraft(entry.id, {})
      // Fire-and-forget toast achievement check
      if (gent?.id) {
        checkToastAchievements(gent.id).catch(() => {})
      }
      // Notify other gents (fire-and-forget)
      if (gent?.id) {
        notifyOthers({
          title: `New ${ENTRY_TYPE_META.toast.label} logged`,
          body: entry.title,
          url: `/chronicle/${entry.id}`,
          tag: `entry-${entry.id}`,
          senderGentId: gent.id,
        })
      }
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
        {session?.confessions && session.confessions.length > 0 && (
          <div className="mb-4">
            <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold mb-2">
              Confessions
            </p>
            <div className="space-y-2">
              {session.confessions.map((c) => (
                <div
                  key={c.id}
                  className={`flex items-center justify-between bg-slate-dark rounded-lg p-3 border border-white/5 ${removedConfessions.has(c.id) ? 'opacity-30' : ''}`}
                >
                  <p className="text-ivory font-body text-sm italic flex-1 mr-3 line-clamp-1">&ldquo;{c.prompt}&rdquo;</p>
                  <button
                    onClick={() => {
                      const next = new Set(removedConfessions)
                      if (next.has(c.id)) next.delete(c.id)
                      else next.add(c.id)
                      setRemovedConfessions(next)
                    }}
                    className="text-xs text-ivory-dim font-body px-2 py-1 rounded border border-white/10"
                  >
                    {removedConfessions.has(c.id) ? 'Restore' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <ToastLayout
          entry={entry}
          session={filteredSession}
          people={toastPeople}
          photos={photos}
          isCreator={isCreator}
          controlsSlot={controlsSlot}
        />
      </PageWrapper>
    </>
  )
}
