import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Music, ExternalLink, Search, Sparkles, X, Check } from 'lucide-react'
import { Spinner } from '@/components/ui'
import { useSpotifySearch, type SpotifyTrack } from '@/hooks/useSpotifySearch'
import { suggestSoundtrack } from '@/ai/soundtrack'
import { updateEntry } from '@/data/entries'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import type { EntryWithParticipants } from '@/types/app'

export interface Soundtrack {
  name: string
  artist: string
  album?: string
  spotify_url?: string
  album_art?: string
  suggested_by?: 'ai' | 'user'
}

interface SoundtrackSectionProps {
  entry: EntryWithParticipants
  isCreator: boolean
  onEntryUpdate: (entry: EntryWithParticipants) => void
}

/* ── Suggestion banner (shown after AI suggest, before saving) ── */

interface SuggestionBannerProps {
  track: SpotifyTrack
  onAccept: () => void
  onDismiss: () => void
}

function SuggestionBanner({ track, onAccept, onDismiss }: SuggestionBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="flex items-center gap-3 bg-gold/8 border border-gold/20 rounded-lg px-3 py-2.5"
    >
      {track.album_art && (
        <img src={track.album_art} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-gold font-body font-semibold tracking-wide uppercase">Suggested Soundtrack</p>
        <p className="text-sm text-ivory font-body truncate">{track.name}</p>
        <p className="text-xs text-ivory-dim font-body truncate">{track.artist}</p>
      </div>
      <button
        type="button"
        onClick={onAccept}
        className="flex items-center justify-center w-8 h-8 rounded-full border border-gold/30 text-gold hover:bg-gold/10 transition-colors shrink-0"
        aria-label="Accept"
      >
        <Check size={14} />
      </button>
      <button
        type="button"
        onClick={onDismiss}
        className="flex items-center justify-center w-8 h-8 rounded-full text-ivory-dim hover:text-ivory transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  )
}

/* ── Search modal ── */

interface SearchModalProps {
  isOpen: boolean
  onClose: () => void
  onSelect: (track: SpotifyTrack) => void
  lore: string | null
  title: string
  city: string | null
  country: string | null
}

function SearchModal({ isOpen, onClose, onSelect, lore, title, city, country }: SearchModalProps) {
  const { results, searching, search, clear } = useSpotifySearch()
  const [query, setQuery] = useState('')
  const [suggesting, setSuggesting] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setQuery('')
      clear()
    }
  }, [isOpen, clear])

  const handleQueryChange = useCallback((val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (val.trim().length >= 2) search(val)
      else clear()
    }, 400)
  }, [search, clear])

  async function handleAiSuggest() {
    if (!lore || suggesting) return
    setSuggesting(true)
    try {
      const suggestion = await suggestSoundtrack(lore, title, city ?? '', country ?? '')
      if (suggestion) {
        setQuery(suggestion)
        await search(suggestion)
      }
    } finally {
      setSuggesting(false)
    }
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="w-full max-w-lg bg-obsidian border-t border-gold/15 rounded-t-2xl max-h-[80dvh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <h3 className="text-sm font-display font-semibold text-ivory">Mission Soundtrack</h3>
          <button type="button" onClick={onClose} className="text-ivory-dim hover:text-ivory transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 space-y-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-dim" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search Spotify..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm font-body text-ivory placeholder:text-ivory-dim/50 focus:outline-none focus:border-gold/30"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Spinner size="sm" />
              </div>
            )}
          </div>
          {lore && (
            <button
              type="button"
              onClick={handleAiSuggest}
              disabled={suggesting}
              className="flex items-center gap-1.5 text-xs font-body text-gold/70 hover:text-gold transition-colors disabled:opacity-40"
            >
              <Sparkles size={12} />
              {suggesting ? 'Thinking...' : 'AI Suggest from lore'}
            </button>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-1">
          {results.map((track, i) => (
            <button
              key={`${track.spotify_url}-${i}`}
              type="button"
              onClick={() => onSelect(track)}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left"
            >
              {track.album_art ? (
                <img src={track.album_art} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-white/5 flex items-center justify-center shrink-0">
                  <Music size={16} className="text-ivory-dim" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ivory font-body truncate">{track.name}</p>
                <p className="text-xs text-ivory-dim font-body truncate">{track.artist} &middot; {track.album}</p>
              </div>
            </button>
          ))}
          {!searching && results.length === 0 && query.length >= 2 && (
            <p className="text-xs text-ivory-dim/50 font-body text-center py-6">No results found</p>
          )}
          {!searching && results.length === 0 && query.length < 2 && (
            <p className="text-xs text-ivory-dim/40 font-body text-center py-6">Search for a song or use AI Suggest</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

/* ── Main component ── */

export function SoundtrackSection({ entry, isCreator, onEntryUpdate }: SoundtrackSectionProps) {
  const addToast = useUIStore(s => s.addToast)
  const [searchOpen, setSearchOpen] = useState(false)
  const [suggestion, setSuggestion] = useState<SpotifyTrack | null>(null)

  const meta = entry.metadata as Record<string, unknown> | undefined
  const soundtrack = meta?.soundtrack as Soundtrack | undefined

  async function saveSoundtrack(track: SpotifyTrack, source: 'ai' | 'user') {
    const newSoundtrack: Soundtrack = {
      name: track.name,
      artist: track.artist,
      album: track.album || undefined,
      spotify_url: track.spotify_url || undefined,
      album_art: track.album_art || undefined,
      suggested_by: source,
    }
    const newMeta = { ...(meta ?? {}), soundtrack: newSoundtrack }
    try {
      await updateEntry(entry.id, { metadata: newMeta } as Partial<EntryWithParticipants>)
      onEntryUpdate({ ...entry, metadata: newMeta })
      addToast(`Soundtrack set: ${track.name}`, 'success')
    } catch {
      addToast('Failed to save soundtrack.', 'error')
    }
  }

  function handleSearchSelect(track: SpotifyTrack) {
    setSearchOpen(false)
    saveSoundtrack(track, 'user')
  }

  function handleAcceptSuggestion() {
    if (!suggestion) return
    saveSoundtrack(suggestion, 'ai')
    setSuggestion(null)
  }

  // Expose suggestion setter for parent (auto-suggest after lore gen)
  // This is done via the exported autoSuggestSoundtrack function below

  return (
    <div className="space-y-2">
      {/* Suggestion banner */}
      <AnimatePresence>
        {suggestion && (
          <SuggestionBanner
            track={suggestion}
            onAccept={handleAcceptSuggestion}
            onDismiss={() => setSuggestion(null)}
          />
        )}
      </AnimatePresence>

      {/* Current soundtrack display */}
      {soundtrack ? (
        <div className="flex items-center gap-3 bg-white/3 border border-white/8 rounded-lg px-3 py-2.5">
          {soundtrack.album_art ? (
            <img src={soundtrack.album_art} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded bg-white/5 flex items-center justify-center shrink-0">
              <Music size={20} className="text-gold/60" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-gold/60 font-body font-semibold tracking-[0.15em] uppercase">Mission Soundtrack</p>
            <p className="text-sm text-ivory font-body font-medium truncate">{soundtrack.name}</p>
            <p className="text-xs text-ivory-dim font-body truncate">{soundtrack.artist}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {soundtrack.spotify_url && (
              <a
                href={soundtrack.spotify_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-8 h-8 rounded-full text-[#1DB954] hover:bg-[#1DB954]/10 transition-colors"
                aria-label="Open in Spotify"
              >
                <ExternalLink size={14} />
              </a>
            )}
            {isCreator && (
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className={cn(
                  'text-[10px] font-body text-ivory-dim hover:text-gold transition-colors',
                  'border border-white/10 rounded-full px-2.5 py-1',
                )}
              >
                Change
              </button>
            )}
          </div>
        </div>
      ) : isCreator ? (
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex items-center gap-2.5 w-full px-3 py-3 rounded-lg border border-dashed border-gold/20 text-gold/60 hover:border-gold/40 hover:text-gold/80 transition-colors"
        >
          <Music size={16} />
          <span className="text-xs font-body font-semibold tracking-wide">Set Mission Soundtrack</span>
        </button>
      ) : null}

      {/* Search modal */}
      <AnimatePresence>
        {searchOpen && (
          <SearchModal
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            onSelect={handleSearchSelect}
            lore={entry.lore}
            title={entry.title}
            city={entry.city}
            country={entry.country}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
