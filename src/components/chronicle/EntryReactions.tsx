import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchReactions, upsertReaction, deleteReaction } from '@/data/reactions'
import { useAuthStore } from '@/store/auth'
import type { Reaction, ReactionType } from '@/types/app'

// ─── Reaction definitions ─────────────────────────────────────────────────────

const REACTIONS: { type: ReactionType; symbol: string; label: string }[] = [
  { type: 'legendary', symbol: '★', label: 'Legendary' },
  { type: 'classic',   symbol: '•', label: 'Classic'   },
  { type: 'ruthless',  symbol: '✦', label: 'Ruthless'  },
  { type: 'noted',     symbol: '◈', label: 'Noted'     },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface EntryReactionsProps {
  entryId: string
  compact?: boolean
}

// ─── Component ───────────────────────────────────────────────────────────────

export function EntryReactions({ entryId, compact = false }: EntryReactionsProps) {
  const gent = useAuthStore((s) => s.gent)
  const [reactions, setReactions] = useState<Reaction[]>([])
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  // Load reactions on mount and whenever entryId changes
  useEffect(() => {
    setLoaded(false)
    fetchReactions(entryId)
      .then((data) => {
        setReactions(data)
        setLoaded(true)
      })
      .catch(() => {
        setLoaded(true)
      })
  }, [entryId])

  // Derive what the current gent has reacted with (if anything)
  const myReaction = gent
    ? reactions.find((r) => r.gent_id === gent.id)?.reaction_type ?? null
    : null

  // Count per type — single pass, memoized
  const countMap = useMemo<Record<ReactionType, number>>(() => {
    const map: Record<ReactionType, number> = { legendary: 0, classic: 0, ruthless: 0, noted: 0 }
    for (const r of reactions) map[r.reaction_type] = (map[r.reaction_type] ?? 0) + 1
    return map
  }, [reactions])

  const totalCount = reactions.length

  // Handle tap
  const handleReaction = useCallback(
    async (type: ReactionType) => {
      if (!gent || saving) return

      setSaving(true)
      try {
        if (myReaction === type) {
          // Toggle off — remove existing reaction
          await deleteReaction(entryId, gent.id)
          setReactions((prev) => prev.filter((r) => r.gent_id !== gent.id))
        } else {
          // Upsert — replaces any existing reaction for this gent
          await upsertReaction(entryId, gent.id, type)
          setReactions((prev) => {
            const without = prev.filter((r) => r.gent_id !== gent.id)
            return [
              ...without,
              {
                id: `${entryId}-${gent.id}`,
                entry_id: entryId,
                gent_id: gent.id,
                reaction_type: type,
                created_at: new Date().toISOString(),
              },
            ]
          })
        }
      } catch {
        // Silently revert — UI stays as-is; user can retry
      } finally {
        setSaving(false)
      }
    },
    [entryId, gent, myReaction, saving],
  )

  // ─── Compact mode — single aggregate chip ──────────────────────────────────

  if (compact) {
    if (!loaded || totalCount === 0) return null
    // Find the most common reaction type to show its symbol
    const dominant = REACTIONS.map((r) => ({ ...r, count: countMap[r.type] }))
      .sort((a, b) => b.count - a.count)[0]
    return (
      <span className="inline-flex items-center gap-1 font-mono text-xs text-ivory-dim">
        <span className="text-gold">{dominant.symbol}</span>
        {totalCount}
      </span>
    )
  }

  // ─── Full mode ─────────────────────────────────────────────────────────────

  return (
    <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Entry reactions">
      {REACTIONS.map(({ type, symbol, label }) => {
        const count = countMap[type]
        const isMyReaction = myReaction === type

        return (
          <motion.button
            key={type}
            type="button"
            disabled={!gent || saving}
            onClick={() => handleReaction(type)}
            aria-label={`${label} — ${count} reaction${count !== 1 ? 's' : ''}${isMyReaction ? ', your reaction' : ''}`}
            aria-pressed={isMyReaction}
            whileTap={{ scale: 0.92 }}
            className={[
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-200',
              'bg-slate-dark disabled:opacity-50 disabled:pointer-events-none select-none',
              isMyReaction
                ? 'border-gold/40 bg-gold/5'
                : 'border-white/5 hover:border-white/15',
            ].join(' ')}
          >
            {/* Symbol */}
            <span
              className={[
                'font-mono text-sm leading-none',
                isMyReaction ? 'text-gold' : 'text-ivory-dim',
              ].join(' ')}
              aria-hidden="true"
            >
              {symbol}
            </span>

            {/* Count */}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={count}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                className="text-xs font-body text-ivory-dim tabular-nums min-w-[1ch] text-center"
              >
                {count}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        )
      })}
    </div>
  )
}
