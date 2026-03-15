import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import { X, Check } from 'lucide-react'

interface MapPickerProps {
  lat?: number | null
  lng?: number | null
  onConfirm: (lat: number, lng: number) => void
  onClose: () => void
}

// Default center: Sarajevo
const DEFAULT_LAT = 43.8563
const DEFAULT_LNG = 18.4131

function makeIcon() {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width:22px;height:22px;
        background:#C9A84C;
        border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 2px 10px rgba(0,0,0,0.5);
        position:relative;
      ">
        <div style="
          position:absolute;bottom:-10px;left:50%;
          transform:translateX(-50%);
          width:2px;height:10px;
          background:#C9A84C;
        "></div>
      </div>`,
    iconSize: [22, 32],
    iconAnchor: [11, 32],
  })
}

export function MapPicker({ lat, lng, onConfirm, onClose }: MapPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)

  const [pinLat, setPinLat] = useState(lat ?? DEFAULT_LAT)
  const [pinLng, setPinLng] = useState(lng ?? DEFAULT_LNG)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const initialLat = lat ?? DEFAULT_LAT
    const initialLng = lng ?? DEFAULT_LNG

    const map = L.map(containerRef.current, { zoomControl: true }).setView(
      [initialLat, initialLng],
      lat != null ? 16 : 13,
    )

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a>',
      maxZoom: 19,
    }).addTo(map)

    const marker = L.marker([initialLat, initialLng], {
      icon: makeIcon(),
      draggable: true,
    }).addTo(map)

    marker.on('dragend', () => {
      const pos = marker.getLatLng()
      setPinLat(pos.lat)
      setPinLng(pos.lng)
    })

    map.on('click', (e: L.LeafletMouseEvent) => {
      marker.setLatLng(e.latlng)
      setPinLat(e.latlng.lat)
      setPinLng(e.latlng.lng)
    })

    mapRef.current = map
    markerRef.current = marker

    // Fix resize glitch when opening inside a portal/overlay
    setTimeout(() => map.invalidateSize(), 50)

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleConfirm() {
    onConfirm(pinLat, pinLng)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col bg-obsidian"
      style={{ touchAction: 'none' }}
    >
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
          onClick={handleConfirm}
          className="flex items-center gap-1.5 text-gold hover:text-gold-light text-sm font-body font-semibold transition-colors"
        >
          <Check size={15} />
          Confirm
        </button>
      </div>

      {/* Instruction */}
      <div className="px-4 py-2 bg-slate-dark border-b border-white/6 shrink-0">
        <p className="text-ivory-dim text-xs font-body text-center">
          Tap to place pin · drag to refine
        </p>
      </div>

      {/* Map */}
      <div ref={containerRef} className="flex-1" />

      {/* Coordinates footer */}
      <div className="px-4 py-2.5 bg-slate-dark border-t border-white/8 shrink-0">
        <p className="text-ivory-dim text-xs font-mono text-center tracking-wide">
          {pinLat.toFixed(5)}, {pinLng.toFixed(5)}
        </p>
      </div>
    </div>
  )
}
