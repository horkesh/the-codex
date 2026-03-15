import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  BookOpen, Plane, Moon, Utensils, Gamepad2, Wine, Users,
  Sparkles, ImagePlay, Stamp, UserRound, Instagram, Share2,
  Flame, BarChart2, Bookmark, Radar, MessageSquare,
  ThumbsUp, Network, Trophy, Star,
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

function Term({ word, def }: { word: string; def: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-gold font-medium shrink-0 w-24">{word}</span>
      <span>{def}</span>
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
              The Codex — Systems Reference
            </p>
            <p className="text-sm text-ivory-muted font-body leading-relaxed">
              A private chronicle for three gents. Every mission logged, every night remembered, every face in the Circle. This is how it all fits together.
            </p>
          </motion.div>

          <Divider />

          {/* ── Chronicle ── */}
          <Section icon={<BookOpen size={15} />} title="The Chronicle">
            <p>Your shared logbook. Every notable moment gets an entry — give it a title, date, location, and tag who was there.</p>
            <p>Tap the gold <span className="text-gold">+</span> button (bottom of screen) to add a new entry. Choose the type that fits:</p>
            <div className="space-y-2 mt-1">
              <EntryType icon={<Plane size={13} />} label="Mission" desc="a trip or city visit" />
              <EntryType icon={<Moon size={13} />} label="Night Out" desc="bars, clubs, evenings out" />
              <EntryType icon={<Utensils size={13} />} label="The Table" desc="a steak dinner or restaurant" />
              <EntryType icon={<Gamepad2 size={13} />} label="The Pitch" desc="a PlayStation session with scores" />
              <EntryType icon={<Wine size={13} />} label="The Toast" desc="cocktails or a specific drink moment" />
              <EntryType icon={<Users size={13} />} label="Gathering" desc="a planned event with an invite page" />
              <EntryType icon={<BookOpen size={13} />} label="Interlude" desc="a reflection or notable moment" />
            </div>
            <p className="mt-1">Tap any entry to leave a <span className="text-ivory font-medium">comment</span> — a short note visible to all three gents.</p>
          </Section>

          <Divider />

          {/* ── AI: Lore + Scene ── */}
          <Section icon={<Sparkles size={15} />} title="Lore">
            <p>On any entry, tap <span className="text-ivory font-medium">···</span> → <span className="text-ivory font-medium">Generate Lore</span>. The AI writes a chronicle of that night in the voice of the group — dramatic, cinematic, fitting the occasion.</p>
            <p>Lore is generated once and saved permanently.</p>
          </Section>

          <Section icon={<ImagePlay size={15} />} title="Scene">
            <p>On <span className="text-ivory font-medium">Mission</span> and <span className="text-ivory font-medium">Night Out</span> entries, tap <span className="text-ivory font-medium">···</span> → <span className="text-ivory font-medium">Generate Scene</span>. The AI creates a cinematic image of your actual gents at that location — using each member's portrait to place them in the scene.</p>
            <p>For best results: make sure all participants have a portrait generated first.</p>
          </Section>

          <Divider />

          {/* ── Passport ── */}
          <Section icon={<Stamp size={15} />} title="The Passport">
            <p>Every entry earns a stamp. The Passport collects them all — grouped by city and entry type. Tap the cover to open your collection.</p>
            <p>Missions earn travel stamps. Achievements unlock diplomatic stamps automatically as you hit milestones (5 missions, 5 countries, 10 nights out, etc.).</p>
            <p><span className="text-ivory font-medium">Stories</span> let you weave multiple entries into a narrative arc — with an AI-written storyline and a generated stamp.</p>
          </Section>

          <Divider />

          {/* ── Circle ── */}
          <Section icon={<UserRound size={15} />} title="The Circle">
            <p>People you've met and want to remember. Add a contact with their name, where you met, and when.</p>
            <div className="flex items-start gap-2 mt-1">
              <Instagram size={13} className="text-gold-muted mt-0.5 shrink-0" />
              <p>Add their Instagram handle and their profile photo fetches automatically.</p>
            </div>
            <p>Each contact has shared notes (visible to all gents) and a private note only you can see.</p>
            <p>Assign a <span className="text-ivory font-medium">tier</span> — Inner Circle, Outer Circle, or Acquaintance — to place them in the right ring of the Mind Map.</p>
          </Section>

          <Section icon={<Network size={15} />} title="Mind Map">
            <p>Tap the network icon in The Circle to open the Mind Map — a canvas showing everyone you know arranged in concentric rings by tier, with colour-coded edges to the gent who added them.</p>
            <p>Tap any gent node to enter focus mode and highlight only their connections. Tap a person node to view their profile or change their tier.</p>
            <p><span className="text-ivory font-medium">Tag People</span> on any published entry to draw edges between people who appear together.</p>
          </Section>

          <Section icon={<Star size={15} />} title="POI — Persons of Interest">
            <p>The second tab in The Circle. Add someone from the radar — paste their Instagram URL or upload a screenshot. The AI analyses their profile, scores eligibility, extracts dossier fields, and generates a portrait in the Codex aesthetic.</p>
            <p>POIs stay private unless you explicitly share them to the Circle.</p>
          </Section>

          <Divider />

          {/* ── Ledger ── */}
          <Section icon={<BarChart2 size={15} />} title="The Ledger">
            <p>Stats, records, and rivalry — all derived automatically from your logged entries.</p>
            <div className="space-y-1.5 mt-1">
              <EntryType icon={<BarChart2 size={13} />} label="By the Numbers" desc="per-gent breakdown across all tracked stats; 👑 crown marks the monthly leader" />
              <EntryType icon={<Flame size={13} />} label="Streaks" desc="consecutive months with your most-logged entry type; current streak + personal best" />
              <EntryType icon={<Gamepad2 size={13} />} label="PS5 Rivalry" desc="head-to-head record and H2H scorelines across all sessions" />
              <EntryType icon={<Trophy size={13} />} label="Rivalry Index" desc="longest win streaks, decisive victories, and current form" />
              <EntryType icon={<Utensils size={13} />} label="Verdict Board" desc="top steakhouses by average score and most-visited cities" />
              <EntryType icon={<Wine size={13} />} label="Sommelier" desc="spirits and whisky sessions grouped by category from Toast entries" />
              <EntryType icon={<Sparkles size={13} />} label="Annual Wrapped" desc="Claude-written year-in-review narrative for a selected year" />
            </div>
          </Section>

          <Divider />

          {/* ── Agenda ── */}
          <Section icon={<Bookmark size={15} />} title="Wishlist">
            <p>Aspirational places and experiences you want to hit. Add an item manually or via Instagram URL. When it happens, tap <span className="text-ivory font-medium">Mark Done</span> and link it to the Chronicle entry — a gold chip will connect the two forever.</p>
          </Section>

          <Section icon={<Radar size={15} />} title="Scouting">
            <p>Upcoming events on the radar. Paste an Instagram URL or screenshot of an event page and the AI extracts the name, venue, date, and city automatically.</p>
            <p>On shared prospects, all three gents can vote <span className="text-ivory font-medium">I'm In</span> or <span className="text-ivory font-medium">Pass</span>. When you go, tap <span className="text-ivory font-medium">Log as Entry</span> — it pre-fills the form and marks the prospect converted.</p>
          </Section>

          <Divider />

          {/* ── Comments & Reactions ── */}
          <Section icon={<MessageSquare size={15} />} title="Comments">
            <p>On any published entry, scroll past the details to leave a short comment (max 280 characters). Tap Enter or the send button. Your own comments show a delete button on hover. Comments sync in real time across all devices.</p>
          </Section>

          <Section icon={<ThumbsUp size={15} />} title="Reactions">
            <p>Four reaction types on every entry: <span className="text-ivory font-medium">Legendary ★</span>, <span className="text-ivory font-medium">Classic •</span>, <span className="text-ivory font-medium">Ruthless ✦</span>, <span className="text-ivory font-medium">Noted ◈</span>. Tap once to add, tap again to remove.</p>
          </Section>

          <Divider />

          {/* ── Gatherings ── */}
          <Section icon={<Users size={15} />} title="Gatherings">
            <p>A special entry type with a full lifecycle: create the event → share the invite link → guests RSVP and sign the guestbook → after the event, it converts to a Chronicle entry with a post-event recap.</p>
            <p>The public invite page works without an account — share it to a group chat.</p>
          </Section>

          <Divider />

          {/* ── Studio ── */}
          <Section icon={<Share2 size={15} />} title="The Studio">
            <p>Export any entry as a shareable image card — the cover art, lore text, and key details composed into a single card. Open Studio from the bottom nav or tap <span className="text-ivory font-medium">Export to Studio</span> on any entry detail page.</p>
            <p>Each card can have an AI-generated background tuned to the entry type and location. Tap <span className="text-ivory font-medium">Generate AI Background</span> to create one.</p>
          </Section>

          <Divider />

          {/* ── Profiles ── */}
          <Section icon={<UserRound size={15} />} title="Your Portrait">
            <p>Go to <span className="text-ivory font-medium">Profile</span> → tap <span className="text-ivory font-medium">Change photo</span>. Upload any photo of yourself. The AI analyses your appearance and generates a stylised portrait in the Codex aesthetic.</p>
            <p>Your portrait is used in Scene generation — the AI places your actual likeness into mission and night out images.</p>
          </Section>

          <Section icon={<UserRound size={15} />} title="Gent Profiles">
            <p>Tap any participant avatar in an entry to open their profile page — portrait, signature stat, honours, bio, and last 5 Chronicle entries.</p>
          </Section>

          <Divider />

          {/* ── Vocabulary ── */}
          <motion.div variants={staggerItem} className="space-y-3">
            <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">Vocabulary</p>
            <div className="space-y-2 text-sm font-body text-ivory-muted leading-relaxed">
              <Term word="Mission" def="a trip, city visit, or significant expedition" />
              <Term word="Gent" def="one of the three — Keys, Bass, Lorekeeper" />
              <Term word="Stamp" def="an achievement earned automatically on logging entries" />
              <Term word="Prospect" def="an upcoming event being scouted" />
              <Term word="Lore" def="an AI-generated narrative written for an entry" />
              <Term word="Scene" def="an AI-generated cinematic image for an entry" />
              <Term word="POI" def="Person of Interest — someone in the Circle's radar tab" />
              <Term word="Tier" def="a person's closeness: Inner Circle, Outer Circle, Acquaintance" />
              <Term word="Crown 👑" def="shown next to the gent with the most entries this calendar month" />
            </div>
          </motion.div>

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
