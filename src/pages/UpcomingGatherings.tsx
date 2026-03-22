import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import { MapPin, Calendar } from 'lucide-react'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { PizzaSvg } from '@/lib/pizzaSvg'
import { supabase } from '@/lib/supabase'
import { fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import { daysUntil, formatDate } from '@/lib/utils'
import type { Entry, GatheringMetadata } from '@/types/app'

export default function UpcomingGatherings() {
  const navigate = useNavigate()
  const [gatherings, setGatherings] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('entries')
        .select('*')
        .eq('type', 'gathering')
        .eq('status', 'gathering_pre')
        .order('date', { ascending: true })
      setGatherings((data as Entry[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  return (
    <>
      <TopBar title="Upcoming" back />
      <SectionNav />
      <PageWrapper padded scrollable>
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
          </div>
        ) : gatherings.length === 0 ? (
          <motion.div variants={fadeUp} initial="initial" animate="animate" className="flex flex-col items-center py-20 gap-3">
            <p className="text-sm text-ivory/50 font-body text-center">No upcoming gatherings</p>
          </motion.div>
        ) : (
          <motion.div variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-3 pb-6">
            {gatherings.map(entry => {
              const meta = entry.metadata as unknown as GatheringMetadata
              const isPizza = meta.flavour === 'pizza_party'
              const days = daysUntil(meta.event_date)
              const countdownLabel = days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : days > 0 ? `In ${days} days` : 'Past'
              return (
                <motion.button key={entry.id} variants={staggerItem} type="button"
                  onClick={() => navigate(`/gathering/${entry.id}`)}
                  className="flex items-center gap-4 bg-white/5 border border-white/8 rounded-xl p-4 text-left hover:bg-white/8 transition-colors"
                >
                  {isPizza && meta.pizza_menu?.[0] && (
                    <PizzaSvg toppings={meta.pizza_menu[0].toppings} size={48} seed={meta.pizza_menu[0].name} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-ivory font-display truncate">{entry.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {(meta.venue || meta.location) && (
                        <span className="text-[10px] text-ivory/40 font-body flex items-center gap-1">
                          <MapPin size={10} /> {meta.venue || meta.location}
                        </span>
                      )}
                      <span className="text-[10px] text-ivory/40 font-body flex items-center gap-1">
                        <Calendar size={10} /> {formatDate(meta.event_date)}
                      </span>
                    </div>
                    {isPizza && meta.pizza_menu && (
                      <p className="text-[10px] text-gold/60 font-body mt-1">{meta.pizza_menu.length} pizzas</p>
                    )}
                  </div>
                  <span className="text-xs text-gold font-body shrink-0">{countdownLabel}</span>
                </motion.button>
              )
            })}
          </motion.div>
        )}
      </PageWrapper>
    </>
  )
}
