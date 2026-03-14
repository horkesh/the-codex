import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail } from 'lucide-react'
import { signIn } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'

type FormState = 'idle' | 'loading' | 'sent' | 'error'

export default function Landing() {
  const navigate = useNavigate()
  const gent = useAuthStore((s) => s.gent)
  const [email, setEmail] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (gent) navigate('/chronicle', { replace: true })
  }, [gent, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || formState === 'loading') return

    setFormState('loading')
    setErrorMsg('')

    try {
      await signIn(email.trim().toLowerCase())
      setFormState('sent')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setFormState('error')
    }
  }

  const handleRetry = () => {
    setFormState('idle')
    setErrorMsg('')
  }

  return (
    <div className="relative min-h-screen bg-obsidian flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Gold radial glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(201,168,76,0.06) 0%, transparent 60%)' }}
        aria-hidden
      />

      <motion.div
        className="relative z-10 w-full max-w-sm flex flex-col items-center"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Top decorative line */}
        <motion.div variants={staggerItem} className="w-px h-12 bg-gold opacity-30 mb-8" />

        {/* Logo */}
        <motion.h1
          variants={staggerItem}
          className="font-display text-4xl text-ivory tracking-tight text-center leading-none"
        >
          The Codex
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={staggerItem} className="mt-3 text-xs tracking-[0.3em] uppercase text-gold font-body">
          The Gents Chronicles
        </motion.p>

        {/* Ornamental divider */}
        <motion.div variants={staggerItem} className="mt-8 w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-30" />
          <div className="flex gap-1 items-center">
            <div className="w-1 h-1 rounded-full bg-gold opacity-50" />
            <div className="w-1.5 h-1.5 rounded-full border border-gold opacity-40" />
            <div className="w-1 h-1 rounded-full bg-gold opacity-50" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-30" />
        </motion.div>

        {/* Form area */}
        <motion.div variants={staggerItem} className="mt-10 w-full">
          <AnimatePresence mode="wait">
            {formState === 'sent' ? (
              <motion.div
                key="sent"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center gap-5 py-4"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-full border border-gold/30 bg-gold/5 shadow-gold">
                  <Mail className="w-6 h-6 text-gold" strokeWidth={1.5} />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-ivory text-sm font-body font-medium">Link sent.</p>
                  <p className="text-ivory-muted text-sm font-body leading-relaxed">
                    Check your inbox — the link expires in 10 minutes.
                  </p>
                </div>
                <button
                  onClick={handleRetry}
                  className="mt-2 text-xs text-ivory-dim underline underline-offset-4 decoration-ivory-dim/30 hover:text-ivory-muted transition-colors font-body"
                >
                  Use a different address
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={handleSubmit}
                className="flex flex-col gap-5 w-full"
              >
                <p className="text-ivory-muted text-sm text-center font-body leading-relaxed">
                  Enter your email to receive a secure link.
                </p>

                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  autoFocus
                  disabled={formState === 'loading'}
                  error={formState === 'error' ? errorMsg : undefined}
                />

                <Button
                  type="submit"
                  variant="primary"
                  disabled={!email.trim() || formState === 'loading'}
                  loading={formState === 'loading'}
                  className="w-full"
                >
                  Send Magic Link
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Bottom ornamental line */}
        <motion.div variants={staggerItem} className="mt-10 w-full">
          <div className="h-px bg-gradient-to-r from-transparent via-gold to-transparent opacity-20" />
        </motion.div>

        {/* Tagline */}
        <motion.p variants={staggerItem} className="mt-8 text-ivory-dim text-xs italic text-center font-body leading-relaxed">
          "Private. Deliberate. Legendary."
        </motion.p>

        {/* Bottom vertical line */}
        <motion.div variants={staggerItem} className="w-px h-12 bg-gold opacity-20 mt-8" />
      </motion.div>
    </div>
  )
}
