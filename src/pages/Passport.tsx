import { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, RefreshCw } from 'lucide-react'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { usePassport } from '@/hooks/usePassport'
import { PassportCover } from '@/components/passport/PassportCover'
import { StampGrid } from '@/components/passport/StampGrid'
import { StampDetail } from '@/components/passport/StampDetail'
import { StoryCard } from '@/components/passport/StoryCard'
import { Spinner, OnboardingTip } from '@/components/ui'
import { useAuthStore } from '@/store/auth'
import { fadeUp } from '@/lib/animations'
import { fetchStories } from '@/data/stories'
import { generateStamp } from '@/ai/stamp'
import { updateStampImage } from '@/data/stamps'
import { useUIStore } from '@/store/ui'
import type { PassportStamp, Story } from '@/types/app'
import { useNavigate } from 'react-router'

type View = 'cover' | 'stamps'

export default function Passport() {
  const { gent } = useAuthStore()
  const { stamps, missionStamps, countries, loading } = usePassport()
  const navigate = useNavigate()

  const [view, setView] = useState<View>('cover')
  const [selectedStamp, setSelectedStamp] = useState<PassportStamp | null>(null)
  const [activeTab, setActiveTab] = useState<'stamps' | 'stories'>('stamps')

  const [stories, setStories] = useState<Story[]>([])
  const [storiesLoading, setStoriesLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const addToast = useUIStore(s => s.addToast)

  // Raw (non-deduplicated) city list for frequency analysis in travel intel
  const rawCities = useMemo(() => missionStamps.map(s => s.city).filter(Boolean) as string[], [missionStamps])

  const handleStampPress = useCallback((stamp: PassportStamp) => {
    if (stamp.type === 'mission') {
      navigate(`/passport/visa/${stamp.id}`)
    } else {
      setSelectedStamp(stamp)
    }
  }, [navigate])

  useEffect(() => {
    if (activeTab !== 'stories') return
    setStoriesLoading(true)
    fetchStories().then(s => { setStories(s); setStoriesLoading(false) }).catch(() => setStoriesLoading(false))
  }, [activeTab])

  async function handleRegenerateAll() {
    if (missionStamps.length === 0 || regenerating) return
    setRegenerating(true)
    addToast(`Regenerating ${missionStamps.length} stamps...`, 'info')
    let done = 0
    for (const s of missionStamps) {
      try {
        const url = await generateStamp(s)
        if (url) await updateStampImage(s.id, url)
        done++
      } catch { /* continue */ }
    }
    addToast(`${done}/${missionStamps.length} stamps regenerated. Reload to see them.`, 'success')
    setRegenerating(false)
  }

  // Loading state
  if (loading) {
    return (
      <>
        <TopBar title="Passport" />
        <SectionNav />
        <div className="flex flex-col items-center justify-center flex-1 h-[calc(100vh-96px)]">
          <Spinner size="lg" />
        </div>
      </>
    )
  }

  // Fallback gent shape if auth store has no gent yet
  const gentData = gent
    ? {
        display_name: gent.display_name,
        alias: gent.full_alias ?? gent.alias,
        avatar_url: gent.avatar_url,
      }
    : {
        display_name: 'The Gent',
        alias: 'Codex Member',
        avatar_url: null,
      }

  return (
    <>
      <TopBar
        title="Passport"
        right={
          view === 'stamps' ? (
            <button
              type="button"
              onClick={() => setView('cover')}
              className="flex items-center justify-center text-ivory-muted hover:text-gold transition-colors duration-150 p-1"
              aria-label="Back to passport cover"
            >
              <BookOpen size={18} strokeWidth={1.75} />
            </button>
          ) : undefined
        }
      />
      <SectionNav />

      <AnimatePresence mode="wait">
        {view === 'cover' ? (
          /* Cover view — no horizontal padding (PassportCover handles its own layout) */
          <PageWrapper key="cover" padded={false} scrollable={true}>
            <OnboardingTip
              tipKey="passport"
              title="The Passport"
              body="Stamps are earned automatically as you log entries — one per entry type per city. Tap the cover to open your stamp collection. Stories let you connect multiple entries into a narrative arc."
            />
            <PassportCover
              gent={gentData}
              onOpen={() => setView('stamps')}
              stampCount={stamps.length}
              countryCount={countries.length}
              cities={rawCities}
              missionCount={missionStamps.length}
            />
          </PageWrapper>
        ) : (
          /* Inner passport view — tab bar + tab content */
          <PageWrapper key="stamps" padded={false} scrollable={true}>
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              className="pt-2"
            >
              {/* Tab bar */}
              <div className="flex border-b border-white/5 mx-4 mb-4">
                {(['stamps', 'stories'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`flex-1 py-2.5 text-xs tracking-[0.2em] uppercase font-body transition-colors ${
                      activeTab === tab ? 'text-gold border-b-2 border-gold' : 'text-ivory-dim'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Stamps tab */}
              {activeTab === 'stamps' && (
                <div className="px-4 pb-4">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="font-display text-xl text-ivory leading-tight">Stamp Collection</h2>
                      <p className="text-xs text-ivory-dim mt-0.5">
                        {stamps.length} {stamps.length === 1 ? 'stamp' : 'stamps'} · {countries.length}{' '}
                        {countries.length === 1 ? 'country' : 'countries'}
                      </p>
                    </div>
                    {stamps.length > 0 && (
                      <button
                        type="button"
                        onClick={handleRegenerateAll}
                        disabled={regenerating}
                        className="flex items-center gap-1.5 text-[10px] text-ivory-dim hover:text-gold font-body transition-colors disabled:opacity-40"
                      >
                        <RefreshCw size={12} className={regenerating ? 'animate-spin' : ''} />
                        {regenerating ? 'Regenerating...' : 'Regen Stamps'}
                      </button>
                    )}
                  </div>

                  <StampGrid stamps={stamps} onStampPress={handleStampPress} />
                </div>
              )}

              {/* Stories tab */}
              {activeTab === 'stories' && (
                <div className="px-4 pb-6">
                  {storiesLoading ? (
                    <div className="flex justify-center py-12"><Spinner size="md" /></div>
                  ) : stories.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <p className="text-ivory-dim text-sm font-body">No stories yet.</p>
                      <p className="text-ivory-dim/60 text-xs font-body">Curate your first chapter from the Chronicle.</p>
                      <button
                        onClick={() => navigate('/passport/stories/new')}
                        className="mt-2 px-4 py-2 border border-gold/30 rounded-lg text-xs text-gold font-body hover:bg-gold/5 transition-colors"
                      >
                        Create Story
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 gap-4 mb-4">
                        {stories.map(story => (
                          <StoryCard
                            key={story.id}
                            story={story}
                            onClick={() => navigate(`/passport/stories/${story.id}`)}
                          />
                        ))}
                      </div>
                      <button
                        onClick={() => navigate('/passport/stories/new')}
                        className="w-full py-3 border border-white/5 rounded-xl text-xs text-ivory-dim hover:text-ivory hover:border-gold/20 transition-colors font-body"
                      >
                        + New Story
                      </button>
                    </>
                  )}
                </div>
              )}

            </motion.div>
          </PageWrapper>
        )}
      </AnimatePresence>

      {/* Stamp detail modal — rendered outside AnimatePresence so it doesn't unmount on view switch */}
      <StampDetail stamp={selectedStamp} onClose={() => setSelectedStamp(null)} />
    </>
  )
}
