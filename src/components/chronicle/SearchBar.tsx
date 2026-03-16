import { useState, useEffect, useRef } from 'react'
import { Search, X } from 'lucide-react'

interface SearchBarProps {
  value: string
  onChange: (query: string) => void
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  const [local, setLocal] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // Sync external resets (e.g. clear from parent)
  useEffect(() => {
    setLocal(value)
  }, [value])

  function handleChange(next: string) {
    setLocal(next)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => onChange(next), 300)
  }

  function handleClear() {
    setLocal('')
    clearTimeout(timerRef.current)
    onChange('')
  }

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(timerRef.current), [])

  return (
    <div className="px-4 pt-2 pb-1">
      <div className="relative flex items-center">
        <Search
          size={16}
          className="absolute left-3 text-ivory-dim pointer-events-none"
          aria-hidden="true"
        />
        <input
          type="text"
          value={local}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search entries..."
          className="w-full pl-9 pr-9 py-2 rounded-lg bg-slate-mid border border-white/10 text-sm font-body text-ivory placeholder:text-ivory-dim/50 focus:outline-none focus:border-gold/40 transition-colors"
        />
        {local && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 text-ivory-dim hover:text-ivory transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
