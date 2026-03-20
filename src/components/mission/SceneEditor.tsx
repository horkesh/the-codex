import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import type { Scene, EntryPhoto } from '@/types/app'

interface Props {
  scene: Scene
  photos: EntryPhoto[]
  onSave: (updated: { narrative?: string; title?: string; directorNote?: string }) => void
  onRegenerate: (directorNote: string) => Promise<string | null>
  onClose: () => void
}

export function SceneEditor({ scene, photos, onSave, onRegenerate, onClose }: Props) {
  const [title, setTitle] = useState(scene.title ?? '')
  const [narrative, setNarrative] = useState(scene.narrative ?? '')
  const [directorNote, setDirectorNote] = useState('')
  const [regenerating, setRegenerating] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [narrative])

  const handleRegenerate = async () => {
    if (!directorNote.trim()) return
    setRegenerating(true)
    try {
      const result = await onRegenerate(directorNote.trim())
      if (result) setNarrative(result)
    } catch (err) {
      console.error('Scene regeneration failed:', err)
    } finally {
      setRegenerating(false)
    }
  }

  const handleSave = () => {
    onSave({
      narrative: narrative !== scene.narrative ? narrative : undefined,
      title: title !== scene.title ? title : undefined,
      directorNote: directorNote.trim() || undefined,
    })
    onClose()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-obsidian/95 backdrop-blur-sm overflow-y-auto"
    >
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-display text-gold text-lg">Edit Scene</h3>
          <button onClick={onClose} className="text-ivory/40 text-sm font-body">Cancel</button>
        </div>

        {/* Scene title */}
        <div>
          <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-1 block">
            Scene Title
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full bg-ivory/5 border border-ivory/10 rounded px-3 py-2 text-ivory font-body text-sm"
          />
        </div>

        {/* Narrative */}
        <div>
          <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-1 block">
            Narrative
          </label>
          <textarea
            ref={textareaRef}
            value={narrative}
            onChange={e => setNarrative(e.target.value)}
            className="w-full bg-ivory/5 border border-ivory/10 rounded px-3 py-2 text-ivory font-body text-sm resize-none min-h-[100px]"
          />
        </div>

        {/* Director's Note */}
        <div>
          <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-1 block">
            Director's Note (context for AI)
          </label>
          <textarea
            value={directorNote}
            onChange={e => setDirectorNote(e.target.value)}
            placeholder="What really happened here? Add insider context the photos can't show..."
            className="w-full bg-ivory/5 border border-ivory/10 rounded px-3 py-2 text-ivory/60 font-body text-sm resize-none min-h-[80px] placeholder:text-ivory/20"
          />
          {directorNote.trim() && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="mt-2 px-3 py-1.5 text-xs font-body font-semibold text-gold border border-gold/30 rounded-full hover:bg-gold/10 disabled:opacity-40"
            >
              {regenerating ? 'Regenerating...' : 'Regenerate with Note'}
            </button>
          )}
        </div>

        {/* Photo strip */}
        <div>
          <label className="text-[10px] font-body uppercase tracking-widest text-ivory/40 mb-1 block">
            Scene Photos ({photos.length})
          </label>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {photos.map(p => (
              <img
                key={p.id}
                src={p.url}
                className="w-16 h-16 object-cover rounded flex-shrink-0 border border-ivory/10"
                alt=""
              />
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          className="w-full py-3 bg-gold/20 text-gold font-display text-sm rounded-lg border border-gold/30"
        >
          Save Changes
        </button>
      </div>
    </motion.div>
  )
}
