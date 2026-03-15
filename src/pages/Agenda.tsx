import { Link } from 'react-router'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'

const MotionLink = motion(Link)

const SUB_SECTIONS = [
  {
    id: 'wishlist',
    label: 'Wishlist',
    subtitle: 'Places to go, things to do',
    path: '/agenda/wishlist',
    image: '/images/sections/bucket-list.webp',
  },
  {
    id: 'scouting',
    label: 'Scouting',
    subtitle: 'Events on the radar',
    path: '/agenda/scouting',
    image: '/images/sections/scouting.webp',
  },
]

export default function Agenda() {
  return (
    <>
      <TopBar title="Agenda" />
      <SectionNav />

      <PageWrapper padded scrollable>
        <div className="flex flex-col gap-3 pt-2 pb-6">
          {SUB_SECTIONS.map((s) => (
            <MotionLink
              key={s.id}
              to={s.path}
              whileTap={{ scale: 0.965 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative block overflow-hidden rounded-2xl border border-white/8 bg-slate-mid h-44"
            >
              <motion.div
                className="absolute inset-0"
                whileHover={{ scale: 1.08 }}
                transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
              >
                <img
                  src={s.image}
                  alt=""
                  aria-hidden="true"
                  className="w-full h-full object-cover"
                  style={{ opacity: 0.7 }}
                />
              </motion.div>

              <div className="absolute inset-0 bg-gradient-to-t from-obsidian/90 via-obsidian/30 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p className="font-display text-[18px] text-ivory leading-tight">{s.label}</p>
                <p className="font-body text-ivory-dim/80 text-[11px] leading-snug mt-0.5">{s.subtitle}</p>
              </div>

              <motion.div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.18 }}
                style={{ boxShadow: 'inset 0 0 0 1px rgba(201,168,76,0.55), 0 4px 24px rgba(201,168,76,0.12)' }}
              />
            </MotionLink>
          ))}
        </div>
      </PageWrapper>
    </>
  )
}
