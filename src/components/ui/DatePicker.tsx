import { useState, useRef, useEffect, useCallback } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerProps {
  label?: string
  value: string            // YYYY-MM-DD (internal, same as <input type="date">)
  onChange: (value: string) => void
  error?: string
  hint?: string
  required?: boolean
  className?: string
  placeholder?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const DAYS_HEADER = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function toDisplay(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function parseDisplay(display: string): string | null {
  const match = display.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (!match) return null
  const [, d, m, y] = match
  const day = parseInt(d, 10)
  const month = parseInt(m, 10)
  const year = parseInt(y, 10)
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900) return null
  return `${y}-${m}-${d}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/** Monday-based day of week (0=Mon, 6=Sun) */
function startDay(year: number, month: number): number {
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

export function DatePicker({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  className,
  placeholder = 'DD/MM/YYYY',
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(toDisplay(value))
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Calendar state — default to value's month or current month
  const initDate = value ? new Date(value + 'T12:00:00') : new Date()
  const [viewYear, setViewYear] = useState(initDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(initDate.getMonth())

  // Sync display when value changes externally
  useEffect(() => {
    setInputValue(toDisplay(value))
    if (value) {
      const d = new Date(value + 'T12:00:00')
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const prevMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 0) { setViewYear((y) => y - 1); return 11 }
      return m - 1
    })
  }, [])

  const nextMonth = useCallback(() => {
    setViewMonth((m) => {
      if (m === 11) { setViewYear((y) => y + 1); return 0 }
      return m + 1
    })
  }, [])

  function selectDay(day: number) {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    const iso = `${viewYear}-${mm}-${dd}`
    onChange(iso)
    setOpen(false)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/[^\d/]/g, '')

    // Auto-insert slashes at positions 2 and 5
    if (raw.length === 2 && !raw.includes('/')) raw += '/'
    if (raw.length === 5 && raw.indexOf('/', 3) === -1) raw += '/'
    if (raw.length > 10) raw = raw.slice(0, 10)

    setInputValue(raw)

    const iso = parseDisplay(raw)
    if (iso) {
      onChange(iso)
    }
  }

  function handleInputBlur() {
    // If the typed value is invalid, revert to the last valid value
    if (inputValue && !parseDisplay(inputValue)) {
      setInputValue(toDisplay(value))
    }
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      const iso = parseDisplay(inputValue)
      if (iso) onChange(iso)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  // Build calendar grid
  const totalDays = daysInMonth(viewYear, viewMonth)
  const offset = startDay(viewYear, viewMonth)
  const cells: (number | null)[] = []
  for (let i = 0; i < offset; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)

  const selectedDay = value
    ? (() => {
        const d = new Date(value + 'T12:00:00')
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) return d.getDate()
        return null
      })()
    : null

  const today = new Date()
  const todayDay =
    today.getFullYear() === viewYear && today.getMonth() === viewMonth
      ? today.getDate()
      : null

  return (
    <div className="flex flex-col w-full" ref={containerRef}>
      {label && (
        <label className="text-ivory-muted text-xs uppercase tracking-widest mb-1 font-body">
          {label}
        </label>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          inputMode="numeric"
          placeholder={placeholder}
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleInputKeyDown}
          onFocus={() => setOpen(true)}
          required={required}
          className={cn(
            'w-full bg-slate-mid border border-white/10 text-ivory font-body text-sm placeholder:text-ivory-dim',
            'focus:outline-none focus:border-gold/60 focus:ring-2 focus:ring-gold/20',
            'transition-colors duration-200 rounded-[--radius-md] px-3 h-10 pr-10',
            error && 'border-[--color-error]/60',
            !inputValue && 'text-ivory-dim',
            className,
          )}
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setOpen((o) => !o)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-ivory-dim hover:text-gold transition-colors"
          aria-label="Open calendar"
        >
          <CalendarDays size={16} />
        </button>

        {/* Calendar dropdown */}
        {open && (
          <div className="absolute z-50 top-[calc(100%+4px)] left-0 w-[280px] bg-[#1a1a22] border border-white/12 rounded-lg shadow-xl shadow-black/50 p-3 animate-in fade-in slide-in-from-top-1 duration-150">
            {/* Month/year nav */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1 rounded hover:bg-white/10 text-ivory-dim hover:text-ivory transition-colors"
                aria-label="Previous month"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-ivory text-sm font-body font-medium">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1 rounded hover:bg-white/10 text-ivory-dim hover:text-ivory transition-colors"
                aria-label="Next month"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {DAYS_HEADER.map((d) => (
                <div key={d} className="text-center text-[10px] text-ivory-dim font-body uppercase tracking-wider py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0">
              {cells.map((day, i) => (
                <div key={i} className="flex items-center justify-center">
                  {day ? (
                    <button
                      type="button"
                      onClick={() => selectDay(day)}
                      className={cn(
                        'w-8 h-8 rounded-md text-xs font-body transition-all duration-100',
                        day === selectedDay
                          ? 'bg-gold text-[#0a0a0f] font-semibold'
                          : day === todayDay
                            ? 'text-gold border border-gold/30 hover:bg-gold/15'
                            : 'text-ivory-dim hover:bg-white/10 hover:text-ivory',
                      )}
                    >
                      {day}
                    </button>
                  ) : (
                    <div className="w-8 h-8" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-[--color-error] text-xs mt-1 font-body">{error}</p>
      )}
      {hint && !error && (
        <p className="text-ivory-dim text-xs mt-1 font-body">{hint}</p>
      )}
    </div>
  )
}
