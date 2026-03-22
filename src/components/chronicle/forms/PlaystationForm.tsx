import { useState, useEffect, useRef } from 'react'
import { RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Input, DatePicker } from '@/components/ui'
import { Button } from '@/components/ui'
import { staggerItem } from '@/lib/animations'
import { getChronologicalVol } from '@/data/entries'
import type { GentAlias, PS5Match } from '@/types/app'
import type { LocationFill } from '@/lib/geo'

export interface PlaystationFormData {
  title: string
  date: string
  location: string
  matches: PS5Match[]
}

interface PlaystationFormProps {
  onSubmit: (data: PlaystationFormData) => Promise<void>
  loading: boolean
  detectedLocation?: LocationFill
  suggestedTitle?: string | null
  onRetitle?: () => void
  initialData?: Partial<PlaystationFormData>
}

const ALIASES: GentAlias[] = ['keys', 'bass', 'lorekeeper', 'operative']

const ALIAS_LABELS: Record<GentAlias, string> = {
  keys: 'Keys',
  bass: 'Bass',
  lorekeeper: 'Lorekeeper',
  operative: 'Operative',
}

interface FieldErrors {
  title?: string
  date?: string
  matches?: string
}

function parseWinner(
  score: string,
  p1: GentAlias,
  p2: GentAlias,
): GentAlias | null {
  // Expects "X-Y" format
  const parts = score.trim().split('-')
  if (parts.length !== 2) return null
  const a = parseInt(parts[0], 10)
  const b = parseInt(parts[1], 10)
  if (isNaN(a) || isNaN(b)) return null
  if (a > b) return p1
  if (b > a) return p2
  return null // draw
}

function emptyMatch(matchNumber: number): PS5Match {
  return {
    match_number: matchNumber,
    p1: 'keys',
    p2: 'bass',
    score: '',
    winner: null,
  }
}

interface HeadToHead {
  label: string
  wins: [number, number]
}

function computeHeadToHead(matches: PS5Match[]): HeadToHead[] {
  const pairs: Map<string, [GentAlias, GentAlias, number, number]> = new Map()

  for (const match of matches) {
    if (!match.score) continue
    const key = [match.p1, match.p2].sort().join('_vs_')
    if (!pairs.has(key)) {
      const sorted = [match.p1, match.p2].sort() as [GentAlias, GentAlias]
      pairs.set(key, [sorted[0], sorted[1], 0, 0])
    }
    const entry = pairs.get(key)!
    if (match.winner === entry[0]) entry[2]++
    else if (match.winner === entry[1]) entry[3]++
  }

  const result: HeadToHead[] = []
  for (const [, [a, b, wA, wB]] of pairs) {
    result.push({
      label: `${ALIAS_LABELS[a]} vs ${ALIAS_LABELS[b]}`,
      wins: [wA, wB],
    })
  }
  return result
}

