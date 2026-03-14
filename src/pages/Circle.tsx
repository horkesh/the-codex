import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Plus, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Spinner } from '@/components/ui'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useCircle } from '@/hooks/useCircle'
import { PersonCard } from '@/components/circle/PersonCard'
import { CircleFilters } from '@/components/circle/CircleFilters'
import { PersonForm } from '@/components/circle/PersonForm'
import type { PersonFormData } from '@/components/circle/PersonForm'
import { createPerson, fetchAllLabels } from '@/data/people'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'

export default function Circle() {
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()
  const { people, loading, filters, setFilters, reload } = useCircle()
  const [showAddForm, setShowAddForm] = useState(false)
  const [availableLabels, setAvailableLabels] = useState<string[]>([])

  // Load all labels once for filter chips
  useEffect(() => {
    fetchAllLabels()
      .then(setAvailableLabels)
      .catch(() => {/* non-critical */})
  }, [])

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

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="The Circle"
        subtitle={loading ? undefined : `${people.length} contact${people.length !== 1 ? 's' : ''}`}
        right={
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-gold text-obsidian hover:bg-gold-light transition-colors duration-150"
            aria-label="Add contact"
          >
            <Plus size={16} strokeWidth={2.5} />
          </button>
        }
      />

      <PageWrapper>
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

      {/* Add person modal */}
      <PersonForm
        isOpen={showAddForm}
        onClose={() => setShowAddForm(false)}
        onSave={handleSave}
      />
    </div>
  )
}
