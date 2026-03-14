import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { MapPin, Globe, Building2, X, ChevronRight } from 'lucide-react'
import { fetchEntries } from '@/data/entries'
import { TopBar, PageWrapper } from '@/components/layout'
import { Spinner } from '@/components/ui'
import { ENTRY_TYPE_META } from '@/lib/entryTypes'
import { fadeIn, fadeUp, staggerContainer, staggerItem } from '@/lib/animations'
import type { EntryWithParticipants, EntryType } from '@/types/app'

// ─── Types ──────────────────────────────────────────────────────────────────

interface CityGroup {
  city: string
  country: string
  country_code: string | null
  entries: EntryWithParticipants[]
  typeCounts: Partial<Record<EntryType, number>>
}

interface CountryGroup {
  country: string
  country_code: string | null
  cities: CityGroup[]
  totalEntries: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function groupByLocation(entries: EntryWithParticipants[]): CountryGroup[] {
  const countryMap: Record<string, Record<string, EntryWithParticipants[]>> = {}

  for (const entry of entries) {
    const country = entry.country ?? 'Unknown Country'
    const city = entry.city ?? 'Unknown City'
    if (!countryMap[country]) countryMap[country] = {}
    if (!countryMap[country][city]) countryMap[country][city] = []
    countryMap[country][city].push(entry)
  }

  return Object.entries(countryMap)
    .map(([country, cities]) => {
      const cityGroups: CityGroup[] = Object.entries(cities).map(([city, cityEntries]) => {
        const typeCounts: Partial<Record<EntryType, number>> = {}
        for (const e of cityEntries) {
          typeCounts[e.type] = (typeCounts[e.type] ?? 0) + 1
        }
        const sample = cityEntries[0]
        return {
          city,
          country,
          country_code: sample?.country_code ?? null,
          entries: cityEntries,
          typeCounts,
        }
      }).sort((a, b) => b.entries.length - a.entries.length)

      return {
        country,
        country_code: cityGroups[0]?.country_code ?? null,
        cities: cityGroups,
        totalEntries: cityGroups.reduce((sum, c) => sum + c.entries.length, 0),
      }
    })
    .sort((a, b) => b.totalEntries - a.totalEntries)
}

function flagEmoji(code: string | null): string {
  if (!code || code.length !== 2) return ''
  return code
    .toUpperCase()
    .split('')
    .map((c) => String.fromCodePoint(c.charCodeAt(0) + 127397))
    .join('')
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBlock({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="font-mono text-2xl text-gold leading-none">{value}</span>
      <span className="text-[10px] uppercase tracking-[0.18em] text-ivory-dim font-body">{label}</span>
    </div>
  )
}

function TypePill({ type, count }: { type: EntryType; count: number }) {
  const meta = ENTRY_TYPE_META[type]
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-body font-medium ${meta.bg} text-ivory`}>
      <meta.Icon size={9} />
      {count}
    </span>
  )
}

interface CityRowProps {
  cityGroup: CityGroup
  onSelect: (city: CityGroup) => void
}

function CityRow({ cityGroup, onSelect }: CityRowProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(cityGroup)}
      className="w-full flex items-center justify-between py-3 px-4 rounded-xl hover:bg-white/3 transition-colors active:bg-white/5 text-left group"
    >
      <div className="flex items-center gap-3 min-w-0">
        <Building2 size={13} className="text-ivory-dim shrink-0" />
        <span className="text-sm font-body text-ivory truncate">{cityGroup.city}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0 ml-2">
        <div className="flex gap-1 flex-wrap justify-end">
          {(Object.entries(cityGroup.typeCounts) as [EntryType, number][])
            .sort(([, a], [, b]) => b - a)
            .map(([type, count]) => (
              <TypePill key={type} type={type} count={count} />
            ))}
        </div>
        <ChevronRight size={13} className="text-ivory-dim group-hover:text-ivory transition-colors" />
      </div>
    </button>
  )
}

interface SidePanelProps {
  cityGroup: CityGroup | null
  onClose: () => void
  onEntryClick: (id: string) => void
}

function SidePanel({ cityGroup, onClose, onEntryClick }: SidePanelProps) {
  return (
    <AnimatePresence>
      {cityGroup && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-obsidian/60 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            className="fixed inset-y-0 right-0 w-full max-w-sm bg-slate-dark border-l border-white/8 z-50 flex flex-col"
          >
            {/* Panel header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
              <div className="min-w-0">
                <h2 className="text-base font-display text-ivory truncate">{cityGroup.city}</h2>
                <p className="text-xs text-ivory-dim font-body mt-0.5">
                  {flagEmoji(cityGroup.country_code)} {cityGroup.country} &middot; {cityGroup.entries.length} {cityGroup.entries.length === 1 ? 'entry' : 'entries'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-full text-ivory-dim hover:text-ivory hover:bg-white/8 transition-colors shrink-0 ml-3"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Entry list */}
            <div className="flex-1 overflow-y-auto py-2">
              {cityGroup.entries.map((entry) => {
                const meta = ENTRY_TYPE_META[entry.type]
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onEntryClick(entry.id)}
                    className="w-full text-left px-5 py-3.5 hover:bg-white/3 transition-colors active:bg-white/5 border-b border-white/5 last:border-b-0 flex items-start gap-3"
                  >
                    <div className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${meta.bg}`}>
                      <meta.Icon size={11} className="text-ivory" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-body text-ivory truncate">{entry.title}</p>
                      <p className="text-xs text-ivory-dim font-body mt-0.5">
                        {meta.label} &middot; {new Date(entry.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight size={13} className="text-ivory-dim mt-1 shrink-0" />
                  </button>
                )
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DossierMap() {
  const navigate = useNavigate()
  const [entries, setEntries] = useState<EntryWithParticipants[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCity, setSelectedCity] = useState<CityGroup | null>(null)

  useEffect(() => {
    fetchEntries()
      .then(setEntries)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const countryGroups = useMemo(() => groupByLocation(entries), [entries])

  const stats = useMemo(() => {
    const countries = countryGroups.length
    const cities = countryGroups.reduce((sum, c) => sum + c.cities.length, 0)
    const plotted = entries.filter((e) => e.city || e.country).length
    return { countries, cities, plotted }
  }, [countryGroups, entries])

  return (
    <>
      <TopBar title="The Dossier" back />
      <PageWrapper scrollable>
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Spinner size="lg" />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col pb-16"
          >
            {/* Map visualisation notice */}
            <motion.div variants={staggerItem} className="mb-5">
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-mid border border-white/5 rounded-xl text-xs text-ivory-dim font-body leading-relaxed">
                <Globe size={13} className="text-gold shrink-0" />
                <span>
                  Map visualisation &mdash; install{' '}
                  <span className="font-mono text-ivory">leaflet</span> for the interactive map view.
                </span>
              </div>
            </motion.div>

            {/* Stats strip */}
            <motion.div variants={staggerItem} className="mb-7">
              <div className="bg-slate-dark border border-white/8 rounded-2xl px-6 py-5 flex items-center justify-around">
                <StatBlock value={stats.countries} label="Countries" />
                <div className="w-px h-8 bg-white/10" />
                <StatBlock value={stats.cities} label="Cities" />
                <div className="w-px h-8 bg-white/10" />
                <StatBlock value={stats.plotted} label="Plotted" />
              </div>
            </motion.div>

            {/* Location list */}
            {countryGroups.length === 0 ? (
              <motion.div variants={fadeIn} className="flex flex-col items-center gap-3 py-20 text-center">
                <MapPin size={32} className="text-ivory-dim" />
                <p className="text-sm text-ivory-dim font-body">No locations logged yet.</p>
                <p className="text-xs text-ivory-dim font-body max-w-[220px] leading-relaxed">
                  Entries with a city or country will appear here once published.
                </p>
              </motion.div>
            ) : (
              <div className="flex flex-col gap-5">
                {countryGroups.map((countryGroup, i) => (
                  <motion.section
                    key={countryGroup.country}
                    variants={fadeUp}
                    custom={i}
                  >
                    {/* Country header */}
                    <div className="flex items-center justify-between mb-1 px-1">
                      <div className="flex items-center gap-2">
                        <div className="w-0.5 h-4 bg-gold rounded-full" />
                        <h2 className="text-xs tracking-[0.22em] uppercase font-body text-gold font-semibold">
                          {flagEmoji(countryGroup.country_code)} {countryGroup.country}
                        </h2>
                      </div>
                      <span className="text-[10px] text-ivory-dim font-mono tabular-nums">
                        {countryGroup.totalEntries} {countryGroup.totalEntries === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>

                    {/* Cities */}
                    <div className="bg-slate-dark border border-white/8 rounded-2xl overflow-hidden divide-y divide-white/5">
                      {countryGroup.cities.map((cityGroup) => (
                        <CityRow
                          key={cityGroup.city}
                          cityGroup={cityGroup}
                          onSelect={setSelectedCity}
                        />
                      ))}
                    </div>
                  </motion.section>
                ))}
              </div>
            )}

            {/* Entries without location */}
            {(() => {
              const unplotted = entries.filter((e) => !e.city && !e.country)
              if (unplotted.length === 0) return null
              return (
                <motion.div variants={fadeUp} className="mt-5">
                  <div className="flex items-center gap-2 px-1 mb-1">
                    <div className="w-0.5 h-4 bg-white/20 rounded-full" />
                    <h2 className="text-xs tracking-[0.22em] uppercase font-body text-ivory-dim">
                      Unplotted
                    </h2>
                    <span className="text-[10px] text-ivory-dim font-mono tabular-nums ml-auto">
                      {unplotted.length}
                    </span>
                  </div>
                  <div className="bg-slate-dark border border-white/8 rounded-2xl px-4 py-3">
                    <p className="text-xs text-ivory-dim font-body leading-relaxed">
                      {unplotted.length} {unplotted.length === 1 ? 'entry has' : 'entries have'} no location data and {unplotted.length === 1 ? 'is' : 'are'} not shown on the map.
                    </p>
                  </div>
                </motion.div>
              )
            })()}
          </motion.div>
        )}
      </PageWrapper>

      {/* City side panel */}
      <SidePanel
        cityGroup={selectedCity}
        onClose={() => setSelectedCity(null)}
        onEntryClick={(id) => {
          setSelectedCity(null)
          navigate(`/chronicle/${id}`)
        }}
      />
    </>
  )
}
