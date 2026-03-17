import { motion } from 'framer-motion'
import { Link } from 'react-router'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useAuthStore } from '@/store/auth'

export function ShowcaseHero() {
  const gent = useAuthStore(s => s.gent)

  return (
    <section className="relative bg-obsidian flex flex-col items-center px-6 pt-20 pb-16 overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(201,168,76,0.07) 0%, transparent 65%)' }}
        aria-hidden
      />

      <motion.div
        className="relative z-10 flex flex-col items-center max-w-lg"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Logo */}
        <motion.div variants={staggerItem} className="mb-6 relative">
          <div
            className="absolute inset-0 rounded-full"
            style={{ boxShadow: '0 0 60px rgba(201,168,76,0.22), 0 0 120px rgba(201,168,76,0.08)' }}
            aria-hidden
          />
          <img
            src="/logo.png"
            alt="The Gents Chronicles"
            className="w-24 h-24 rounded-full border border-gold/30"
          />
        </motion.div>

        {/* Title */}
        <motion.h1 variants={staggerItem} className="font-display text-4xl text-ivory tracking-tight text-center leading-none">
          The Gents Chronicles
        </motion.h1>

        {/* Tagline */}
        <motion.p variants={staggerItem} className="mt-3 text-[11px] tracking-[0.3em] uppercase text-gold/70 font-body text-center">
          Three friends. One chronicle.
        </motion.p>

        {/* Divider */}
        <motion.div variants={staggerItem} className="mt-8 w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
          <div className="flex gap-1.5 items-center">
            <div className="w-1 h-1 rounded-full bg-gold/50" />
            <div className="w-1.5 h-1.5 rounded-full border border-gold/40" />
            <div className="w-1 h-1 rounded-full bg-gold/50" />
          </div>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent" />
        </motion.div>

        {/* Lounge pill */}
        <motion.div variants={staggerItem} className="mt-8">
          <Link
            to={gent ? '/home' : '/login'}
            className="px-5 py-2 rounded-full bg-gold text-obsidian text-xs font-body font-semibold tracking-widest uppercase hover:bg-gold-light transition-all"
          >
            The Gents Lounge
          </Link>
        </motion.div>
      </motion.div>
    </section>
  )
}
