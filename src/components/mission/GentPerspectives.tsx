import { useState } from 'react'
import type { GentSceneNote, Scene, Gent } from '@/types/app'

interface Props {
  scene: Scene
  notes: GentSceneNote[]
  participants: Gent[]
  currentGentId: string
  isParticipant: boolean
  onAddNote: (sceneId: string, note: string) => void
}

export function GentPerspectives({ scene, notes, participants, currentGentId, isParticipant, onAddNote }: Props) {
  const [myNote, setMyNote] = useState(
    notes.find(n => n.gentId === currentGentId)?.note ?? ''
  )
  const [editing, setEditing] = useState(false)
  const otherNotes = notes.filter(n => n.gentId !== currentGentId)

  return (
    <div className="space-y-4">
      {/* Other Gents' perspectives */}
      {otherNotes.map(n => {
        const gent = participants.find(g => g.id === n.gentId)
        return (
          <div key={n.gentId} className="flex gap-3">
            <img
              src={gent?.avatar_url ?? ''}
              alt=""
              className="w-8 h-8 rounded-full border border-gold/20 shrink-0 mt-1"
            />
            <div>
              <p className="text-[10px] font-body uppercase tracking-widest text-gold/60 mb-0.5">
                {gent?.display_name ?? 'Unknown'}
              </p>
              <p className="text-ivory/70 font-body text-sm italic leading-relaxed">
                &ldquo;{n.note}&rdquo;
              </p>
            </div>
          </div>
        )
      })}

      {/* Current Gent's note */}
      {isParticipant && (
        <div className="border-t border-ivory/5 pt-3">
          {editing ? (
            <div className="space-y-2">
              <textarea
                value={myNote}
                onChange={e => setMyNote(e.target.value)}
                placeholder="What do you remember about this moment?"
                className="w-full bg-ivory/5 border border-ivory/10 rounded px-3 py-2 text-ivory/60 font-body text-sm resize-none min-h-[60px] placeholder:text-ivory/20"
                maxLength={300}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { onAddNote(scene.id, myNote.trim()); setEditing(false) }}
                  disabled={!myNote.trim()}
                  className="px-3 py-1 text-xs font-body font-semibold text-gold border border-gold/30 rounded-full disabled:opacity-30"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-3 py-1 text-xs font-body text-ivory/40"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="text-xs font-body text-ivory/30 hover:text-gold transition-colors"
            >
              {myNote ? 'Edit your perspective' : '+ Add your perspective'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
