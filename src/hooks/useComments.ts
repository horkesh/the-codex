import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { fetchComments, fetchCommentById, addComment as addCommentData, deleteComment as deleteCommentData } from '@/data/entryComments'
import type { EntryComment } from '@/types/app'

export function useComments(entryId: string) {
  const [comments, setComments] = useState<EntryComment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchComments(entryId)
      .then(setComments)
      .catch(() => {})
      .finally(() => setLoading(false))

    // Realtime subscription
    const channel = supabase
      .channel(`entry_comments:${entryId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entry_comments', filter: `entry_id=eq.${entryId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch only the new comment (with gent join) rather than all comments
            fetchCommentById(payload.new.id as string).then((comment) => {
              if (!comment) return
              setComments((prev) => prev.find((c) => c.id === comment.id) ? prev : [...prev, comment])
            }).catch(() => {})
          } else if (payload.eventType === 'DELETE') {
            setComments((prev) => prev.filter((c) => c.id !== payload.old.id))
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [entryId])

  const addComment = useCallback(
    async (gentId: string, body: string): Promise<void> => {
      const comment = await addCommentData(entryId, gentId, body)
      // Optimistically add (realtime will also fire but deduplication handled server-side)
      setComments((prev) => {
        if (prev.find((c) => c.id === comment.id)) return prev
        return [...prev, comment]
      })
    },
    [entryId],
  )

  const deleteComment = useCallback(async (id: string): Promise<void> => {
    setComments((prev) => prev.filter((c) => c.id !== id))
    await deleteCommentData(id)
  }, [])

  return { comments, loading, addComment, deleteComment }
}
