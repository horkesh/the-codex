import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  BookOpen, Plane, Moon, Utensils, Gamepad2, Wine, Users,
  Sparkles, ImagePlay, Stamp, UserRound, Instagram, Share2,
} from 'lucide-react'
import { TopBar, PageWrapper } from '@/components/layout'
import { staggerContainer, staggerItem } from '@/lib/animations'

interface SectionProps {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}

function Section({ icon, title, children }: SectionProps) {
  return (
    <motion.div variants={staggerItem} className="space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-7 h-7 rounded-md bg-gold/10 text-gold shrink-0">
          {icon}
        </div>
        <h2 className="font-display text-base text-ivory">{title}</h2>
      </div>
      <div className="pl-9 space-y-2 text-sm text-ivory-muted font-body leading-relaxed">
        {children}
      </div>
    </motion.div>
  )
}

function Divider() {
  return (
    <motion.div variants={staggerItem} className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent" />
  )
}

function EntryType({ icon, label, desc }: { icon: React.ReactNode; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-gold-muted mt-0.5 shrink-0">{icon}</span>
      <span><span className="text-ivory font-medium">{label}</span> — {desc}</span>
    </div>
  )
}

export default function Help() {
  const navigate = useNavigate()

  return (
    <>
      <TopBar title="The Field Guide" back />
      <PageWrapper padded scrollable className="pb-12">
        <motion.div
          variants={staggerContainer}
          initial="initial"
          animate="animate"
          className="space-y-6 pt-2"
        >
          {/* Intro */}
          <motion.div variants={staggerItem} className="space-y-2">
            <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
              The Codex
            </p>
            <p className="text-sm text-ivory-muted font-body leading-relaxed">
              A private chronicle for the Gents. Every mission logged, every night remembered, every face remembered. This is how it fits together.
            </p>
          </motion.div>

          <Divider />

          {/* The Chronicle */}
          <Section icon={<BookOpen size={15} />} title="The Chronicle">
            <p>Your shared logbook. Every notable moment gets an entry — give it a title, date, location, and tag who was there.</p>
            <p>Tap the <span className="text-gold">+</span> button to add a new entry. Choose the type that fits:</p>
            <div className="space-y-2 mt-1">
              <EntryType icon={<Plane size={13} />} label="Mission" desc="a trip or city visit" />
              <EntryType icon={<Moon size={13} />} label="Night Out" desc="bars, clubs, evenings out" />
              <EntryType icon={<Utensils size={13} />} label="The Table" desc="a steak dinner or restaurant" />
              <EntryType icon={<Gamepad2 size={13} />} label="The Pitch" desc="a PlayStation session with scores" />
              <EntryType icon={<Wine size={13} />} label="The Toast" desc="cocktails or a specific drink moment" />
              <EntryType icon={<Users size={13} />} label="Gathering" desc="a planned event with an invite page" />
              <EntryType icon={<BookOpen size={13} />} label="Interlude" desc="a reflection or notable moment" />
            </div>
          </Section>

          <Divider />

          {/* AI Features */}
          <Section icon={<Sparkles size={15} />} title="Lore">
            <p>On any entry, tap <span className="text-ivory font-medium">···</span> → <span className="text-ivory font-medium">Generate Lore</span>. The AI writes the chronicle of that night in the voice of the group — dramatic, cinematic, fitting the occasion.</p>
            <p>Lore is generated once and saved to the entry permanently.</p>
          </Section>

          <Section icon={<ImagePlay size={15} />} title="Scene">
            <p>On <span className="text-ivory font-medium">Mission</span> and <span className="text-ivory font-medium">Night Out</span> entries, tap <span className="text-ivory font-medium">···</span> → <span className="text-ivory font-medium">Generate Scene</span>. The AI creates a cinematic image of your actual gents at that location — using each member's portrait description to put them in the scene.</p>
            <p>For best results, make sure all participants have had their portrait generated first.</p>
          </Section>

          <Divider />

          {/* Passport */}
          <Section icon={<Stamp size={15} />} title="The Passport">
            <p>Every entry you're part of earns a stamp. The Passport page collects them all — grouped by city and entry type.</p>
            <p>Missions earn travel stamps. Special achievements unlock diplomatic stamps over time.</p>
          </Section>

          <Divider />

          {/* Circle */}
          <Section icon={<UserRound size={15} />} title="The Circle">
            <p>People you've met and want to remember. Add a contact with their name, where you met, and when.</p>
            <div className="flex items-start gap-2 mt-1">
              <Instagram size={13} className="text-gold-muted mt-0.5 shrink-0" />
              <p>Add their Instagram handle and their profile photo fetches automatically — no upload needed.</p>
            </div>
            <p>Each contact has a shared notes field (visible to all Gents) and a private note only you can see.</p>
          </Section>

          <Divider />

          {/* Portrait */}
          <Section icon={<UserRound size={15} />} title="Your Portrait">
            <p>Go to <span className="text-ivory font-medium">Profile</span> → tap <span className="text-ivory font-medium">Change photo</span>. Upload any photo of yourself. The AI analyses your appearance and generates a stylised portrait in the Codex aesthetic.</p>
            <p>Your portrait is used in Scene generation — the AI places your actual likeness into mission and night out images.</p>
          </Section>

          <Divider />

          {/* Studio */}
          <Section icon={<Share2 size={15} />} title="Studio">
            <p>Export any entry as a shareable image — the cover art, lore text, and key details composed into a single card. Find it via <span className="text-ivory font-medium">Export to Studio</span> on any entry, or directly from the bottom navigation.</p>
          </Section>

          <Divider />

          {/* Gatherings */}
          <Section icon={<Users size={15} />} title="Gatherings">
            <p>A special entry type with a public-facing invite page. Share the link with guests — they can RSVP and sign the guestbook. After the event, the gathering converts to a chronicle entry.</p>
          </Section>

          {/* Footer */}
          <motion.div variants={staggerItem} className="pt-4 text-center space-y-1">
            <div className="h-px bg-gradient-to-r from-transparent via-gold/20 to-transparent mb-4" />
            <p className="text-xs text-ivory-dim font-body italic">
              "Private. Deliberate. Legendary."
            </p>
            <button
              onClick={() => navigate('/chronicle')}
              className="mt-3 text-xs text-gold font-body hover:text-gold-light transition-colors"
            >
              Back to the Chronicle →
            </button>
          </motion.div>
        </motion.div>
      </PageWrapper>
    </>
  )
}
