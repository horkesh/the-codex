import { useState, useMemo, useCallback } from 'react'
import { UserPlus, X, Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar, Modal, Input } from '@/components/ui'
import { staggerContainer, staggerItem } from '@/lib/animations'
import { useTagPeople } from '@/hooks/useTagPeople'
import type { Person } from '@/types/app'

interface PeoplePresentProps {
  entryId: string
}

export function PeoplePresent({ entryId }: PeoplePresentProps) {
  const { taggedPeople, taggedIds, allPeople, loading, addPerson, removePerson } = useTagPeople(entryId)
  const [modalOpen, setModalOpen] = useState(false)
  const [search, setSearch] = useState('')

  const filteredPeople = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allPeople
    return allPeople.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.instagram && p.instagram.toLowerCase().includes(q))
    )
  }, [allPeople, search])

  const handleToggle = useCallback(async (person: Person) => {
    if (taggedIds.has(person.id)) {
      await removePerson(person.id)
    } else {
      await addPerson(person.id)
    }
  }, [taggedIds, addPerson, removePerson])

  if (loading) return null

  return (
    <div className="space-y-3">
      <p className="text-xs tracking-widest text-gold uppercase font-body font-semibold">
        People Present
      </p>

      <motion.div
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="flex flex-wrap items-center gap-2"
      >
        {taggedPeople.map((person) => (
          <motion.div
            key={person.id}
            variants={staggerItem}
            className="flex items-center gap-1.5 bg-slate-light/30 border border-white/5 rounded-full pl-1 pr-2.5 py-1"
          >
            <Avatar
              src={person.portrait_url ?? person.photo_url}
              name={person.name}
              size="xs"
            />
            <span className="text-xs text-ivory font-body truncate max-w-[80px]">
              {person.name}
            </span>
            <button
              type="button"
              onClick={() => removePerson(person.id)}
              className="text-ivory-dim hover:text-ivory transition-colors ml-0.5"
              aria-label={`Remove ${person.name}`}
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}

        {/* Tag button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-1.5 bg-gold/10 border border-gold/20 rounded-full px-3 py-1.5 text-gold hover:bg-gold/20 transition-colors"
        >
          <UserPlus size={14} />
          <span className="text-xs font-body">Tag</span>
        </button>
      </motion.div>

      {/* Tag People Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setSearch('') }}
        title="Tag People"
      >
        <div className="space-y-3 pb-2">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-dim" />
            <Input
              placeholder="Search people…"
              value={search}
              onChange={(e) => setSearch((e.target as HTMLInputElement).value)}
              className="!pl-8"
            />
          </div>

          {/* People list */}
          <div className="max-h-[50vh] overflow-y-auto -mx-1 px-1 space-y-1">
            {filteredPeople.length === 0 ? (
              <p className="text-sm text-ivory-dim text-center py-6 font-body">
                No people found.
              </p>
            ) : (
              filteredPeople.map(person => {
                const isTagged = taggedIds.has(person.id)
                return (
                  <button
                    key={person.id}
                    type="button"
                    onClick={() => handleToggle(person)}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isTagged
                        ? 'bg-gold/10 border border-gold/20'
                        : 'hover:bg-slate-light border border-transparent'
                    }`}
                  >
                    <Avatar
                      src={person.portrait_url ?? person.photo_url}
                      name={person.name}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-ivory font-body truncate">{person.name}</p>
                      {person.instagram && (
                        <p className="text-xs text-ivory-dim font-body truncate">
                          @{person.instagram.replace(/^@/, '')}
                        </p>
                      )}
                    </div>
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      isTagged
                        ? 'bg-gold border-gold'
                        : 'border-white/20'
                    }`}>
                      {isTagged && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-obsidian" />
                        </svg>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
