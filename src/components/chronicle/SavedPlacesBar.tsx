import { useNavigate } from 'react-router'
import { Utensils, Wine, Home, MapPin, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SavedLocation, LocationType } from '@/types/app'
import type { LocationFill } from '@/lib/geo'

const TYPE_ICON: Record<LocationType, React.ElementType> = {
  restaurant: Utensils,
  bar: Wine,
  home: Home,
  venue: MapPin,
  other: MapPin,
}

interface SavedPlacesBarProps {
  places: SavedLocation[]
  onSelect: (fill: LocationFill) => void
}

export function SavedPlacesBar({ places, onSelect }: SavedPlacesBarProps) {
  const navigate = useNavigate()

  if (places.length === 0) return null

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-ivory-dim text-[10px] uppercase tracking-widest font-body">Saved Places</p>
      <div className="flex gap-2 overflow-x-auto scrollbar-none pb-0.5 -mx-4 px-4">
        {places.map((place) => {
          const Icon = TYPE_ICON[place.type]
          return (
            <button
              key={place.id}
              type="button"
              onClick={() =>
                onSelect({
                  location: place.name,
                  city: place.city,
                  country: place.country,
                  country_code: place.country_code,
                  overwrite: true,
                })
              }
              className={cn(
                'shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-body',
                'border-white/15 bg-slate-mid text-ivory-muted',
                'hover:border-gold/40 hover:text-ivory transition-colors',
              )}
            >
              <Icon size={11} className="text-gold-muted shrink-0" />
              <span className="whitespace-nowrap">{place.name}</span>
            </button>
          )
        })}

        {/* Manage link */}
        <button
          type="button"
          onClick={() => navigate('/places')}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-white/10 text-ivory-dim text-xs font-body hover:border-white/25 hover:text-ivory-muted transition-colors"
        >
          <Settings size={10} />
          <span>Manage</span>
        </button>
      </div>
    </div>
  )
}
