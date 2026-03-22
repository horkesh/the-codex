import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { formatDate, daysUntil } from '@/lib/utils'
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

  const metadata = (entry?.metadata ?? {}) as Record<string, unknown>
  const eventDate = metadata.event_date as string | undefined
  const metaLocation = metadata.location as string | undefined
  const countdown = eventDate ? daysUntil(eventDate) : null

  const isPizzaParty = metadata?.flavour === 'pizza_party'
  const pizzaMenu = isPizzaParty ? (metadata?.pizza_menu as Array<{ name: string; toppings: string[] }>) ?? [] : []
  const lat = metadata?.lat as number | undefined
  const lng = metadata?.lng as number | undefined
  const venue = metadata?.venue as string | undefined
  const address = metadata?.address as string | undefined

  const inputClass =
    'w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-[#F0EDE8] placeholder-[#8C8680] text-sm focus:outline-none focus:border-[#C9A84C]/60 transition-colors'

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex flex-col items-center justify-start px-4 py-12"
      style={isPizzaParty ? { background: 'linear-gradient(180deg, #0D0D0D 0%, #1a1510 60%, #0D0D0D 100%)' } : undefined}>
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
        <motion.div
          className="w-full max-w-sm"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Gold decorative rule */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />

          {/* Title */}
          <h1
            className="text-3xl text-[#F0EDE8] text-center mt-6"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            {entry.title}
          </h1>

          {/* Date + Location */}
          <p className="text-center text-[#8C8680] text-sm mt-2">
            {eventDate ? formatDate(eventDate) : formatDate(entry.date)}
            {metaLocation ? ` · ${metaLocation}` : entry.location ? ` · ${entry.location}` : ''}
          </p>

          {/* Countdown */}
          {countdown !== null && countdown > 0 && (
            <div className="text-center text-[#C9A84C] text-sm mt-1">
              In {countdown} {countdown === 1 ? 'day' : 'days'}
            </div>
          )}

          {/* Description */}
          {entry.description && (
            <p className="text-[#8C8680] text-sm text-center mt-4 leading-relaxed">
              {entry.description}
            </p>
          )}

          {/* Pizza menu */}
          {isPizzaParty && pizzaMenu.length > 0 && (
            <div className="flex flex-col gap-3 mt-6 w-full">
              <h3 className="text-xs uppercase tracking-widest text-center" style={{ color: '#D4843A', fontFamily: 'var(--font-body)', letterSpacing: '0.3em' }}>The Menu</h3>
              {pizzaMenu.map((pizza, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <PizzaSvg toppings={pizza.toppings} size={48} seed={pizza.name || `p-${i}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: '#F0EDE8', fontFamily: 'var(--font-display)' }}>{pizza.name}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: 'rgba(140,134,128,0.6)', fontFamily: 'var(--font-body)' }}>
                      {pizza.toppings.map(t => TOPPING_REGISTRY[t]?.label ?? t).join(' \u00b7 ')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Map */}
          {lat && lng && (
            <a href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
               target="_blank" rel="noopener noreferrer"
               className="block rounded-lg overflow-hidden mt-4 w-full">
              <img src={buildStaticMapUrl(lat, lng, { width: 400, height: 160 })}
                   alt="Map" className="w-full h-28 object-cover" />
            </a>
          )}
          {venue && (
            <p className="text-xs text-center mt-1" style={{ color: 'rgba(140,134,128,0.6)', fontFamily: 'var(--font-body)' }}>
              {venue}{address ? ` \u00b7 ${address}` : ''}
            </p>
          )}

          {/* RSVP Form */}
          {!submitted ? (
            <form onSubmit={handleRsvp} className="mt-8 flex flex-col gap-3">
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
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="mt-8"
            >
              <p className="text-[#C9A84C] text-center text-base">
                See you there.
              </p>
            </motion.div>
          )}

          {/* Link to guest book */}
          <p className="text-center text-xs text-[#8C8680] mt-6">
            <a
              href={`/g/${slug}/guestbook`}
              className="hover:text-[#C9A84C] transition-colors"
            >
              Sign the guest book →
            </a>
          </p>

          {/* Bottom gold rule */}
          <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/30 to-transparent mt-8" />
        </motion.div>
      )}
    </div>
  )
}
