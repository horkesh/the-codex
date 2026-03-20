import { useEffect, useRef, useState } from 'react'
import type { DayRoute } from '@/types/app'
import { APIProvider, Map, useMap } from '@vis.gl/react-google-maps'

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string

interface Props {
  route: DayRoute
  dayLabel: string
  className?: string
}

// Dark style for maps (matching existing app style)
const DARK_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a2e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#c9a84c' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e0e1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a3e' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a1a2e' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]

interface RouteOverlayProps {
  route: DayRoute
}

function RouteOverlay({ route }: RouteOverlayProps) {
  const map = useMap()
  const overlayRef = useRef<{ polyline: google.maps.Polyline; markers: google.maps.Marker[] } | null>(null)

  useEffect(() => {
    if (!map) return

    // Fit bounds
    const bounds = new window.google.maps.LatLngBounds()
    for (const p of route.points) {
      bounds.extend({ lat: p.lat, lng: p.lng })
    }
    map.fitBounds(bounds, 40)

    // Draw polyline
    const polyline = new window.google.maps.Polyline({
      path: route.points.map(p => ({ lat: p.lat, lng: p.lng })),
      geodesic: true,
      strokeColor: '#c9a84c',
      strokeOpacity: 0.6,
      strokeWeight: 2.5,
      map,
    })

    // Draw markers
    const markers = route.points.map(point =>
      new window.google.maps.Marker({
        position: { lat: point.lat, lng: point.lng },
        map,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 4,
          fillColor: '#c9a84c',
          fillOpacity: 0.8,
          strokeColor: '#c9a84c',
          strokeWeight: 1,
        },
        title: point.label ?? undefined,
      })
    )

    overlayRef.current = { polyline, markers }

    return () => {
      overlayRef.current?.polyline.setMap(null)
      for (const m of overlayRef.current?.markers ?? []) m.setMap(null)
      overlayRef.current = null
    }
  }, [map, route])

  return null
}

// Compute midpoint for initial center
function midpoint(route: DayRoute): { lat: number; lng: number } {
  const lats = route.points.map(p => p.lat)
  const lngs = route.points.map(p => p.lng)
  return {
    lat: (Math.min(...lats) + Math.max(...lats)) / 2,
    lng: (Math.min(...lngs) + Math.max(...lngs)) / 2,
  }
}

export function RouteMap({ route, dayLabel, className }: Props) {
  const [error, setError] = useState(false)

  if (route.points.length < 2) return null
  if (error) return null

  const center = midpoint(route)

  return (
    <div className={className}>
      <p className="text-[9px] font-body uppercase tracking-[0.2em] text-ivory/20 mb-1.5">
        {dayLabel} Route
      </p>
      <div className="w-full h-40 rounded-lg overflow-hidden border border-ivory/5">
        <APIProvider
          apiKey={GOOGLE_MAPS_KEY}
          onError={() => setError(true)}
        >
          <Map
            defaultCenter={center}
            defaultZoom={14}
            disableDefaultUI
            mapId="route-map"
            styles={DARK_STYLE as google.maps.MapTypeStyle[]}
            backgroundColor="#1a1a2e"
            style={{ width: '100%', height: '100%' }}
          >
            <RouteOverlay route={route} />
          </Map>
        </APIProvider>
      </div>
    </div>
  )
}
