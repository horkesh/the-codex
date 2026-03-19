import { useState, useCallback, useEffect } from 'react'
import { APIProvider, Map, AdvancedMarker, useMap } from '@vis.gl/react-google-maps'
import { X, Check } from 'lucide-react'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface MapPickerProps {
  lat?: number | null
  lng?: number | null
  onConfirm: (lat: number, lng: number) => void
  onClose: () => void
}

// Default center: Sarajevo
const DEFAULT_LAT = 43.8563
const DEFAULT_LNG = 18.4131

function MapContent({ lat, lng, onConfirm, onClose }: MapPickerProps) {
  const map = useMap()
  const [pinLat, setPinLat] = useState(lat ?? DEFAULT_LAT)
  const [pinLng, setPinLng] = useState(lng ?? DEFAULT_LNG)

  const handleClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      setPinLat(e.latLng.lat())
      setPinLng(e.latLng.lng())
    }
  }, [])

  useEffect(() => {
    if (!map) return
    const listener = map.addListener('click', handleClick)
    return () => google.maps.event.removeListener(listener)
  }, [map, handleClick])

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-obsidian" style={{ touchAction: 'none' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-dark border-b border-white/8 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-1.5 text-ivory-dim hover:text-ivory text-sm font-body transition-colors"
        >
          <X size={15} />
          Cancel
        </button>
        <p className="text-ivory text-sm font-body font-medium">Pin Location</p>
        <button
          type="button"
          onClick={() => onConfirm(pinLat, pinLng)}
          className="flex items-center gap-1.5 text-gold hover:text-gold-light text-sm font-body font-semibold transition-colors"
        >
          <Check size={15} />
          Confirm
        </button>
      </div>

      {/* Instruction */}
      <div className="px-4 py-2 bg-slate-dark border-b border-white/6 shrink-0">
        <p className="text-ivory-dim text-xs font-body text-center">
          Tap to place pin
        </p>
      </div>

      {/* Map */}
      <div className="flex-1">
        <Map
          defaultCenter={{ lat: lat ?? DEFAULT_LAT, lng: lng ?? DEFAULT_LNG }}
          defaultZoom={lat != null ? 16 : 13}
          gestureHandling="greedy"
          disableDefaultUI
          zoomControl
          mapId="codex-map-picker"
          colorScheme="DARK"
          style={{ width: '100%', height: '100%' }}
        >
          <AdvancedMarker position={{ lat: pinLat, lng: pinLng }} />
        </Map>
      </div>

      {/* Coordinates footer */}
      <div className="px-4 py-2.5 bg-slate-dark border-t border-white/8 shrink-0">
        <p className="text-ivory-dim text-xs font-mono text-center tracking-wide">
          {pinLat.toFixed(5)}, {pinLng.toFixed(5)}
        </p>
      </div>
    </div>
  )
}

export function MapPicker(props: MapPickerProps) {
  return (
    <APIProvider apiKey={GOOGLE_MAPS_KEY}>
      <MapContent {...props} />
    </APIProvider>
  )
}