export function PlaystationForm({ onSubmit, loading, detectedLocation, suggestedTitle, onRetitle, initialData }: PlaystationFormProps) {
  const [title, setTitle] = useState(initialData?.title ?? '')
  const [date, setDate] = useState(initialData?.date ?? '')
  const [location, setLocation] = useState(initialData?.location ?? '')
  const [matches, setMatches] = useState<PS5Match[]>(initialData?.matches?.length ? initialData.matches : [emptyMatch(1)])
  const [errors, setErrors] = useState<FieldErrors>({})
  const [vol, setVol] = useState<number | null>(null)
  const titleEdited = useRef(!!initialData?.title)

  // Compute chronological vol whenever date changes
  useEffect(() => {
    if (!date) { setVol(null); return }
    getChronologicalVol('playstation', date).then(setVol).catch(() => setVol(1))
  }, [date])

  useEffect(() => {
    if (titleEdited.current || vol === null) return
    if (suggestedTitle) {
      setTitle(`${suggestedTitle} · Vol. ${vol}`)
      return
    }
    setTitle(`The Pitch · Vol. ${vol}`)
  }, [vol, suggestedTitle])

  // Auto-fill date + location from photo EXIF
  useEffect(() => {
    if (!detectedLocation) return
    if (!date && detectedLocation.date) setDate(detectedLocation.date)
    if (!location && detectedLocation.location) setLocation(detectedLocation.location)
  }, [detectedLocation, date, location])

  function addMatch() {
    setMatches((prev) => [...prev, emptyMatch(prev.length + 1)])
  }

  function removeMatch(index: number) {
    setMatches((prev) => {
      const updated = prev.filter((_, i) => i !== index)
      return updated.map((m, i) => ({ ...m, match_number: i + 1 }))
    })
  }

  function updateMatch(index: number, field: keyof PS5Match, value: string) {
    setMatches((prev) => {
      const updated = [...prev]
      const match = { ...updated[index] }

      if (field === 'p1') {
        match.p1 = value as GentAlias
        // Prevent same player on both sides
        if (match.p2 === value) {
          const other = ALIASES.find((a) => a !== value && a !== match.p1)
          if (other) match.p2 = other
        }
      } else if (field === 'p2') {
        match.p2 = value as GentAlias
        if (match.p1 === value) {
          const other = ALIASES.find((a) => a !== value && a !== match.p2)
          if (other) match.p1 = other
        }
      } else if (field === 'score') {
        match.score = value
        match.winner = parseWinner(value, match.p1, match.p2)
      }

      updated[index] = match
      return updated
    })
    if (errors.matches) setErrors((prev) => ({ ...prev, matches: undefined }))
  }

  function validate(): boolean {
    const next: FieldErrors = {}
    if (!title.trim()) next.title = 'Title is required'
    if (!date) next.date = 'Date is required'
    if (matches.length === 0) next.matches = 'Add at least one match'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    await onSubmit({ title, date, location, matches })
  }

  const headToHead = computeHeadToHead(matches)
  const completedMatches = matches.filter((m) => m.score.trim())

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="relative">
        <Input
          label="What were you playing?"
          placeholder="e.g. FC 24, EA FC 25..."
          value={title}
          onChange={(e) => {
            titleEdited.current = true
            setTitle(e.target.value)
            if (errors.title) setErrors((p) => ({ ...p, title: undefined }))
          }}
          error={errors.title}
          required
        />
        {onRetitle && (
          <button
            type="button"
            onClick={onRetitle}
            className="absolute right-3 top-[34px] text-ivory-dim hover:text-gold transition-colors"
            aria-label="Regenerate title"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      <DatePicker
        label="Date"
        value={date}
        onChange={(v) => {
          setDate(v)
          if (errors.date) setErrors((p) => ({ ...p, date: undefined }))
        }}
        error={errors.date}
        required
      />

      <Input
        label="Location"
        placeholder="e.g. Haris's place, The Living Room..."
        value={location}
        onChange={(e) => setLocation(e.target.value)}
      />

      {/* Match list */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="text-ivory-muted text-xs uppercase tracking-widest font-body">Matches</p>
          {errors.matches && (
            <p className="text-[--color-error] text-xs font-body">{errors.matches}</p>
          )}
        </div>

        <AnimatePresence initial={false}>
          {matches.map((match, index) => (
            <motion.div
              key={match.match_number}
              variants={staggerItem}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-mid rounded-lg border border-white/8 p-3 flex flex-col gap-3"
            >
              {/* Match header */}
              <div className="flex items-center justify-between">
                <span className="text-ivory-dim text-xs font-mono">
                  Match {match.match_number}
                </span>
                {matches.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeMatch(index)}
                    className="text-ivory-dim hover:text-red-400 transition-colors text-xs font-body"
                  >
                    Remove
                  </button>
                )}
              </div>

              {/* Players + score row */}
              <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                {/* P1 */}
                <div className="flex flex-col gap-1">
                  <label className="text-ivory-dim text-[10px] uppercase tracking-widest font-body">
                    Player 1
                  </label>
                  <select
                    value={match.p1}
                    onChange={(e) => updateMatch(index, 'p1', e.target.value)}
                    className="bg-slate-light border border-white/10 text-ivory font-body text-sm rounded-md h-9 px-2 focus:outline-none focus:border-gold/60"
                  >
                    {ALIASES.map((a) => (
                      <option key={a} value={a} disabled={a === match.p2}>
                        {ALIAS_LABELS[a]}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Score */}
                <div className="flex flex-col gap-1 items-center">
                  <label className="text-ivory-dim text-[10px] uppercase tracking-widest font-body">
                    Score
                  </label>
                  <input
                    type="text"
                    value={match.score}
                    onChange={(e) => updateMatch(index, 'score', e.target.value)}
                    placeholder="3-2"
                    className="w-16 bg-slate-light border border-white/10 text-ivory font-mono text-sm rounded-md h-9 px-2 text-center focus:outline-none focus:border-gold/60"
                  />
                </div>

                {/* P2 */}
                <div className="flex flex-col gap-1">
                  <label className="text-ivory-dim text-[10px] uppercase tracking-widest font-body">
                    Player 2
                  </label>
                  <select
                    value={match.p2}
                    onChange={(e) => updateMatch(index, 'p2', e.target.value)}
                    className="bg-slate-light border border-white/10 text-ivory font-body text-sm rounded-md h-9 px-2 focus:outline-none focus:border-gold/60"
                  >
                    {ALIASES.map((a) => (
                      <option key={a} value={a} disabled={a === match.p1}>
                        {ALIAS_LABELS[a]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Winner indicator */}
              {match.score && (
                <div className="text-center">
                  {match.winner ? (
                    <span className="text-gold text-xs font-body">
                      {ALIAS_LABELS[match.winner]} wins
                    </span>
                  ) : match.score.includes('-') ? (
                    <span className="text-ivory-dim text-xs font-body">Draw</span>
                  ) : null}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        <button
          type="button"
          onClick={addMatch}
          className="flex items-center justify-center gap-2 h-10 rounded-lg border border-dashed border-white/20 text-ivory-dim hover:text-ivory-muted hover:border-white/30 transition-all font-body text-sm"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-none stroke-current stroke-[1.5]">
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
          Add Match
        </button>
      </div>

      {/* Live head-to-head tallies */}
      {completedMatches.length > 0 && headToHead.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-3 flex flex-col gap-2">
          <p className="text-ivory-muted text-xs uppercase tracking-widest font-body">
            Head to Head
          </p>
          {headToHead.map((h2h) => (
            <div key={h2h.label} className="flex items-center justify-between">
              <span className="text-ivory-dim text-xs font-body">{h2h.label}</span>
              <span className="text-gold font-mono text-sm">
                {h2h.wins[0]}–{h2h.wins[1]}
              </span>
            </div>
          ))}
        </div>
      )}

      <Button
        type="submit"
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        disabled={loading}
        className="mt-2"
      >
        Log The Pitch
      </Button>
    </form>
  )
}
