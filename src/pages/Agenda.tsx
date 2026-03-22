import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { MapPin, Users, Ticket, Star, ChevronRight } from 'lucide-react'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { PizzaSvg } from '@/lib/pizzaSvg'
import { supabase } from '@/lib/supabase'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { daysUntil, formatDate } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Entry, GatheringMetadata, Prospect, BucketListItem } from '@/types/app'

type FeedItemType = 'gathering' | 'scouting' | 'wishlist'

interface FeedItem {
  id: string
  type: FeedItemType
  title: string
  subtitle: string | null
  date: string | null
  sortDate: string
  data: Entry | Prospect | BucketListItem
}

const TABS: { id: FeedItemType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'gathering', label: 'Gatherings' },
  { id: 'scouting', label: 'Scouting' },
  { id: 'wishlist', label: 'Wishlist' },
]

export default function Agenda() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<FeedItemType | 'all'>('all')
  const [gatherings, setGatherings] = useState<Entry[]>([])
  const [prospects, setProspects] = useState<Prospect[]>([])
  const [wishlist, setWishlist] = useState<BucketListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [gRes, pRes, wRes] = await Promise.all([
        supabase
          .from('entries')
          .select('id, title, date, location, metadata')
          .eq('type', 'gathering')
          .eq('status', 'gathering_pre')
          .order('date', { ascending: true })
          .limit(20),
        supabase
          .from('prospects')
          .select('*')
          .eq('status', 'prospect')
          .order('event_date', { ascending: true, nullsFirst: false })
          .limit(20),
        supabase
          .from('bucket_list')
          .select('*')
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(20),
      ])
      setGatherings((gRes.data as Entry[]) ?? [])
      setProspects((pRes.data as Prospect[]) ?? [])
      setWishlist((wRes.data as BucketListItem[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  const feedItems = useMemo(() => {
    const items: FeedItem[] = []

    for (const g of gatherings) {
      const meta = g.metadata as unknown as GatheringMetadata
      items.push({
        id: `g-${g.id}`,
        type: 'gathering',
        title: g.title,
        subtitle: meta.venue || meta.location || g.location || null,
        date: meta.event_date || g.date,
        sortDate: meta.event_date || g.date,
        data: g,
      })
    }

    for (const p of prospects) {
      items.push({
        id: `p-${p.id}`,
        type: 'scouting',
        title: p.event_name || p.venue_name || 'Untitled Event',
        subtitle: p.venue_name && p.event_name ? p.venue_name : p.city || null,
        date: p.event_date,
        sortDate: p.event_date || '9999-12-31',
        data: p,
      })
    }

    for (const w of wishlist) {
      items.push({
        id: `w-${w.id}`,
        type: 'wishlist',
        title: w.title,
        subtitle: w.city || null,
        date: null,
        sortDate: w.created_at,
        data: w,
      })
    }

    items.sort((a, b) => a.sortDate.localeCompare(b.sortDate))
    return items
  }, [gatherings, prospects, wishlist])

  const filtered = activeTab === 'all' ? feedItems : feedItems.filter(i => i.type === activeTab)

  function handleTap(item: FeedItem) {
    switch (item.type) {
      case 'gathering':
        navigate(`/gathering/${(item.data as Entry).id}`)
        break
      case 'scouting':
        navigate(`/agenda/scouting`)
        break
      case 'wishlist':
        navigate(`/agenda/wishlist`)
        break
    }
  }

  const typeIcon = (type: FeedItemType) => {
    switch (type) {
      case 'gathering': return <Users size={12} className="text-gold" />
      case 'scouting': return <Ticket size={12} className="text-gold" />
      case 'wishlist': return <Star size={12} className="text-gold" />
    }
  }

  const typeLabel = (type: FeedItemType) => {
    switch (type) {
      case 'gathering': return 'Gathering'
      case 'scouting': return 'Scouting'
      case 'wishlist': return 'Wishlist'
    }
  }

  return (
    <>
      <TopBar title="Agenda" />
      <SectionNav />

      <PageWrapper padded scrollable>
        {/* Sub-nav pills */}
        <div className="flex gap-2 pb-4 pt-1 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-3.5 py-1.5 rounded-full text-xs font-body whitespace-nowrap transition-all border',
                activeTab === tab.id
                  ? 'bg-gold/15 border-gold/50 text-gold'
                  : 'bg-white/5 border-white/10 text-ivory-dim hover:border-white/20',
              )}
            >
              {tab.label}
              {tab.id !== 'all' && (
                <span className="ml-1.5 text-[10px] opacity-60">
                  {tab.id === 'gathering' ? gatherings.length : tab.id === 'scouting' ? prospects.length : wishlist.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sub-section links */}
        <div className="flex gap-2 mb-4">
          {[
            { label: 'Gatherings', path: '/agenda/upcoming', count: gatherings.length },
            { label: 'Scouting', path: '/agenda/scouting', count: prospects.length },
            { label: 'Wishlist', path: '/agenda/wishlist', count: wishlist.length },
          ].map(s => (
            <Link
              key={s.path}
              to={s.path}
              className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/4 border border-white/6 hover:border-gold/20 transition-colors"
            >
              <span className="text-[11px] font-body text-ivory-dim">{s.label}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-body text-ivory-dim/50">{s.count}</span>
                <ChevronRight size={10} className="text-ivory-dim/30" />
              </div>
            </Link>
          ))}
        </div>

        {/* Unified feed */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <p className="text-sm text-ivory-dim/50 font-body text-center">Nothing on the agenda</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-2.5 pb-6">
            {filtered.map(item => {
              const isPizzaGathering = item.type === 'gathering' && (((item.data as Entry).metadata as unknown as GatheringMetadata)?.flavour === 'pizza_party')
              const pizzaMenu = isPizzaGathering ? ((item.data as Entry).metadata as unknown as GatheringMetadata)?.pizza_menu : undefined
              const days = item.date ? daysUntil(item.date) : null

              return (
                <motion.button
                  key={item.id}
                  variants={staggerItem}
                  type="button"
                  onClick={() => handleTap(item)}
                  className="flex items-center gap-3 bg-white/4 border border-white/6 rounded-xl p-3.5 text-left hover:bg-white/6 transition-colors"
                >
                  {/* Pizza preview or type icon */}
                  {isPizzaGathering && pizzaMenu?.[0] ? (
                    <PizzaSvg toppings={pizzaMenu[0].toppings} size={40} seed={pizzaMenu[0].name} className="shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      {typeIcon(item.type)}
                    </div>
                  )}

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[9px] font-body text-gold/50 uppercase tracking-wider">{typeLabel(item.type)}</span>
                    </div>
                    <p className="text-sm text-ivory font-display truncate">{item.title}</p>
                    {item.subtitle && (
                      <span className="text-[10px] text-ivory-dim/50 font-body flex items-center gap-1 mt-0.5">
                        <MapPin size={9} className="shrink-0" /> {item.subtitle}
                      </span>
                    )}
                  </div>

                  {/* Date / countdown */}
                  <div className="shrink-0 text-right">
                    {item.date ? (
                      <>
                        <p className="text-[10px] text-ivory-dim/50 font-body">{formatDate(item.date)}</p>
                        {days !== null && days >= 0 && (
                          <p className="text-[10px] text-gold font-body mt-0.5">
                            {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-[10px] text-ivory-dim/30 font-body">No date</p>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </PageWrapper>
    </>
  )
}
