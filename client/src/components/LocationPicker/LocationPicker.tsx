import { useCallback, useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import './LocationPicker.css'

/* Fix Leaflet default marker icon paths (Vite asset handling) */
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
})

export interface LocationData {
  lat: number
  lng: number
  address: string
}

interface LocationPickerProps {
  value: LocationData | null
  onChange: (location: LocationData | null) => void
}

/* Jharkhand center — default view */
const JHARKHAND_CENTER: [number, number] = [23.61, 85.28]
const DEFAULT_ZOOM = 7
const PLACED_ZOOM = 15

/** Reverse-geocode using free Nominatim API */
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=16`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    const data = (await res.json()) as { display_name?: string }
    return data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }
}

/** Forward-geocode a search query using Nominatim */
async function forwardGeocode(query: string): Promise<{ lat: number; lng: number; name: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=in`,
      { headers: { 'Accept-Language': 'en' } }
    )
    if (!res.ok) return null
    const results = (await res.json()) as { lat: string; lon: string; display_name: string }[]
    if (!results.length) return null
    return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon), name: results[0].display_name }
  } catch {
    return null
  }
}

export default function LocationPicker({ value, onChange }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletMap = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const [search, setSearch] = useState('')
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState('')
  const [hintVisible, setHintVisible] = useState(true)

  /* Place or move the marker */
  const placeMarker = useCallback(async (lat: number, lng: number, existingAddress?: string) => {
    setError('')
    const map = leafletMap.current
    if (!map) return

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
      /* Allow dragging the marker to refine location */
      markerRef.current.on('dragend', () => {
        const pos = markerRef.current!.getLatLng()
        void placeMarker(pos.lat, pos.lng)
      })
    }

    map.flyTo([lat, lng], Math.max(map.getZoom(), PLACED_ZOOM), { duration: 0.6 })
    setHintVisible(false)

    const address = existingAddress ?? await reverseGeocode(lat, lng)
    onChange({ lat, lng, address })
    setSearch(address)
  }, [onChange])

  /* Initialise the Leaflet map */
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return

    const map = L.map(mapRef.current, {
      center: value ? [value.lat, value.lng] : JHARKHAND_CENTER,
      zoom: value ? PLACED_ZOOM : DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    /* Click on map to place marker */
    map.on('click', (e: L.LeafletMouseEvent) => {
      void placeMarker(e.latlng.lat, e.latlng.lng)
    })

    leafletMap.current = map

    /* If initial value exists, place marker */
    if (value) {
      void placeMarker(value.lat, value.lng, value.address)
    }

    /* Invalidate size after mount (for containers that are animated in) */
    const timer = setTimeout(() => map.invalidateSize(), 200)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* GPS locate */
  const handleGPS = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    setLocating(true)
    setError('')
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        })
      })
      await placeMarker(position.coords.latitude, position.coords.longitude)
    } catch (err) {
      const geoErr = err as GeolocationPositionError
      if (geoErr.code === 1) setError('Location access denied. Please enable it in your browser settings.')
      else if (geoErr.code === 2) setError('Unable to determine your location. Try again or click on the map.')
      else setError('Location request timed out. Try clicking on the map instead.')
    } finally {
      setLocating(false)
    }
  }

  /* Search */
  const handleSearch = async () => {
    if (!search.trim()) return
    setError('')
    const result = await forwardGeocode(search.trim())
    if (result) {
      await placeMarker(result.lat, result.lng, result.name)
    } else {
      setError(`No results found for "${search.trim()}". Try a different search or click on the map.`)
    }
  }

  /* Clear */
  const handleClear = () => {
    if (markerRef.current && leafletMap.current) {
      leafletMap.current.removeLayer(markerRef.current)
      markerRef.current = null
    }
    leafletMap.current?.flyTo(JHARKHAND_CENTER, DEFAULT_ZOOM, { duration: 0.5 })
    onChange(null)
    setSearch('')
    setHintVisible(true)
    setError('')
  }

  return (
    <div className="location-picker">
      <span className="location-picker-label">Location</span>

      {/* Search + GPS */}
      <div className="location-controls">
        <input
          className="location-search-input"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleSearch() } }}
          placeholder="Search a place, city, or landmark…"
          aria-label="Search location"
        />
        <button
          type="button"
          className={`location-gps-btn ${locating ? 'locating' : ''}`}
          onClick={() => void handleGPS()}
          disabled={locating}
        >
          <span className="gps-icon">📍</span>
          {locating ? 'Locating…' : 'Use my location'}
        </button>
      </div>

      {/* Map */}
      <div className="location-map-wrap">
        <div ref={mapRef} className="location-map" />
        <div className={`location-map-hint ${hintVisible ? '' : 'hidden'}`}>
          Click on the map to pin a location
        </div>
      </div>

      {/* Error */}
      {error && <div className="location-error" role="alert">{error}</div>}

      {/* Selected Location */}
      {value && (
        <div className="location-selected">
          <span className="location-selected-icon">✅</span>
          <div className="location-selected-details">
            <span className="location-selected-address">{value.address}</span>
            <span className="location-selected-coords">{value.lat.toFixed(5)}°N, {value.lng.toFixed(5)}°E</span>
          </div>
          <button type="button" className="location-clear-btn" onClick={handleClear}>Clear</button>
        </div>
      )}
    </div>
  )
}
