import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/store/auth'
import { fetchPublicEntries, fetchPublicGents, fetchPublicStats, fetchPublicMissionCities, fetchPublicUpcomingGatherings, fetchPublicProspects } from '@/data/public'
import { ShowcaseHero } from '@/components/showcase/ShowcaseHero'
import { GentCards } from '@/components/showcase/GentCards'
import { FeaturedChronicle } from '@/components/showcase/FeaturedChronicle'
import { UpcomingShowcase } from '@/components/showcase/UpcomingShowcase'
import { TravelMap } from '@/components/showcase/TravelMap'
import { ShowcaseFooter } from '@/components/showcase/ShowcaseFooter'
import type { Entry, EntryWithParticipants, Gent, GentStats } from '@/types/app'

export default function Showcase() {
  const navigate = useNavigate()
  const gent = useAuthStore(s => s.gent)

  // Logged-in gents go straight to the lounge
  useEffect(() => {
    if (gent) navigate('/home', { replace: true })
  }, [gent, navigate])

  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [gents, setGents] = useState<Gent[]>([])
  const [stats, setStats] = useState<GentStats[]>([])
  const [missionCities, setMissionCities] = useState<Array<{ city: string; country: string; countryCode: string }>>([])
  const [upcomingGatherings, setUpcomingGatherings] = useState<Entry[]>([])
  const [upcomingProspects, setUpcomingProspects] = useState<Array<{ id: string; event_name: string | null; venue_name: string | null; city: string | null; event_date: string | null }>>([])

  // Only fetch public data if not logged in — avoids wasted API calls during redirect
  useEffect(() => {
    if (gent) return
    fetchPublicEntries().then(setEntries).catch(() => {})
    fetchPublicGents().then(setGents).catch(() => {})
    fetchPublicStats().then(setStats).catch(() => {})
    fetchPublicMissionCities().then(setMissionCities).catch(() => {})
    fetchPublicUpcomingGatherings().then(setUpcomingGatherings).catch(() => {})
    fetchPublicProspects().then(setUpcomingProspects).catch(() => {})
  }, [gent])

  return (
    <div className="h-dvh bg-obsidian overflow-y-auto">
      <ShowcaseHero />
      {gents.length > 0 && <GentCards gents={gents} stats={stats} />}
      <FeaturedChronicle entries={entries} />
      <UpcomingShowcase gatherings={upcomingGatherings} prospects={upcomingProspects} />
      <TravelMap cities={missionCities} />
      <ShowcaseFooter />
    </div>
  )
}
