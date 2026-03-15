import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Pencil, Trash2, Utensils, Wine, Home, MapPin, LocateFixed, Map } from 'lucide-react'
import { TopBar, PageWrapper } from '@/components/layout'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { MapPicker } from '@/components/places/MapPicker'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { fetchLocations, createLocation, updateLocation, deleteLocation } from '@/data/locations'
import { reverseGeocode } from '@/lib/geo'
import { staggerContainer, staggerItem, fadeUp } from '@/lib/animations'
import { cn } from '@/lib/utils'
import type { SavedLocation, LocationType } from '@/types/app'

const TYPES: { value: LocationType; label: string; Icon: React.ElementType }[] = [
  { value: 'restaurant', label: 'Restaurant', Icon: Utensils },
  { value: 'bar',        label: 'Bar',        Icon: Wine },
  { value: 'home',       label: 'Home',       Icon: Home },
  { value: 'venue',      label: 'Venue',      Icon: MapPin },
  { value: 'other',      label: 'Other',      Icon: MapPin },
]

const TYPE_ICON: Record<LocationType, React.ElementType> = {
  restaurant: Utensils,
  bar: Wine,
  home: Home,
  venue: MapPin,
  other: MapPin,
}

interface PlaceForm {
  name: string
  type: LocationType
  city: string
  country: string
  country_code: string
  address: string
  lat: number | null
  lng: number | null
}

const emptyForm: PlaceForm = {
  name: '',
  type: 'restaurant',
  city: '',
  country: '',
  country_code: '',
  address: '',
  lat: null,
  lng: null,
}

