import { useState, useRef, useEffect } from 'react'
import { Lock, Check, AlertCircle } from 'lucide-react'
import { upsertPrivateNote } from '@/data/people'
import { useAuthStore } from '@/store/auth'
import { cn } from '@/lib/utils'

interface PrivateNoteSectionProps {
  personId: string
  initialNote: string | null
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function PrivateNoteSection({ personId, initialNote }: PrivateNoteSectionProps) {
  const { gent } = useAuthStore()
  const [note, setNote] = useState(initialNote ?? '')
  const [status, setStatus] = useState<SaveStatus>('idle')
  const savedNoteRef = useRef(initialNote ?? '')
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Clear any pending timer on unmount to prevent state updates after unmount
  useEffect(() => {
    return () => {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
    }
  }, [])

  const handleBlur = async () => {
    if (!gent) return
    if (note === savedNoteRef.current) return

    setStatus('saving')
    try {
      await upsertPrivateNote(personId, gent.id, note)
      savedNoteRef.current = note
      setStatus('saved')
    } catch {
      setStatus('error')
    } finally {
      if (statusTimerRef.current) clearTimeout(statusTimerRef.current)
      statusTimerRef.current = setTimeout(() => {
        setStatus('idle')
      }, 2500)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-px bg-white/10" />
        <div className="flex items-center gap-1.5 shrink-0">
          <Lock size={12} className="text-gold-muted" />
          <span className="text-[10px] uppercase tracking-widest text-gold-muted font-body">
            Your Private Note
          </span>
        </div>
        <div className="flex-1 h-px bg-white/10" />
      </div>

      {/* Textarea */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={handleBlur}
        placeholder="Only you can see this..."
        rows={4}
        className={cn(
          'w-full bg-slate-mid border border-white/10 rounded-[--radius-md]',
          'px-3 py-2.5 text-sm font-body text-ivory placeholder:text-ivory-dim',
          'focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20',
          'transition-colors duration-200 resize-y min-h-[96px]',
        )}
      />

      {/* Save status */}
      <div className="h-4 flex items-center">
        {status === 'saving' && (
          <span className="text-xs text-ivory-dim font-body">Saving...</span>
        )}
        {status === 'saved' && (
          <span className="flex items-center gap-1 text-xs text-gold-muted font-body">
            <Check size={12} />
            Saved
          </span>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1 text-xs text-[--color-error] font-body">
            <AlertCircle size={12} />
            Failed to save
          </span>
        )}
      </div>
    </div>
  )
}
