import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { MapPin, Users, Ticket, Star } from 'lucide-react'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { PizzaSvg } from '@/lib/pizzaSvg'
import { supabase } from '@/lib/supabase'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { daysUntil, formatDate } from '@/lib/utils'
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

const SUB_SECTIONS = [
  { id: 'gathering' as const, label: 'Gatherings', icon: Users, path: '/agenda/upcoming' },
  { id: 'scouting' as const, label: 'Scouting', icon: Ticket, path: '/agenda/scouting' },
  { id: 'wishlist' as const, label: 'Wishlist', icon: Star, path: '/agenda/wishlist' },
]

export default function Agenda() {
  const navigate = useNavigate()
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

  const counts: Record<FeedItemType, number> = {
    gathering: gatherings.length,
    scouting: prospects.length,
    wishlist: wishlist.length,
  }

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
      case 'gathering': return <Users size={11} className="text-gold/60" />
      case 'scouting': return <Ticket size={11} className="text-gold/60" />
      case 'wishlist': return <Star size={11} className="text-gold/60" />
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

      {/* Sub-menu bar */}
      <nav className="flex items-stretch border-b border-white/6" style={{ background: 'rgba(20, 16, 25, 0.88)' }}>
        {SUB_SECTIONS.map(s => (
          <Link
            key={s.id}
            to={s.path}
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-ivory-dim hover:text-gold transition-colors"
          >
            <s.icon size={16} />
            <span className="text-[9px] font-body uppercase tracking-wider">{s.label}</span>
            {counts[s.id] > 0 && (
              <span className="text-[8px] font-body text-gold/50">{counts[s.id]}</span>
            )}
          </Link>
        ))}
      </nav>

      <PageWrapper padded scrollable>
        {/* Unified feed */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : feedItems.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-2">
            <p className="text-sm text-ivory-dim/50 font-body text-center">Nothing on the agenda</p>
          </div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-2.5 pt-3 pb-6">
            {feedItems.map(item => {
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
                  {isPizzaGathering && pizzaMenu?.[0] ? (
                    <PizzaSvg toppings={pizzaMenu[0].toppings} size={40} seed={pizzaMenu[0].name} className="shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      {typeIcon(item.type)}
                    </div>
                  )}

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