export default function Places() {
  const { gent } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)

  const [places, setPlaces] = useState<SavedLocation[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SavedLocation | null>(null)
  const [form, setForm] = useState<PlaceForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [mapPickerOpen, setMapPickerOpen] = useState(false)

  useEffect(() => {
    fetchLocations().then((data) => { setPlaces(data); setLoading(false) })
  }, [])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  function openEdit(place: SavedLocation) {
    setEditing(place)
    setForm({
      name: place.name,
      type: place.type,
      city: place.city,
      country: place.country,
      country_code: place.country_code,
      address: place.address ?? '',
      lat: place.lat,
      lng: place.lng,
    })
    setModalOpen(true)
  }

  function setField<K extends keyof PlaceForm>(key: K, value: PlaceForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleGPS() {
    if (!navigator.geolocation) {
      addToast('GPS not available on this device.', 'error')
      return
    }
    setGpsLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          const geo = await reverseGeocode(latitude, longitude)
          setForm((prev) => ({
            ...prev,
            city: geo?.city || prev.city,
            country: geo?.country || prev.country,
            country_code: geo?.country_code || prev.country_code,
            address: geo?.address || prev.address,
            lat: latitude,
            lng: longitude,
          }))
        } catch {
          addToast('Could not reverse-geocode location.', 'error')
        } finally {
          setGpsLoading(false)
        }
      },
      () => {
        addToast('GPS permission denied.', 'error')
        setGpsLoading(false)
      },
      { timeout: 10000 },
    )
  }

  async function handleMapConfirm(lat: number, lng: number) {
    setMapPickerOpen(false)
    setForm((prev) => ({ ...prev, lat, lng }))
    const geo = await reverseGeocode(lat, lng)
    if (geo) {
      setForm((prev) => ({
        ...prev,
        city: prev.city || geo.city || '',
        country: prev.country || geo.country || '',
        country_code: prev.country_code || geo.country_code || '',
        address: prev.address || geo.address || '',
      }))
    }
  }

  async function handleSave() {
    if (!gent) return
    if (!form.name.trim() || !form.city.trim() || !form.country.trim()) {
      addToast('Name, city and country are required.', 'error')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        const updated = await updateLocation(editing.id, {
          name: form.name.trim(),
          type: form.type,
          city: form.city.trim(),
          country: form.country.trim(),
          country_code: form.country_code.trim().toUpperCase(),
          address: form.address.trim() || null,
          lat: form.lat,
          lng: form.lng,
        })
        setPlaces((prev) => prev.map((p) => (p.id === editing.id ? updated : p)))
        addToast('Place updated.', 'success')
      } else {
        const created = await createLocation({
          name: form.name.trim(),
          type: form.type,
          city: form.city.trim(),
          country: form.country.trim(),
          country_code: form.country_code.trim().toUpperCase(),
          address: form.address.trim() || null,
          lat: form.lat,
          lng: form.lng,
          created_by: gent.id,
        })
        setPlaces((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)))
        addToast('Place saved.', 'success')
      }
      setModalOpen(false)
    } catch {
      addToast('Failed to save place.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id)
    try {
      await deleteLocation(id)
      setPlaces((prev) => prev.filter((p) => p.id !== id))
      addToast('Place removed.', 'success')
    } catch {
      addToast('Failed to delete.', 'error')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <TopBar title="Saved Places" back />
      <PageWrapper padded scrollable className="pb-24">
        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner size="md" />
          </div>
        ) : (
          <motion.div
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="flex flex-col gap-3 pt-2"
          >
            {places.length === 0 && (
              <motion.p variants={staggerItem} className="text-ivory-dim text-sm font-body text-center py-12">
                No saved places yet. Add your regulars.
              </motion.p>
            )}

            {places.map((place) => {
              const Icon = TYPE_ICON[place.type]
              return (
                <motion.div
                  key={place.id}
                  variants={staggerItem}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-mid border border-white/6"
                >
                  <div className="w-8 h-8 rounded-md bg-gold/10 flex items-center justify-center shrink-0">
                    <Icon size={14} className="text-gold" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-ivory text-sm font-body font-medium truncate">{place.name}</p>
                    <p className="text-ivory-dim text-xs font-body truncate">
                      {[place.city, place.country].filter(Boolean).join(', ')}
                      {place.lat != null && (
                        <span className="ml-1.5 text-gold/50">
                          <LocateFixed size={10} className="inline" />
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(place)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-ivory-dim hover:text-ivory hover:bg-white/8 transition-colors"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(place.id)}
                      disabled={deleting === place.id}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-ivory-dim hover:text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                    >
                      {deleting === place.id ? <Spinner size="sm" /> : <Trash2 size={13} />}
                    </button>
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </PageWrapper>

      {/* Add FAB */}
      <motion.button
        type="button"
        aria-label="Add place"
        onClick={openAdd}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
        whileTap={{ scale: 0.92 }}
        className="fixed right-4 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-gold text-obsidian shadow-[0_0_40px_rgba(201,168,76,0.3)]"
        style={{ bottom: '90px' }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </motion.button>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-obsidian/80 backdrop-blur-sm flex items-end"
            onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}
          >
            <motion.div
              variants={fadeUp}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full bg-slate-dark rounded-t-2xl border-t border-white/8 p-6 pb-safe max-h-[90vh] overflow-y-auto"
            >
              <h2 className="font-display text-lg text-ivory mb-5">
                {editing ? 'Edit Place' : 'New Place'}
              </h2>

              <div className="flex flex-col gap-4">
                {/* Type selector */}
                <div>
                  <p className="text-ivory-dim text-xs uppercase tracking-widest font-body mb-2">Type</p>
                  <div className="flex gap-2 flex-wrap">
                    {TYPES.map(({ value, label, Icon }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setField('type', value)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-body border transition-colors',
                          form.type === value
                            ? 'bg-gold/20 border-gold/60 text-gold'
                            : 'border-white/15 text-ivory-muted hover:border-white/30',
                        )}
                      >
                        <Icon size={11} />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Name"
                  placeholder="e.g. Asdal Golf"
                  value={form.name}
                  onChange={(e) => setField('name', e.target.value)}
                  required
                />

                {/* Location controls */}
                <div className="flex flex-col gap-2">
                  <p className="text-ivory-dim text-xs uppercase tracking-widest font-body">Pin location</p>

                  {/* Map preview when coords are set */}
                  {form.lat != null && form.lng != null && (
                    <div
                      className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer h-32"
                      onClick={() => setMapPickerOpen(true)}
                    >
                      <iframe
                        title="map-preview"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${form.lng - 0.003},${form.lat - 0.002},${form.lng + 0.003},${form.lat + 0.002}&layer=mapnik&marker=${form.lat},${form.lng}`}
                        className="w-full h-full pointer-events-none"
                        style={{ border: 0 }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-obsidian/0 hover:bg-obsidian/20 transition-colors">
                        <div className="bg-obsidian/70 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1.5">
                          <Map size={11} className="text-gold" />
                          <span className="text-ivory text-xs font-body">Adjust pin</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMapPickerOpen(true)}
                      className="flex items-center gap-2 text-sm font-body text-gold hover:text-gold-light transition-colors"
                    >
                      <Map size={14} />
                      {form.lat != null ? 'Reposition on map' : 'Pin on map'}
                    </button>
                    <span className="text-ivory-dim/40 text-sm">·</span>
                    <button
                      type="button"
                      onClick={handleGPS}
                      disabled={gpsLoading}
                      className="flex items-center gap-2 text-sm font-body text-ivory-dim hover:text-ivory transition-colors disabled:opacity-50"
                    >
                      {gpsLoading ? <Spinner size="sm" /> : <LocateFixed size={14} />}
                      {gpsLoading ? 'Getting…' : 'Use GPS'}
                    </button>
                  </div>

                  {form.lat != null && form.lng != null && (
                    <p className="text-ivory-dim text-[11px] font-mono">
                      {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="City"
                    placeholder="Sarajevo"
                    value={form.city}
                    onChange={(e) => setField('city', e.target.value)}
                    required
                  />
                  <Input
                    label="Country"
                    placeholder="Bosnia"
                    value={form.country}
                    onChange={(e) => setField('country', e.target.value)}
                    required
                  />
                </div>

                <Input
                  label="Country Code"
                  placeholder="BA"
                  value={form.country_code}
                  onChange={(e) => setField('country_code', e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  hint="2-letter ISO code"
                />

                <Input
                  label="Address"
                  placeholder="Street name (optional)"
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                />

                <div className="flex gap-3 pt-2">
                  <Button variant="ghost" fullWidth onClick={() => setModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" fullWidth loading={saving} onClick={handleSave}>
                    {editing ? 'Update' : 'Save Place'}
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Map picker overlay */}
      {mapPickerOpen && (
        <MapPicker
          lat={form.lat}
          lng={form.lng}
          onConfirm={handleMapConfirm}
          onClose={() => setMapPickerOpen(false)}
        />
      )}
    </>
  )
}
