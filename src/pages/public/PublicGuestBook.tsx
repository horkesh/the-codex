import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

interface Entry {
  id: string
  title: string
  date: string
  location: string | null
  description: string | null
  metadata: Record<string, unknown>
}

interface GuestBookMessage {
  id: string
  entry_id: string
  guest_name: string
  cocktail_chosen: string | null
  message: string | null
  created_at: string
}

export default function PublicGuestBook() {
  const { slug } = useParams<{ slug: string }>()

  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [messages, setMessages] = useState<GuestBookMessage[]>([])

  const [guestName, setGuestName] = useState('')
  const [cocktail, setCocktail] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    async function fetchData() {
      try {
        const [entryResult, messagesResult] = await Promise.all([
          supabase.from('entries').select('*').eq('id', slug!).single(),
          supabase
            .from('guest_book_messages')
            .select('*')
            .eq('entry_id', slug!)
            .order('created_at', { ascending: false }),
        ])

        if (entryResult.data) {
          setEntry(entryResult.data as Entry)
        }
        if (messagesResult.data) {
          setMessages(messagesResult.data as GuestBookMessage[])
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting || !guestName.trim()) return

    setSubmitting(true)
    setSubmitError(null)

    const { data, error } = await supabase.functions.invoke('submit-guestbook', {
      body: {
        entry_id: slug,
        guest_name: guestName,
        cocktail_chosen: cocktail,
        message,
      },
    })

    if (error) {
      setSubmitError('Something went wrong. Please try again.')
      setSubmitting(false)
    } else {
      // Optimistically prepend the new message
      const optimisticMsg: GuestBookMessage = {
        id: (data as { id?: string })?.id ?? crypto.randomUUID(),
        entry_id: slug ?? '',
        guest_name: guestName,
        cocktail_chosen: cocktail,
        message: message || null,
        created_at: new Date().toISOString(),
      }
      setMessages((prev) => [optimisticMsg, ...prev])
      setSubmitted(true)
      setSubmitting(false)
    }
  }

  const cocktailMenu =
    (entry?.metadata?.cocktail_menu as string[] | undefined) ?? []

  const inputClass =
    'w-full bg-[#1A1A1A] border border-white/10 rounded-lg px-4 py-3 text-[#F0EDE8] placeholder-[#8C8680] text-sm focus:outline-none focus:border-[#C9A84C]/60 transition-colors'

  return (
    <div className="min-h-screen bg-[#0D0D0D]">
      {/* Header */}
      <div className="text-center pt-12 pb-6 px-4">
        <div
          className="text-xs tracking-widest uppercase mb-2"
          style={{ color: '#C9A84C', fontFamily: 'var(--font-body)' }}
        >
          Guest Book
        </div>
        {loading ? (
          <div className="flex items-center justify-center mt-4">
            <div className="w-5 h-5 rounded-full border-2 border-[#C9A84C]/30 border-t-[#C9A84C] animate-spin" />
          </div>
        ) : (
          <h1
            className="text-3xl text-[#F0EDE8]"
            style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
          >
            {entry?.title ?? 'The Gathering'}
          </h1>
        )}
      </div>

      {/* Body */}
      <div className="max-w-sm mx-auto px-4 pb-12">
        {/* Gold top rule */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/40 to-transparent mb-8" />

        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.form
              key="form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <input
                name="guest_name"
                placeholder="Your name"
                required
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className={inputClass}
              />

              {/* Cocktail selector */}
              {cocktailMenu.length > 0 && (
                <div>
                  <p className="text-xs text-[#8C8680] mb-2">
                    What are you drinking?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cocktailMenu.map((c) => {
                      const isSelected = cocktail === c
                      return (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setCocktail(isSelected ? null : c)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200"
                          style={{
                            backgroundColor: isSelected
                              ? '#C9A84C'
                              : 'transparent',
                            color: isSelected ? '#0D0D0D' : '#8C8680',
                            border: isSelected
                              ? '1px solid #C9A84C'
                              : '1px solid rgba(255,255,255,0.12)',
                          }}
                        >
                          {c}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <textarea
                name="message"
                placeholder="Leave a message..."
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className={`${inputClass} resize-none`}
              />

              {submitError && (
                <p className="text-xs text-red-400 text-center">{submitError}</p>
              )}

              <button
                type="submit"
                disabled={submitting || !guestName.trim()}
                className="w-full py-3 rounded-lg text-sm font-medium transition-all duration-200 mt-1"
                style={{
                  backgroundColor:
                    submitting || !guestName.trim()
                      ? 'rgba(201,168,76,0.3)'
                      : '#C9A84C',
                  color:
                    submitting || !guestName.trim() ? '#8C8680' : '#0D0D0D',
                  cursor:
                    submitting || !guestName.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {submitting ? 'Signing...' : 'Sign the Book'}
              </button>
            </motion.form>
          ) : (
            <motion.div
              key="success"
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              style={{ perspective: 800 }}
            >
              <div className="text-center py-12">
                <div className="text-4xl mb-4">🥂</div>
                <h2
                  className="text-2xl text-[#F0EDE8]"
                  style={{ fontFamily: 'var(--font-display)', fontWeight: 600 }}
                >
                  Signed!
                </h2>
                <p className="text-[#8C8680] text-sm mt-2">
                  Your words are in the book.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Existing messages */}
        {messages.length > 0 && (
          <div className="mt-8 space-y-4">
            <p
              className="text-xs tracking-widest uppercase"
              style={{ color: '#C9A84C' }}
            >
              From the guests
            </p>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                className="border border-white/10 rounded-lg p-3"
                style={{ backgroundColor: '#1A1A1A' }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-[#F0EDE8] font-medium">
                    {msg.guest_name}
                  </span>
                  {msg.cocktail_chosen && (
                    <span className="text-xs text-[#C9A84C]">
                      {msg.cocktail_chosen}
                    </span>
                  )}
                </div>
                {msg.message && (
                  <p className="text-xs text-[#8C8680] leading-relaxed">
                    {msg.message}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Bottom gold rule */}
        <div className="h-px bg-gradient-to-r from-transparent via-[#C9A84C]/20 to-transparent mt-10" />
      </div>
    </div>
  )
}
