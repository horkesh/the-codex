import { useState, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import { Avatar } from '@/components/ui'
import { useComments } from '@/hooks/useComments'
import { useAuthStore } from '@/store/auth'
import { formatDate } from '@/lib/utils'

interface CommentsSectionProps {
  entryId: string
}

export function CommentsSection({ entryId }: CommentsSectionProps) {
  const gent = useAuthStore((s) => s.gent)
  const { comments, addComment, deleteComment } = useComments(entryId)
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSend = async () => {
    const trimmed = body.trim()
    if (!trimmed || !gent || sending) return
    setSending(true)
    try {
      await addComment(gent.id, trimmed)
      setBody('')
    } catch {
      // silent — user can retry
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
        Comments
      </p>

      {/* Comment list */}
      {comments.length > 0 && (
        <div className="flex flex-col gap-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2.5 group">
              <div className="shrink-0 mt-0.5">
                <Avatar
                  src={comment.gent?.avatar_url ?? null}
                  name={comment.gent?.display_name ?? '?'}
                  size="xs"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="text-xs text-ivory font-body font-medium">
                    {comment.gent?.display_name ?? 'Unknown'}
                  </span>
                  <span className="text-[10px] text-ivory-dim font-body">
                    {formatDate(comment.created_at)}
                  </span>
                </div>
                <p className="text-sm text-ivory-muted font-body mt-0.5 leading-snug">
                  {comment.body}
                </p>
              </div>
              {gent && comment.gent_id === gent.id && (
                <button
                  type="button"
                  onClick={() => deleteComment(comment.id)}
                  className="shrink-0 p-1 rounded text-ivory-dim/40 hover:text-[--color-error] transition-colors opacity-0 group-hover:opacity-100"
                  aria-label="Delete comment"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div className="flex items-center gap-2">
        {gent && (
          <div className="shrink-0">
            <Avatar src={gent.avatar_url} name={gent.display_name} size="xs" />
          </div>
        )}
        <input
          ref={inputRef}
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={280}
          placeholder="Add a comment…"
          disabled={sending}
          className="flex-1 min-w-0 bg-slate-mid border border-white/8 rounded-full px-4 py-2 text-sm text-ivory font-body placeholder:text-ivory-dim/50 focus:outline-none focus:border-gold/40 focus:ring-1 focus:ring-gold/20 disabled:opacity-50 transition-colors"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!body.trim() || sending}
          className="shrink-0 px-3 py-2 rounded-full bg-gold/10 border border-gold/20 text-gold text-xs font-body font-medium hover:bg-gold/20 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          Send
        </button>
      </div>
    </div>
  )
}
