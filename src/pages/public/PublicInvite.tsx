import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { PizzaSvg, TOPPING_REGISTRY } from '@/lib/pizzaSvg'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'

interface Entry {
  id: string
  title: string
  date: string
  location: string | null
  description: string | null
  metadata: Record<string, unknown>
}

type RsvpResponse = 'attending' | 'maybe' | 'not_attending'

/* ── animation helpers ── */
function fadeUp(delay: number) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, delay, ease: 'easeOut' as const },
  }
}

function fadeIn(delay: number) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5, delay, ease: 'easeOut' as const },
  }
}

/* ── countdown digit with scale pulse ── */
function CountdownDigit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className="w-14 h-14 flex items-center justify-center rounded-lg border"
        style={{
          background: 'rgba(255,255,255,0.05)',
          borderColor: 'rgba(212,132,58,0.3)',
          boxShadow: '0 0 12px rgba(212,132,58,0.08)',
        }}
      >
        <AnimatePresence mode="popLayout">
          <motion.span
            key={value}
            initial={{ scale: 1.15, opacity: 0.6 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="text-2xl font-semibold tabular-nums"
            style={{ color: '#F0EDE8', fontFamily: 'var(--font-display)' }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
      </div>
      <span
        className="text-[9px] uppercase tracking-widest"
        style={{ color: 'rgba(140,134,128,0.7)', fontFamily: 'var(--font-body)' }}
      >
        {label}
      </span>
    </div>
  )
}

/* ── flip pizza card ── */
function FlipPizzaCard({
  pizza,
  index,
  flipped,
  onFlip,
}: {
  pizza: { name: string; toppings: string[] }
  index: number
  flipped: boolean
  onFlip: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30, rotate: -3 }}
      animate={{ opacity: 1, x: 0, rotate: 0 }}
      transition={{ duration: 0.5, delay: 0.9 + index * 0.1, ease: 'easeOut' }}
    >
      <div
        onClick={onFlip}
        style={{ perspective: '800px', cursor: 'pointer' }}
      >
        <motion.div
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          style={{ transformStyle: 'preserve-3d', position: 'relative' }}
          className="rounded-xl"
        >
          {/* Front face */}
          <div
            className="rounded-xl p-4 flex flex-col items-center justify-center"
            style={{
              backfaceVisibility: 'hidden',
              background: 'rgba(255,255,255,0.04)',
              minHeight: 80,
              display: flipped ? 'none' : 'flex',
            }}
          >
            <p
              className="text-base text-center"
              style={{ color: '#F0EDE8', fontFamily: 'var(--font-display)' }}
            >
              {pizza.name}
            </p>
            <p
              className="text-[10px] mt-1.5"
              style={{ color: 'rgba(140,134,128,0.4)', fontFamily: 'var(--font-body)' }}
            >
              Tap to reveal
            </p>
          </div>

          {/* Back face */}
          <div
            className="rounded-xl p-3 flex items-center gap-3"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'rgba(255,255,255,0.04)',
              minHeight: 80,
              display: flipped ? 'flex' : 'none',
            }}
          >
            <PizzaSvg toppings={pizza.toppings} size={64} seed={pizza.name || `p-${index}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: '#F0EDE8', fontFamily: 'var(--font-display)' }}>
                {pizza.name}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {pizza.toppings.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] px-1.5 py-0.5 rounded-full"
                    style={{
                      background: 'rgba(212,132,58,0.12)',
                      color: '#D4843A',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {TOPPING_REGISTRY[t]?.label ?? t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

/* ── main component ── */
export default function PublicInvite() {
  const { slug } = useParams<{ slug: string }>()

  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [response, setResponse] = useState<RsvpResponse | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [flipped, setFlipped] = useState<Set<number>>(new Set())

  const metadata = (entry?.metadata ?? {}) as Record<string, unknown>
  const eventDate = metadata.event_date as string | undefined
  const metaLocation = metadata.location as string | undefined

  const isPizzaParty = metadata?.flavour === 'pizza_party'
  const pizzaMenu = isPizzaParty
    ? ((metadata?.pizza_menu as Array<{ name: string; toppings: string[] }>) ?? [])
    : []
  const lat = metadata?.lat as number | undefined
  const lng = metadata?.lng as number | undefined
  const venue = metadata?.venue as string | undefined
  const address = metadata?.address as string | undefined
  const hostMessage = metadata?.host_message as string | undefined

  /* ── live countdown ── */
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 })

  useEffect(() => {
    if (!eventDate) return
    const target = new Date(eventDate + 'T00:00:00').getTime()
    let intervalId: ReturnType<typeof setInterval>
    function tick() {
      const diff = Math.max(0, target - Date.now())
      if (diff === 0 && intervalId) clearInterval(intervalId)
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      })
    }
    tick()
    intervalId = setInterval(tick, 1000)
    return () => clearInterval(intervalId)
  }, [eventDate])

  const countdownActive =
    eventDate != null &&
    timeLeft.d + timeLeft.h + timeLeft.m + timeLeft.s > 0

  /* ── data fetch ── */
  useEffect(() => {
    if (!slug) return

    async function fetchEntry() {
      try {
        const { data, error } = await supabase
          .from('entries')
          .select('*')
          .eq('id', slug!)
          .single()

        if (error || !data) {
          setNotFound(true)
        } else {
          setEntry(data as Entry)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchEntry()
  }, [slug])

  /* ── RSVP handler ── */
  async function handleRsvp(e: React.FormEvent) {
    e.preventDefault()
    if (!response || submitting) return

    setSubmitting(true)
    setSubmitError(null)

    try {
      const { error } = await supabase.functions.invoke('submit-rsvp', {
        body: { entry_id: slug, name, email, response },
      })

      if (error) {
        setSubmitError('Something went wrong. Please try again.')
      } else {
        setSubmitted(true)
      }
    } catch {
      setSubmitError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleFlip(i: number) {
    setFlipped((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  const inputClass =
    'w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-[#F0EDE8] placeholder-[#8C8680] text-sm focus:outline-none focus:border-[#C9A84C]/60 transition-colors'

  /* pizza menu card delay end — used to offset map and rsvp */
  const menuEndDelay = isPizzaParty && pizzaMenu.length > 0
    ? 0.9 + pizzaMenu.length * 0.1 + 0.2
    : 0.9
  const mapDelay = menuEndDelay
  const rsvpDelay = mapDelay + 0.15

  return (
    <div
      className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-start px-4 py-12"
      style={
        isPizzaParty
          ? { background: 'linear-gradient(180deg, #0D0D0D 0%, #1a1510 60%, #0D0D0D 100%)' }
          : undefined
      }
    >
      {/* Wordmark */}
      <div
        className="text-xs tracking-[0.3em] uppercase mb-10"
        style={{ color: '#C9A84C', fontFamily: 'var(--font-body)' }}
      >
        The Gents Chronicles
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center mt-20">
          <div className="w-6 h-6 rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C] animate-spin" />
        </div>
      )}

      {/* Not found */}
      {!loading && notFound && (
        <div className="text-center mt-20">
          <p className="text-[#8C8680] text-sm">This invitation could not be found.</p>
        </div>
      )}

      {/* Invite card */}
      {!loading && entry && (
        <div className="w-full max-w-sm">
          {/* Gold decorative rule */}
          <motion.div {...fadeIn(0.3)} className="h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
            className="text-3xl text-[#F0EDE8] text-center mt-6"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            {entry.title}
          </motion.h1>

          {/* Date + Location */}
          <motion.p {...fadeUp(0.6)} className="text-center text-[#8C8680] text-sm mt-2">
            {eventDate ? formatDate(eventDate) : formatDate(entry.date)}
            {metaLocation ? ` · ${metaLocation}` : entry.location ? ` · ${entry.location}` : ''}
          </motion.p>

          {/* Live countdown */}
          {countdownActive && (
            <motion.div {...fadeIn(0.7)} className="flex justify-center gap-3 mt-4">
              <CountdownDigit value={timeLeft.d} label="days" />
              <CountdownDigit value={timeLeft.h} label="hrs" />
              <CountdownDigit value={timeLeft.m} label="min" />
              <CountdownDigit value={timeLeft.s} label="sec" />
            </motion.div>
          )}

          {/* Description */}
          {entry.description && (
            <motion.p {...fadeUp(0.8)} className="text-[#8C8680] text-sm text-center mt-4 leading-relaxed">
              {entry.description}
            </motion.p>
          )}

          {/* Host message */}
          {hostMessage && (
            <motion.div {...fadeUp(0.85)} className="mt-5 w-full">
              <div
                className="rounded-r-lg px-4 py-3"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  borderLeft: '2px solid rgba(212,132,58,0.5)',
                }}
              >
                <p
                  className="text-sm italic leading-relaxed"
                  style={{ color: '#C8C0B0', fontFamily: 'var(--font-display)' }}
                >
                  &ldquo;{hostMessage}&rdquo;
                </p>
                <p
                  className="text-[10px] mt-2"
                  style={{ color: '#D4843A', fontFamily: 'var(--font-body)' }}
                >
                  — The Host
                </p>
              </div>
            </motion.div>
          )}

          {/* Pizza menu — flip cards */}
          {isPizzaParty && pizzaMenu.length > 0 && (
            <div className="flex flex-col gap-3 mt-6 w-full">
              <motion.h3
                {...fadeIn(0.85)}
                className="text-xs uppercase tracking-widest text-center"
                style={{ color: '#D4843A', fontFamily: 'var(--font-body)', letterSpacing: '0.3em' }}
              >
                The Menu
              </motion.h3>
              {pizzaMenu.map((pizza, i) => (
                <FlipPizzaCard
                  key={i}
                  pizza={pizza}
                  index={i}
                  flipped={flipped.has(i)}
                  onFlip={() => toggleFlip(i)}
                />
              ))}
            </div>
          )}

          {/* Map */}
          {lat && lng && (
            <motion.a
              {...fadeIn(mapDelay)}
              href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-lg overflow-hidden mt-4 w-full"
            >
              <img
                src={buildStaticMapUrl(lat, lng, { width: 400, height: 160 })}
                alt="Map"
                className="w-full h-28 object-cover"
              />
            </motion.a>
          )}
          {venue && (
            <motion.p
              {...fadeIn(mapDelay + 0.05)}
              className="text-xs text-center mt-1"
              style={{ color: 'rgba(140,134,128,0.6)', fontFamily: 'var(--font-body)' }}
            >
              {venue}{address ? ` \u00b7 ${address}` : ''}
            </motion.p>
          )}

          {/* RSVP Form */}
          {!submitted ? (
            <motion.form
              {...fadeUp(rsvpDelay)}
              onSubmit={handleRsvp}
              className="mt-8 flex flex-col gap-3"
            >
              <input
                name="name"
                placeholder="Your name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
              {!isPizzaParty && (
                <input
                  name="email"
                  placeholder="Email (optional)"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              )}

              {/* Response selector */}
              <div className="flex gap-2">
                {(['attending', 'maybe', 'not_attending'] as const).map((r) => {
                  const isSelected = response === r
                  const label =
                    r === 'attending'
                      ? 'Attending'
                      : r === 'maybe'
                        ? 'Maybe'
                        : "Can't make it"
                  return (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setResponse(r)}
                      className="flex-1 py-2.5 px-2 rounded-lg border text-xs font-medium transition-all duration-200"
                      style={{
                        borderColor: isSelected ? '#C9A84C' : 'rgba(255,255,255,0.12)',
                        color: isSelected ? '#C9A84C' : '#8C8680',
                        backgroundColor: isSelected ? 'rgba(201,168,76,0.06)' : 'transparent',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {submitError && (
                <p className="text-xs text-red-400 text-center">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !response}
                className="mt-1 w-full py-3 rounded-lg text-sm font-medium transition-all duration-200"
                style={{
                  backgroundColor: submitting || !response ? 'rgba(201,168,76,0.3)' : '#C9A84C',
                  color: submitting || !response ? '#8C8680' : '#0D0D0D',
                  cursor: submitting || !response ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Sending...' : 'Send RSVP'}
              </button>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="mt-8"
            >
              <div
                className="rounded-xl px-5 py-6 flex flex-col items-center gap-4"
                style={{
                  background: response === 'not_attending'
                    ? 'rgba(255,255,255,0.03)'
                    : 'rgba(255,255,255,0.05)',
                  border: response === 'not_attending'
                    ? '1px solid rgba(255,255,255,0.08)'
                    : '1px solid rgba(201,168,76,0.2)',
                }}
              >
                {/* Header */}
                <p
                  className="text-[10px] uppercase tracking-[0.3em]"
                  style={{
                    color: response === 'not_attending' ? '#8C8680' : '#C9A84C',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  — The Gents Chronicles —
                </p>

                {/* Pizza icon for pizza party */}
                {isPizzaParty && pizzaMenu.length > 0 && response !== 'not_attending' && (
                  <PizzaSvg toppings={pizzaMenu[0].toppings} size={56} seed={pizzaMenu[0].name || 'p-0'} />
                )}

                {/* Status line */}
                <p
                  className="text-lg text-center"
                  style={{
                    color: response === 'not_attending' ? '#8C8680' : '#F0EDE8',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 500,
                  }}
                >
                  {name}{' '}
                  {response === 'attending'
                    ? 'is attending'
                    : response === 'maybe'
                      ? 'might be there'
                      : 'sends regrets'}
                </p>

                {/* Event info */}
                <div className="flex flex-col items-center gap-1">
                  <p
                    className="text-sm text-center"
                    style={{ color: '#F0EDE8', fontFamily: 'var(--font-display)' }}
                  >
                    {entry.title}
                  </p>
                  <p
                    className="text-xs text-center"
                    style={{ color: '#8C8680', fontFamily: 'var(--font-body)' }}
                  >
                    {eventDate ? formatDate(eventDate) : formatDate(entry.date)}
                    {(venue || metaLocation || entry.location) && ` · ${venue || metaLocation || entry.location}`}
                  </p>
                </div>

                {/* Gold rule */}
                <div
                  className="w-16 h-px"
                  style={{
                    background: response === 'not_attending'
                      ? 'rgba(140,134,128,0.3)'
                      : 'rgba(201,168,76,0.4)',
                  }}
                />

                {/* Tagline */}
                <p
                  className="text-sm italic"
                  style={{
                    color: response === 'not_attending' ? '#8C8680' : '#C9A84C',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {response === 'attending'
                    ? 'See you there.'
                    : response === 'maybe'
                      ? 'We will keep a spot.'
                      : 'You will be missed.'}
                </p>
              </div>

              {/* Screenshot hint */}
              <p
                className="text-[10px] text-center mt-3"
                style={{ color: 'rgba(140,134,128,0.4)', fontFamily: 'var(--font-body)' }}
              >
                Screenshot to share
              </p>
            </motion.div>
          )}

          {/* Link to guest book */}
          <motion.p {...fadeIn(rsvpDelay + 0.1)} className="text-center text-xs text-[#8C8680] mt-6">
            <a
              href={`/g/${slug}/guestbook`}
              className="hover:text-[#C9A84C] transition-colors"
            >
              Sign the guest book →
            </a>
          </motion.p>

          {/* Bottom gold rule */}
          <motion.div
            {...fadeIn(rsvpDelay + 0.15)}
            className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/30 to-transparent mt-8"
          />
        </div>
      )}
    </div>
  )
}
