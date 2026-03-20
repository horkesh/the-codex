import { useEffect, useRef, useState } from 'react'
import type { DayRoute } from '@/types/app'
import { getGoogleMaps } from '@/lib/geo'

interface Props {
  route: DayRoute
  dayLabel: string
  className?: string
}

// Dark style for maps (matching existing app style from geo.ts)
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

export function RouteMap({ route, dayLabel, className }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!mapRef.current || route.points.length < 2) return

    let map: google.maps.Map | undefined

    getGoogleMaps().then(google => {
      if (!mapRef.current) return

      // Create map centered on route midpoint
      const bounds = new google.maps.LatLngBounds()
      for (const p of route.points) {
        bounds.extend({ lat: p.lat, lng: p.lng })
      }

      map = new google.maps.Map(mapRef.current, {
        center: bounds.getCenter(),
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: false,
        styles: DARK_STYLE as google.maps.MapTypeStyle[],
        backgroundColor: '#1a1a2e',
      })

      map.fitBounds(bounds, 40)

      // Gold polyline connecting route points
      new google.maps.Polyline({
        path: route.points.map(p => ({ lat: p.lat, lng: p.lng })),
        geodesic: true,
        strokeColor: '#c9a84c',
        strokeOpacity: 0.6,
        strokeWeight: 2.5,
        map,
      })

      // Gold dot markers at each point
      for (const point of route.points) {
        new google.maps.Marker({
          position: { lat: point.lat, lng: point.lng },
          map,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 4,
            fillColor: '#c9a84c',
            fillOpacity: 0.8,
            strokeColor: '#c9a84c',
            strokeWeight: 1,
          },
          title: point.label ?? undefined,
        })
      }
    }).catch(() => setError(true))

    return () => { map = undefined }
  }, [route])

  if (route.points.length < 2) return null
  if (error) return null

  return (
    <div className={className}>
      <p className="text-[9px] font-body uppercase tracking-[0.2em] text-ivory/20 mb-1.5">
        {dayLabel} Route
      </p>
      <div
        ref={mapRef}
        className="w-full h-40 rounded-lg overflow-hidden border border-ivory/5"
      />
    </div>
  )
}
