import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'
import { fetchPeopleQuick } from '@/data/people'

interface ContactTaggerProps {
  selectedIds: string[]
  onChange: (ids: string[]) => void
}

interface QuickPerson {
  id: string
  name: string
  photo_url: string | null
}

export function ContactTagger({ selectedIds, onChange }: ContactTaggerProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<QuickPerson[]>([])
  const [selected, setSelected] = useState<QuickPerson[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()
  const containerRef = useRef<HTMLDivElement>(null)

  // Search people as user types
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      return
    }
    debounceRef.current = setTimeout(() => {
      fetchPeopleQuick(query.trim())
        .then(setResults)
        .catch(() => setResults([]))
    }, 250)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Load initial list when opening (no query)
  useEffect(() => {
    if (open && !query.trim()) {
      fetchPeopleQuick()
        .then(setResults)
        .catch(() => setResults([]))
    }
  }, [open, query])

  function addPerson(person: QuickPerson) {
    if (selectedIds.includes(person.id)) return
    const next = [...selected, person]
    setSelected(next)
    onChange([...selectedIds, person.id])
    setQuery('')
    setResults([])
  }

  function removePerson(personId: string) {
    setSelected((prev) => prev.filter((p) => p.id !== personId))
    onChange(selectedIds.filter((id) => id !== personId))
  }

  const filteredResults = results.filter((r) => !selectedIds.includes(r.id))

  return (
    <div ref={containerRef} className="flex flex-col gap-2">
      <p className="text-[11px] font-body tracking-widest uppercase text-gold-muted">
        Tag people present
      </p>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((person) => (
            <span
              key={person.id}
              className="inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-xs text-ivory font-body"
            >
              {person.photo_url ? (
                <img
                  src={person.photo_url}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover"
                />
              ) : (
                <span className="w-5 h-5 rounded-full bg-gold/20 flex items-center justify-center text-[9px] text-gold font-semibold">
                  {person.name.charAt(0).toUpperCase()}
                </span>
              )}
              {person.name}
              <button
                type="button"
                onClick={() => removePerson(person.id)}
                className="ml-0.5 text-ivory-dim hover:text-ivory transition-colors"
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-mid border border-white/10 focus-within:border-gold/30 transition-colors">
          <Search size={13} className="text-ivory-dim shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              if (!open) setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder="Search contacts..."
            className="flex-1 bg-transparent text-sm text-ivory font-body placeholder:text-ivory-dim/50 outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResults([]) }}
              className="text-ivory-dim hover:text-ivory transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dropdown results */}
        {open && filteredResults.length > 0 && (
          <div className="absolute z-20 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto rounded-lg bg-slate-dark border border-white/10 shadow-lg">
            {filteredResults.map((person) => (
              <button
                key={person.id}
                type="button"
                onClick={() => {
                  addPerson(person)
                  setOpen(false)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-white/5 transition-colors"
              >
                {person.photo_url ? (
                  <img
                    src={person.photo_url}
                    alt=""
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <span className="w-6 h-6 rounded-full bg-gold/20 flex items-center justify-center text-[10px] text-gold font-semibold">
                    {person.name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="text-sm text-ivory font-body">{person.name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
