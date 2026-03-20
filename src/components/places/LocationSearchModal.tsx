import { useState, useCallback, useRef, useEffect } from 'react'
import { X, Search, MapPin, Loader2, Navigation } from 'lucide-react'
import type { LocationFill } from '@/lib/geo'
import { getDevicePosition } from '@/lib/geo'
import type { SavedLocation } from '@/types/app'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface NearbyPlace {
  placeId: string
  name: string
  vicinity: string
}

interface PlaceResult {
  placeId: string
  name: string
  address: string
  city?: string
  country?: string
  countryCode?: string
}

interface LocationSearchModalProps {
  onSelect: (fill: LocationFill) => void
  onClose: () => void
  savedPlaces?: SavedLocation[]
}

/**
 * Full-screen modal with Google Places Autocomplete search.
 * Similar to Instagram's location picker.
 */
export function LocationSearchModal({ onSelect, onClose, savedPlaces }: LocationSearchModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PlaceResult[]>([])
  const [loading, setLoading] = useState(false)
  const [resolving, setResolving] = useState<string | null>(null)
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([])
  const [nearbyLoading, setNearbyLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Auto-focus input
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  // Fetch nearby places on mount
  useEffect(() => {
    if (!GOOGLE_MAPS_KEY) return
    setNearbyLoading(true)
    getDevicePosition().then(async (pos) => {
      if (!pos) { setNearbyLoading(false); return }
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${pos.lat},${pos.lng}&radius=300&type=restaurant|bar|cafe|night_club|movie_theater|gym|hotel|museum|park|shopping_mall&key=${GOOGLE_MAPS_KEY}`,
          { signal: AbortSignal.timeout(5000) },
        )
        if (!res.ok) { setNearbyLoading(false); return }
        const data = await res.json()
        if (data.status === 'OK' && data.results?.length) {
          setNearbyPlaces(
            data.results.slice(0, 10).map((p: { place_id: string; name: string; vicinity?: string }) => ({
              placeId: p.place_id,
              name: p.name,
              vicinity: p.vicinity ?? '',
            }))
          )
        }
      } catch { /* silent */ }
      setNearbyLoading(false)
    }).catch(() => setNearbyLoading(false))
  }, [])

  const searchPlaces = useCallback(async (text: string) => {
    if (!text.trim() || !GOOGLE_MAPS_KEY) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        'https://places.googleapis.com/v1/places:autocomplete',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
          },
          body: JSON.stringify({
            input: text,
            languageCode: 'en',
          }),
          signal: AbortSignal.timeout(5000),
        },
      )

      if (!res.ok) {
        setResults([])
        return
      }

      const data = await res.json()
      const suggestions: PlaceResult[] = (data.suggestions ?? [])
        .filter((s: { placePrediction?: unknown }) => s.placePrediction)
        .slice(0, 8)
        .map((s: { placePrediction: { placeId: string; structuredFormat?: { mainText?: { text: string }; secondaryText?: { text: string } }; text?: { text: string } } }) => ({
          placeId: s.placePrediction.placeId,
          name: s.placePrediction.structuredFormat?.mainText?.text ?? '',
          address: s.placePrediction.structuredFormat?.secondaryText?.text ?? s.placePrediction.text?.text ?? '',
        }))

      setResults(suggestions)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  function handleQueryChange(value: string) {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => searchPlaces(value), 300)
  }

  async function selectPlace(place: PlaceResult) {
    setResolving(place.placeId)
    try {
      // Fetch place details to get city, country, coords
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${place.placeId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': GOOGLE_MAPS_KEY,
            'X-Goog-FieldMask': 'displayName,formattedAddress,location,addressComponents',
          },
          signal: AbortSignal.timeout(5000),
        },
      )

      if (!res.ok) {
        // Fallback: use what we have from autocomplete
        onSelect({
          location: place.name,
          overwrite: true,
        })
        onClose()
        return
      }

      const detail = await res.json()
      let city: string | undefined
      let country: string | undefined
      let countryCode: string | undefined

      for (const comp of detail.addressComponents ?? []) {
        const types: string[] = comp.types ?? []
        if (types.includes('locality')) {
          city = comp.longText ?? comp.shortText
        } else if (!city && types.includes('administrative_area_level_1')) {
          // Use admin area as fallback city
          city = comp.longText ?? comp.shortText
        }
        if (types.includes('country')) {
          country = comp.longText ?? comp.shortText
          countryCode = comp.shortText
        }
      }

      onSelect({
        location: detail.displayName?.text ?? place.name,
        city,
        country,
        country_code: countryCode,
        lat: detail.location?.latitude,
        lng: detail.location?.longitude,
        overwrite: true,
      })
      onClose()
    } catch {
      // On error, use basic info
      onSelect({
        location: place.name,
        overwrite: true,
      })
      onClose()
    } finally {
      setResolving(null)
    }
  }

  function selectSavedPlace(place: SavedLocation) {
    onSelect({
      location: place.name,
      city: place.city,
      country: place.country,
      country_code: place.country_code,
      lat: place.lat ?? undefined,
      lng: place.lng ?? undefined,
      overwrite: true,
    })
    onClose()
  }

  async function selectNearbyPlace(place: NearbyPlace) {
    // Reuse the same place details resolution as autocomplete results
    await selectPlace({ placeId: place.placeId, name: place.name, address: place.vicinity })
  }

  const showSavedPlaces = !query.trim() && savedPlaces && savedPlaces.length > 0
  const showNearby = !query.trim() && nearbyPlaces.length > 0

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-obsidian">
      {/* Header with search */}
      <div className="shrink-0 border-b border-white/8 bg-slate-dark">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="text-ivory-dim hover:text-ivory transition-colors shrink-0"
          >
            <X size={20} />
          </button>
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-ivory-dim" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search for a place..."
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2.5 text-sm text-ivory font-body placeholder:text-ivory-dim/50 focus:outline-none focus:border-gold/40 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={18} className="animate-spin text-gold" />
          </div>
        )}

        {/* Search results */}
        {!loading && results.length > 0 && (
          <div className="flex flex-col">
            {results.map((place) => (
              <button
                key={place.placeId}
                type="button"
                onClick={() => selectPlace(place)}
                disabled={resolving === place.placeId}
                className="flex items-start gap-3 px-4 py-3.5 border-b border-white/5 text-left hover:bg-white/3 active:bg-white/5 transition-colors disabled:opacity-50"
              >
                <MapPin size={16} className="text-gold mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-ivory text-sm font-body truncate">{place.name}</p>
                  <p className="text-ivory-dim text-xs font-body truncate mt-0.5">{place.address}</p>
                </div>
                {resolving === place.placeId && (
                  <Loader2 size={14} className="animate-spin text-gold mt-1 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && query.trim() && results.length === 0 && (
          <div className="px-4 py-8 text-center">
            <p className="text-ivory-dim text-sm font-body">No places found</p>
          </div>
        )}

        {/* Nearby places (shown when no query) */}
        {!query.trim() && nearbyLoading && (
          <div className="flex items-center gap-2 px-4 py-4">
            <Loader2 size={14} className="animate-spin text-gold/60" />
            <span className="text-ivory-dim text-xs font-body">Finding nearby places...</span>
          </div>
        )}
        {showNearby && (
          <div className="flex flex-col">
            <p className="px-4 pt-4 pb-2 text-ivory-dim text-[10px] uppercase tracking-widest font-body flex items-center gap-1.5">
              <Navigation size={10} className="text-gold/50" />
              Nearby
            </p>
            {nearbyPlaces.map((place) => (
              <button
                key={place.placeId}
                type="button"
                onClick={() => selectNearbyPlace(place)}
                disabled={resolving === place.placeId}
                className="flex items-start gap-3 px-4 py-3 border-b border-white/5 text-left hover:bg-white/3 active:bg-white/5 transition-colors disabled:opacity-50"
              >
                <MapPin size={16} className="text-gold mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-ivory text-sm font-body truncate">{place.name}</p>
                  <p className="text-ivory-dim text-xs font-body truncate mt-0.5">{place.vicinity}</p>
                </div>
                {resolving === place.placeId && (
                  <Loader2 size={14} className="animate-spin text-gold mt-1 shrink-0" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Saved places (shown when no query) */}
        {showSavedPlaces && (
          <div className="flex flex-col">
            <p className="px-4 pt-4 pb-2 text-ivory-dim text-[10px] uppercase tracking-widest font-body">
              Saved Places
            </p>
            {savedPlaces.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => selectSavedPlace(place)}
                className="flex items-start gap-3 px-4 py-3 border-b border-white/5 text-left hover:bg-white/3 active:bg-white/5 transition-colors"
              >
                <MapPin size={16} className="text-gold/60 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-ivory text-sm font-body truncate">{place.name}</p>
                  <p className="text-ivory-dim text-xs font-body truncate mt-0.5">
                    {place.city}, {place.country}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
