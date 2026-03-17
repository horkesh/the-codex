import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuthStore } from '@/store/auth'
import { fetchPublicEntries, fetchPublicGents, fetchPublicStats, extractMissionCities } from '@/data/public'
import { ShowcaseHero } from '@/components/showcase/ShowcaseHero'
import { GentCards } from '@/components/showcase/GentCards'
import { FeaturedChronicle } from '@/components/showcase/FeaturedChronicle'
import { TravelMap } from '@/components/showcase/TravelMap'
import { ShowcaseFooter } from '@/components/showcase/ShowcaseFooter'
import type { EntryWithParticipants, Gent, GentStats } from '@/types/app'

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

  useEffect(() => {
    fetchPublicEntries().then(setEntries).catch(() => {})
    fetchPublicGents().then(setGents).catch(() => {})
    fetchPublicStats().then(setStats).catch(() => {})
  }, [])

  const missionCities = extractMissionCities(entries)

  return (
    <div className="min-h-dvh bg-obsidian">
      <ShowcaseHero />
      {gents.length > 0 && <GentCards gents={gents} stats={stats} />}
      <FeaturedChronicle entries={entries} />
      <TravelMap cities={missionCities} />
      <ShowcaseFooter />
    </div>
  )
}
