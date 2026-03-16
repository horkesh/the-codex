import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Users, Radar, Network } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper, SectionNav } from '@/components/layout'
import { Button, Spinner, EmptyStateImage, OnboardingTip } from '@/components/ui'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useCircle } from '@/hooks/useCircle'
import { PersonCard } from '@/components/circle/PersonCard'
import { CircleFilters } from '@/components/circle/CircleFilters'
import { PersonForm } from '@/components/circle/PersonForm'
import type { PersonFormData } from '@/components/circle/PersonForm'
import { POIModal } from '@/components/circle/POIModal'
import { ScanActionSheet } from '@/components/circle/ScanActionSheet'
import { createPerson, fetchAllLabels, fetchPeopleByCategory } from '@/data/people'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import type { Person } from '@/types/app'

export default function Circle() {
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()
  const { people, loading, filters, setFilters, reload } = useCircle()
  const [showAddForm, setShowAddForm] = useState(false)
  const [availableLabels, setAvailableLabels] = useState<string[]>([])

  // Tab state
  const [activeTab, setActiveTab] = useState<'contacts' | 'poi'>('contacts')
  const [showPOIModal, setShowPOIModal] = useState(false)
  const [showActionSheet, setShowActionSheet] = useState(false)
  const [poiMode, setPOIMode] = useState<'research' | 'scan'>('research')
  const [poiPeople, setPOIPeople] = useState<Person[]>([])
  const [poiLoading, setPOILoading] = useState(false)

  // Load all labels once for filter chips
  useEffect(() => {
    fetchAllLabels()
      .then(setAvailableLabels)
      .catch(() => {/* non-critical */})
  }, [])

  // Load POI people when switching to that tab
  useEffect(() => {
    if (activeTab !== 'poi') return
    setPOILoading(true)
    fetchPeopleByCategory('person_of_interest')
      .then(p => { setPOIPeople(p); setPOILoading(false) })
      .catch(() => setPOILoading(false))
  }, [activeTab])

  const handleSave = async (data: PersonFormData) => {
    if (!gent) return
    const igHandle = data.instagram?.replace(/^@/, '').trim()
    await createPerson({
      name: data.name,
      instagram: data.instagram || undefined,
      photo_url: igHandle ? `https://unavatar.io/instagram/${igHandle}` : undefined,
      met_location: data.met_location || undefined,
      met_date: data.met_date || undefined,
      notes: data.notes || undefined,
      labels: data.labels,
      added_by: gent.id,
    })
    await reload()
    // Refresh labels in background
    fetchAllLabels().then(setAvailableLabels).catch(() => {})
    addToast('Contact added', 'success')
    setShowAddForm(false)
  }

  const handleFABPress = () => {
    if (activeTab === 'contacts') {
      setShowAddForm(true)
    } else {
      setShowActionSheet(true)
    }
  }

  const handleActionSelect = (mode: 'research' | 'scan') => {
    setPOIMode(mode)
    setShowActionSheet(false)
    setShowPOIModal(true)
  }

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Circle"
        subtitle={
          activeTab === 'contacts'
            ? (loading ? undefined : `${people.length} contact${people.length !== 1 ? 's' : ''}`)
            : (poiLoading ? undefined : `${poiPeople.length} on the radar`)
        }
        right={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/circle/map')}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-light/40 text-ivory-muted hover:text-gold hover:bg-slate-light transition-colors duration-150"
              aria-label="Mind map"
            >
              <Network size={16} strokeWidth={2} />
            </button>
            <button
              type="button"
              onClick={handleFABPress}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-gold text-obsidian hover:bg-gold-light transition-colors duration-150"
              aria-label={activeTab === 'poi' ? 'Scout someone' : 'Add contact'}
            >
              <Plus size={16} strokeWidth={2.5} />
            </button>
          </div>
        }
      />
      <SectionNav />

      {/* Tab bar */}
      <div className="flex border-b border-white/5 mx-4 mb-0">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`flex-1 py-2.5 text-xs tracking-[0.2em] uppercase font-body transition-colors ${
            activeTab === 'contacts' ? 'text-gold border-b-2 border-gold' : 'text-ivory-dim'
          }`}
        >
          Contacts
        </button>
        <button
          onClick={() => setActiveTab('poi')}
          className={`flex-1 py-2.5 text-xs tracking-[0.2em] uppercase font-body transition-colors ${
            activeTab === 'poi' ? 'text-gold border-b-2 border-gold' : 'text-ivory-dim'
          }`}
        >
          On the Radar
        </button>
      </div>

      {/* Contacts tab */}
      {activeTab === 'contacts' && (
        <PageWrapper>
          <OnboardingTip
            tipKey="circle"
            title="The Circle"
            body="People you've met and want to remember. Add someone via Instagram for an instant photo. Tag people on entries to build edges in the Mind Map."
          />
          {/* Filters */}
          <CircleFilters
            filters={filters}
            onChange={setFilters}
            availableLabels={availableLabels}
          />

          {/* Loading */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="md" />
            </div>
          ) : people.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <EmptyStateImage src="/empty-states/circle.webp" className="mb-1" />
              <Users size={40} className="text-ivory-dim opacity-40" />
              <p className="text-ivory-dim text-sm font-body">
                {filters.search || filters.label
                  ? 'No contacts match your search'
                  : 'Your circle is empty'}
              </p>
              {!filters.search && !filters.label && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddForm(true)}
                >
                  Add First Contact
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Count line */}
              <p className="text-xs text-ivory-dim mb-3 font-body">
                {people.length} {people.length === 1 ? 'person' : 'people'}
              </p>

              {/* People list */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="flex flex-col gap-2"
              >
                {people.map((person) => (
                  <motion.div key={person.id} variants={staggerItem}>
                    <PersonCard
                      person={person}
                      onClick={() => navigate(`/circle/${person.id}`)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </PageWrapper>
      )}

      {/* POI tab */}
      {activeTab === 'poi' && (
        <PageWrapper>
          {poiLoading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner size="md" />
            </div>
          ) : poiPeople.length === 0 ? (
            /* Empty state */
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
              <EmptyStateImage src="/empty-states/circle.webp" className="mb-1" />
              <Radar size={40} className="text-ivory-dim opacity-40" />
              <p className="text-ivory-dim text-sm font-body">No one on the radar yet.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActionSheet(true)}
              >
                Scout Someone
              </Button>
            </div>
          ) : (
            <>
              {/* Count line */}
              <p className="text-xs text-ivory-dim mb-3 font-body">
                {poiPeople.length} {poiPeople.length === 1 ? 'person' : 'people'} on the radar
              </p>

              {/* POI grid */}
              <motion.div
                variants={staggerContainer}
                initial="initial"
                animate="animate"
                className="flex flex-col gap-2"
              >
                {poiPeople.map((person) => (
                  <motion.div key={person.id} variants={staggerItem}>
                    {/* POI card — reuse PersonCard layout, with extras below */}
                    <div
                      className="rounded-xl bg-slate-light/30 border border-white/5 p-3 cursor-pointer active:opacity-80 transition-opacity"
                      onClick={() => navigate(`/circle/${person.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        {(person.portrait_url ?? person.photo_url) ? (
                          <img
                            src={person.portrait_url ?? person.photo_url!}
                            alt={person.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
                          />
                        ) : person.instagram ? (
                          <img
                            src={`https://unavatar.io/instagram/${person.instagram.replace(/^@/, '')}`}
                            alt={person.name}
                            className="w-10 h-10 rounded-full object-cover shrink-0 mt-0.5"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-light flex items-center justify-center shrink-0 mt-0.5">
                            <span className="text-ivory-dim text-sm font-display">
                              {person.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-display text-base text-ivory leading-tight truncate">
                              {person.name}
                            </p>
                            {/* Visibility badge */}
                            <span
                              className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-body leading-none ${
                                person.poi_visibility === 'circle'
                                  ? 'bg-gold/15 text-gold'
                                  : 'bg-slate-light text-ivory-dim'
                              }`}
                            >
                              {person.poi_visibility === 'circle' ? 'Circle' : 'Private'}
                            </span>
                          </div>

                          {/* Instagram handle */}
                          {person.instagram && (
                            <p className="text-xs text-gold-muted leading-tight mt-0.5 truncate">
                              @{person.instagram.replace(/^@/, '')}
                            </p>
                          )}

                          {/* POI intel excerpt */}
                          {person.poi_intel && (
                            <p className="text-xs text-ivory-dim leading-snug mt-1 italic line-clamp-2">
                              {person.poi_intel}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            </>
          )}
        </PageWrapper>
      )}

      {/* Add contact modal */}
      <PersonForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSave={handleSave}
      />

      {/* Scout action sheet */}
      <ScanActionSheet
        open={showActionSheet}
        onClose={() => setShowActionSheet(false)}
        onSelect={handleActionSelect}
      />

      {/* Scout POI modal */}
      <POIModal
        open={showPOIModal}
        mode={poiMode}
        onClose={() => setShowPOIModal(false)}
        onSaved={() => {
          setShowPOIModal(false)
          // Reload the POI list to include the new person
          setPOILoading(true)
          fetchPeopleByCategory('person_of_interest')
            .then(p => { setPOIPeople(p); setPOILoading(false) })
            .catch(() => setPOILoading(false))
          // Also reload contacts in case they were routed there
          reload()
        }}
      />
    </div>
  )
}
