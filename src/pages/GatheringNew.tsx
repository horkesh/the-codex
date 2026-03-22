import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { X, Plus, MapPin, Crosshair } from 'lucide-react'
import { TopBar, PageWrapper } from '@/components/layout'
import { Button, Input, DatePicker } from '@/components/ui'
import { PizzaMenuBuilder } from '@/components/gathering/PizzaMenuBuilder'
import { LocationSearchModal } from '@/components/places/LocationSearchModal'
import { MapPicker } from '@/components/places/MapPicker'
import { buildStaticMapUrl } from '@/export/templates/shared/utils'
import { reverseGeocode } from '@/lib/geo'
import { createEntry, updateEntry } from '@/data/entries'
import { fetchLocations } from '@/data/locations'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { cn } from '@/lib/utils'
import type { GatheringMetadata, PizzaMenuItem, SavedLocation } from '@/types/app'
import type { LocationFill } from '@/lib/geo'

export default function GatheringNew() {
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const { addToast } = useUIStore()

  // Core fields
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [location, setLocation] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')

  // Cocktail menu
  const [cocktailInput, setCocktailInput] = useState('')
  const [cocktails, setCocktails] = useState<string[]>([])

  // Guest list
  const [guestInput, setGuestInput] = useState('')
  const [guests, setGuests] = useState<string[]>([])

  // Pizza party
  const [flavour, setFlavour] = useState<'pizza_party' | undefined>(undefined)
  const [pizzaMenu, setPizzaMenu] = useState<PizzaMenuItem[]>([])

  // Location modal + map picker
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [showMapPicker, setShowMapPicker] = useState(false)
  const [venue, setVenue] = useState('')
  const [address, setAddress] = useState('')
  const [lat, setLat] = useState<number | undefined>()
  const [lng, setLng] = useState<number | undefined>()
  const [savedPlaces, setSavedPlaces] = useState<SavedLocation[]>([])

  useEffect(() => { fetchLocations().then(setSavedPlaces) }, [])

  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ title?: string; eventDate?: string; location?: string }>({})

  function addCocktail() {
    const trimmed = cocktailInput.trim()
    if (!trimmed) return
    if (!cocktails.includes(trimmed)) {
      setCocktails(prev => [...prev, trimmed])
    }
    setCocktailInput('')
  }

  function removeCocktail(name: string) {
    setCocktails(prev => prev.filter(c => c !== name))
  }

  function addGuest() {
    const trimmed = guestInput.trim()
    if (!trimmed) return
    if (!guests.includes(trimmed)) {
      setGuests(prev => [...prev, trimmed])
    }
    setGuestInput('')
  }

  function removeGuest(name: string) {
    setGuests(prev => prev.filter(g => g !== name))
  }

  function handleLocationSelect(fill: LocationFill) {
    if (fill.location) { setLocation(fill.location); setVenue(fill.location) }
    if (fill.address) setAddress(fill.address)
    if (fill.city) setCity(fill.city)
    if (fill.lat) setLat(fill.lat)
    if (fill.lng) setLng(fill.lng)
    setShowLocationModal(false)
  }

  async function handlePinConfirm(pinLat: number, pinLng: number) {
    setLat(pinLat)
    setLng(pinLng)
    setShowMapPicker(false)
    // Reverse geocode to get city/country
    try {
      const addr = await reverseGeocode(pinLat, pinLng)
      if (addr) {
        if (addr.city) setCity(addr.city)
        if (!venue) setVenue(addr.city ?? 'Pinned Location')
        setLocation(addr.city ?? 'Pinned Location')
        if (addr.address) setAddress(addr.address)
      }
    } catch { /* silent — coords are enough */ }
  }

  function validate(): boolean {
    const errs: typeof errors = {}
    if (!title.trim()) errs.title = 'Title is required'
    if (!eventDate) errs.eventDate = 'Event date is required'
    if (!venue && !location.trim()) errs.location = 'Location is required'
    if (flavour === 'pizza_party' && pizzaMenu.length === 0) errs.title = 'Add at least one pizza'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!gent) return
    if (!validate()) return

    setSubmitting(true)

    try {
      const metadata: GatheringMetadata = {
        event_date: eventDate,
        location: (venue || location).trim(),
        guest_list: guests.map(name => ({
          name,
          person_id: null,
          rsvp_status: 'pending' as const,
        })),
        cocktail_menu: flavour === 'pizza_party' ? [] : cocktails,
        invite_image_url: null,
        rsvp_link: null,
        qr_code_url: null,
        guest_book_count: 0,
        phase: 'pre',
        flavour,
        pizza_menu: flavour === 'pizza_party' ? pizzaMenu : undefined,
        venue: venue || undefined,
        address: address || undefined,
        lat,
        lng,
      }

      const entry = await createEntry({
        type: 'gathering',
        title: title.trim(),
        date: eventDate,
        location: (venue || location).trim() || undefined,
        city: city.trim() || undefined,
        description: description.trim() || undefined,
        metadata: metadata as unknown as Record<string, unknown>,
        created_by: gent.id,
      })

      // createEntry defaults to 'published' — patch to gathering_pre
      await updateEntry(entry.id, { status: 'gathering_pre' })

      addToast('Gathering created', 'success')
      navigate(`/gathering/${entry.id}`)
    } catch (err) {
      console.error('Failed to create gathering:', err)
      addToast('Something went wrong. Please try again.', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <TopBar title="New Gathering" back />
      <PageWrapper>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6 pb-4">

          {/* Title */}
          <Input
            label="Title"
            placeholder="The Budapest Summit"
            value={title}
            onChange={e => setTitle(e.target.value)}
            error={errors.title}
          />

          {/* Flavour */}
          <div className="flex gap-2">
            {([undefined, 'pizza_party'] as const).map(f => (
              <button key={f ?? 'regular'} type="button"
                onClick={() => { setFlavour(f); if (f !== 'pizza_party') setPizzaMenu([]) }}
                className={cn(
                  'flex-1 py-2 rounded-lg text-xs font-body transition-all border',
                  flavour === f ? 'bg-gold/15 border-gold/50 text-gold' : 'bg-white/5 border-white/10 text-ivory-dim hover:border-white/20',
                )}
              >
                {f === 'pizza_party' ? 'Pizza Party' : 'Regular'}
              </button>
            ))}
          </div>

          {/* Event Date */}
          <DatePicker
            label="Event Date"
            value={eventDate}
            onChange={v => setEventDate(v)}
            error={errors.eventDate}
          />

          {/* Location */}
          <div className="flex flex-col gap-2">
            <label className="text-ivory-muted text-xs uppercase tracking-widest font-body">
              Location
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowLocationModal(true)}
                className={cn(
                  'flex-1 flex items-center gap-2 h-10 bg-slate-mid border text-sm font-body',
                  'rounded-[--radius-md] px-3 transition-colors text-left',
                  venue || location.trim()
                    ? 'border-white/10 text-ivory'
                    : 'border-white/10 text-ivory-dim/50',
                  errors.location && 'border-red-500/50',
                )}
              >
                <MapPin size={14} className="text-gold shrink-0" />
                <span className="truncate">{venue || location.trim() || 'Search a place'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowMapPicker(true)}
                className="h-10 w-10 shrink-0 flex items-center justify-center bg-slate-mid border border-white/10 rounded-[--radius-md] text-ivory-dim hover:text-gold hover:border-gold/30 transition-colors"
                title="Drop a pin on map"
              >
                <Crosshair size={16} />
              </button>
            </div>
            {address && (
              <p className="text-[10px] text-ivory-dim/60 font-body">{address}</p>
            )}
            {lat && lng && (
              <img
                src={buildStaticMapUrl(lat, lng, { width: 400, height: 120 })}
                alt="Map preview"
                className="w-full h-24 object-cover rounded-lg mt-1"
              />
            )}
            {errors.location && (
              <p className="text-red-400 text-xs font-body">{errors.location}</p>
            )}
          </div>

          {/* City */}
          <Input
            label="City"
            placeholder="Paris"
            value={city}
            onChange={e => setCity(e.target.value)}
          />

          {/* Description */}
          <Input
            as="textarea"
            label="Description"
            placeholder="What is this gathering about?"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />

          {/* Pizza Menu (pizza party only) */}
          {flavour === 'pizza_party' && <PizzaMenuBuilder pizzas={pizzaMenu} onChange={setPizzaMenu} />}

          {/* Cocktail Menu (regular only) */}
          {flavour !== 'pizza_party' && <div className="flex flex-col gap-2">
            <label className="text-ivory-muted text-xs uppercase tracking-widest font-body">
              Cocktail Menu
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Negroni"
                value={cocktailInput}
                onChange={e => setCocktailInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCocktail()
                  }
                }}
                className={cn(
                  'flex-1 h-10 bg-slate-mid border border-white/10 text-ivory font-body text-sm',
                  'placeholder:text-ivory-dim focus:outline-none focus:border-gold/60 focus:ring-2',
                  'focus:ring-gold/20 transition-colors duration-200 rounded-[--radius-md] px-3',
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addCocktail}
                className="shrink-0 h-10 px-3"
              >
                <Plus size={16} />
                Add
              </Button>
            </div>
            {cocktails.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-1">
                {cocktails.map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-light border border-white/10 text-ivory font-body text-xs"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={() => removeCocktail(name)}
                      className="text-ivory-dim hover:text-ivory transition-colors"
                      aria-label={`Remove ${name}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>}

          {/* Guest List */}
          <div className="flex flex-col gap-2">
            <label className="text-ivory-muted text-xs uppercase tracking-widest font-body">
              Guest List
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Guest name"
                value={guestInput}
                onChange={e => setGuestInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addGuest()
                  }
                }}
                className={cn(
                  'flex-1 h-10 bg-slate-mid border border-white/10 text-ivory font-body text-sm',
                  'placeholder:text-ivory-dim focus:outline-none focus:border-gold/60 focus:ring-2',
                  'focus:ring-gold/20 transition-colors duration-200 rounded-[--radius-md] px-3',
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addGuest}
                className="shrink-0 h-10 px-3"
              >
                <Plus size={16} />
                Add
              </Button>
            </div>
            {guests.length > 0 && (
              <ul className="flex flex-col gap-1 mt-1">
                {guests.map(name => (
                  <li
                    key={name}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-light border border-white/8"
                  >
                    <span className="font-body text-sm text-ivory">{name}</span>
                    <button
                      type="button"
                      onClick={() => removeGuest(name)}
                      className="text-ivory-dim hover:text-ivory transition-colors"
                      aria-label={`Remove ${name}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2">
            <Button
              type="submit"
              fullWidth
              loading={submitting}
              size="lg"
            >
              Create Gathering
            </Button>
          </div>

        </form>
      </PageWrapper>

      {showLocationModal && (
        <LocationSearchModal
          onSelect={handleLocationSelect}
          onClose={() => setShowLocationModal(false)}
          savedPlaces={savedPlaces}
          onDropPin={() => setShowMapPicker(true)}
        />
      )}
      {showMapPicker && (
        <MapPicker
          lat={lat}
          lng={lng}
          onConfirm={handlePinConfirm}
          onClose={() => setShowMapPicker(false)}
        />
      )}
    </>
  )
}
