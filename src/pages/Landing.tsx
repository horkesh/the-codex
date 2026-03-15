import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, ArrowLeft } from 'lucide-react'
import { signIn, verifyCode } from '@/hooks/useAuth'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui'
import { Input } from '@/components/ui'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'

type FormState = 'idle' | 'loading' | 'verify' | 'verifying' | 'error'

export default function Landing() {
  const navigate = useNavigate()
  const gent = useAuthStore((s) => s.gent)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (gent) navigate('/home', { replace: true })
  }, [gent, navigate])

  // Focus code input when verify step appears
  useEffect(() => {
    if (formState === 'verify') {
      setTimeout(() => codeRef.current?.focus(), 100)
    }
  }, [formState])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || formState === 'loading') return
    setFormState('loading')
    setErrorMsg('')
    try {
      await signIn(email.trim().toLowerCase())
      setFormState('verify')
      setCode('')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong. Try again.')
      setFormState('error')
    }
  }

  const handleCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.replace(/\s/g, '')
    if (trimmed.length !== 6 || formState === 'verifying') return
    setFormState('verifying')
    setErrorMsg('')
    try {
      await verifyCode(email.trim().toLowerCase(), trimmed)
      // onAuthStateChange fires → navigate happens via the useEffect above
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Invalid or expired code.')
      setFormState('verify')
    }
  }

  // Auto-submit when 6 digits entered
  const handleCodeChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    if (digits.length === 6 && formState === 'verify') {
      setFormState('verifying')
      setErrorMsg('')
      verifyCode(email.trim().toLowerCase(), digits).catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : 'Invalid or expired code.')
        setFormState('verify')
      })
    }
  }

  const handleBack = () => {
    setFormState('idle')
    setErrorMsg('')
    setCode('')
  }

  return (
    <div className="relative min-h-dvh bg-obsidian flex flex-col items-center justify-center px-6 overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(201,168,76,0.07) 0%, transparent 65%)',
        }}
        aria-hidden
      />

      <motion.div
        className="relative z-10 w-full max-w-sm flex flex-col items-center"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Logo emblem */}
        <motion.div variants={staggerItem} className="mb-7 relative flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: '0 0 60px rgba(201,168,76,0.22), 0 0 120px rgba(201,168,76,0.08)' }}
            aria-hidden
          />
          <img
            src="/logo.png"
            alt="The Gents Chronicles"
            className="w-28 h-28 rounded-full border border-gold/30"
            style={{ boxShadow: '0 0 0 1px rgba(201,168,76,0.08)' }}
          />
        </motion.div>

        {/* Brand name */}
        <motion.h1
          variants={staggerItem}
          className="font-display text-[2.2rem] text-ivory tracking-tight text-center leading-none"
        >
          The Codex
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={staggerItem} className="mt-2.5 text-[10px] tracking-[0.35em] uppercase text-gold/80 font-body">
          The Gents Chronicles
        </motion.p>

        {/* Ornamental divider */}
        <motion.div variants={staggerItem} className="mt-8 w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div className="flex gap-1.5 items-center">
            <div className="w-1 h-1 rounded-full bg-gold/50" />
            <div className="w-1.5 h-1.5 rounded-full border border-gold/40" />
            <div className="w-1 h-1 rounded-full bg-gold/50" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </motion.div>

        {/* Form area */}
        <motion.div variants={staggerItem} className="mt-9 w-full">
          <AnimatePresence mode="wait">

            {/* Step 1 — Email */}
            {(formState === 'idle' || formState === 'loading' || formState === 'error') && (
              <motion.form
                key="email"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                onSubmit={handleEmailSubmit}
                className="flex flex-col gap-5 w-full"
              >
                <p className="text-ivory-muted/80 text-sm text-center font-body leading-relaxed">
                  Enter your email to receive a sign-in code.
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
                  {formState === 'loading' ? 'Sending…' : 'Send Code'}
                </Button>
              </motion.form>
            )}

            {/* Step 2 — Code entry */}
            {(formState === 'verify' || formState === 'verifying') && (
              <motion.div
                key="verify"
                variants={fadeUp}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col items-center gap-5 w-full"
              >
                {/* Mail icon */}
                <div
                  className="flex items-center justify-center w-14 h-14 rounded-full border border-gold/30 bg-gold/5"
                  style={{ boxShadow: '0 0 20px rgba(201,168,76,0.12)' }}
                >
                  <Mail className="w-6 h-6 text-gold" strokeWidth={1.5} />
                </div>

                <div className="text-center space-y-1">
                  <p className="text-ivory text-sm font-body font-medium">Check your email</p>
                  <p className="text-ivory-muted text-xs font-body leading-relaxed">
                    We sent a 6-digit code to<br />
                    <span className="text-gold">{email}</span>
                  </p>
                </div>

                {/* Code input */}
                <form onSubmit={handleCodeSubmit} className="w-full flex flex-col gap-3">
                  <input
                    ref={codeRef}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    disabled={formState === 'verifying'}
                    className="w-full text-center text-3xl tracking-[0.35em] font-mono text-ivory bg-slate-dark border border-white/10 rounded-xl px-4 py-4 outline-none focus:border-gold/50 transition-colors placeholder:text-ivory-dim/30 disabled:opacity-50"
                  />

                  {errorMsg && (
                    <p className="text-xs text-center font-body text-[--color-error]">
                      {errorMsg}
                    </p>
                  )}

                  <Button
                    type="submit"
                    variant="primary"
                    disabled={code.replace(/\D/g, '').length !== 6 || formState === 'verifying'}
                    loading={formState === 'verifying'}
                    className="w-full"
                  >
                    {formState === 'verifying' ? 'Verifying…' : 'Enter'}
                  </Button>
                </form>

                {/* Back link */}
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-ivory-dim hover:text-ivory-muted transition-colors font-body"
                >
                  <ArrowLeft size={12} />
                  Use a different address
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>

        {/* Bottom ornamental line */}
        <motion.div variants={staggerItem} className="mt-10 w-full">
          <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
        </motion.div>

        {/* Tagline */}
        <motion.p variants={staggerItem} className="mt-7 text-ivory-dim/60 text-xs italic text-center font-display leading-relaxed">
          "Private. Deliberate. Legendary."
        </motion.p>
      </motion.div>
    </div>
  )
}
