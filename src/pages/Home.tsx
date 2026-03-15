import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { BarChart2, Layers } from 'lucide-react'
import { TopBar, PageWrapper } from '@/components/layout'
import { useAuthStore } from '@/store/auth'
import { staggerContainer, staggerItem } from '@/lib/animations'

const SECTIONS = [
  {
    id: 'chronicle',
    title: 'Chronicle',
    subtitle: 'The complete record',
    path: '/chronicle',
    image: '/empty-states/chronicle.webp',
  },
  {
    id: 'passport',
    title: 'Passport',
    subtitle: 'Stamps & achievements',
    path: '/passport',
    image: '/empty-states/passport.webp',
  },
  {
    id: 'circle',
    title: 'The Circle',
    subtitle: 'People & connections',
    path: '/circle',
    image: '/empty-states/circle.webp',
  },
  {
    id: 'ledger',
    title: 'Ledger',
    subtitle: 'Stats & intelligence',
    path: '/ledger',
    icon: BarChart2,
  },
  {
    id: 'studio',
    title: 'Studio',
    subtitle: 'Export & create',
    path: '/studio',
    icon: Layers,
  },
] as const

export default function Home() {
  const navigate = useNavigate()
  const { gent } = useAuthStore()

  return (
    <>
      <TopBar />
      <PageWrapper padded scrollable>
        {/* Hero */}
        <div className="flex flex-col items-center gap-3 pt-6 pb-8">
          <img
            src="/logo.png"
            alt="The Codex"
            className="w-20 h-20 rounded-full"
            style={{ boxShadow: '0 0 40px rgba(201,168,76,0.25)' }}
          />
          <div className="flex flex-col items-center gap-1">
            <h1 className="font-display text-2xl text-ivory tracking-wide">The Codex</h1>
            {gent && (
              <p className="text-ivory-dim text-xs font-body">
                {gent.full_alias}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-gold/30" />
            <span className="text-gold/60 text-[10px] font-body uppercase tracking-[0.3em]">
              Private. Deliberate. Legendary.
            </span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-gold/30" />
          </div>
        </div>

        {/* Section grid */}
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="grid grid-cols-2 gap-3 pb-4"
        >
          {SECTIONS.map((section) => (
            <motion.button
              key={section.id}
              variants={staggerItem}
              type="button"
              onClick={() => navigate(section.path)}
              className="relative rounded-xl overflow-hidden border border-white/8 bg-slate-mid text-left group"
              style={{ aspectRatio: '3/4', maxHeight: '220px' }}
            >
              {'image' in section ? (
                <img
                  src={section.image}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-75 transition-opacity duration-300"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-15 transition-opacity">
                  <section.icon size={64} className="text-gold" strokeWidth={0.75} />
                </div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/30 to-transparent" />

              {/* Label */}
              <div className="absolute bottom-0 left-0 right-0 p-3">
                <p className="font-display text-[15px] text-ivory leading-tight">{section.title}</p>
                <p className="text-ivory-dim text-[10px] font-body mt-0.5">{section.subtitle}</p>
              </div>

              {/* Gold border on hover */}
              <div className="absolute inset-0 rounded-xl border border-gold/0 group-hover:border-gold/25 transition-colors duration-300" />
            </motion.button>
          ))}
        </motion.div>
      </PageWrapper>
    </>
  )
}
