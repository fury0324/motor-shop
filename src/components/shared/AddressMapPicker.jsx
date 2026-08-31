// src/components/shared/AddressMapPicker.jsx
// Lets staff pin a customer's home address on a map — search the typed
// address (OpenStreetMap Nominatim geocoding, free/no API key) to drop a
// pin, then fine-tune by dragging it or clicking elsewhere on the map.
// Used by both the admin and cashier customer registration forms.
import { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import { DEFAULT_CENTER, DEFAULT_ZOOM, PIN_ZOOM, TILE_LAYERS } from './leafletSetup'

function RecenterOnChange({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), PIN_ZOOM))
  }, [position, map])
  return null
}

function ClickToPin({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function AddressMapPicker({ address, lat, lng, onChange }) {
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState(null)
  const [mapType, setMapType] = useState('street')

  const position = lat != null && lng != null ? [lat, lng] : null

  const handleSearch = async () => {
    const query = String(address || '').trim()
    if (!query) {
      setSearchError('Type the address above first.')
      return
    }
    setSearching(true)
    setSearchError(null)
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Search request failed.')
      const results = await res.json()
      if (!results.length) {
        setSearchError('No match found for that address — try a more specific one, or click the map to drop a pin manually.')
        return
      }
      onChange(parseFloat(results[0].lat), parseFloat(results[0].lon))
    } catch {
      setSearchError('Could not search that address right now — click the map to drop a pin manually.')
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-xs font-semibold text-[#45464d]">Map Location</label>
        <div className="flex items-center gap-2">
          <div className="flex border border-[#c6c6cd] rounded-lg overflow-hidden text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMapType('street')}
              className={`px-2.5 py-1.5 transition-colors ${mapType === 'street' ? 'bg-black text-white' : 'bg-white text-[#45464d] hover:bg-gray-50'}`}
            >
              Street
            </button>
            <button
              type="button"
              onClick={() => setMapType('satellite')}
              className={`px-2.5 py-1.5 transition-colors border-l border-[#c6c6cd] ${mapType === 'satellite' ? 'bg-black text-white' : 'bg-white text-[#45464d] hover:bg-gray-50'}`}
            >
              Satellite
            </button>
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching}
            className="px-3 py-1.5 bg-white border border-[#c6c6cd] rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">{searching ? 'progress_activity' : 'search'}</span>
            {searching ? 'Searching...' : 'Find on Map'}
          </button>
        </div>
      </div>

      <div className="rounded-lg overflow-hidden border border-[#c6c6cd]" style={{ height: 260 }}>
        <MapContainer
          center={position || DEFAULT_CENTER}
          zoom={position ? PIN_ZOOM : DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            key={mapType}
            attribution={TILE_LAYERS[mapType].attribution}
            url={TILE_LAYERS[mapType].url}
          />
          <ClickToPin onPick={onChange} />
          {position && <RecenterOnChange position={position} />}
          {position && (
            <Marker
              position={position}
              draggable
              eventHandlers={{
                dragend: (e) => {
                  const { lat: newLat, lng: newLng } = e.target.getLatLng()
                  onChange(newLat, newLng)
                },
              }}
            />
          )}
        </MapContainer>
      </div>

      {searchError && <p className="text-xs text-red-600">{searchError}</p>}
      {position ? (
        <p className="text-[10px] text-[#76777d]">
          Pinned at {position[0].toFixed(6)}, {position[1].toFixed(6)} — drag the pin or click the map to adjust.
        </p>
      ) : (
        <p className="text-[10px] text-[#76777d]">
          Search the address above, or click the map to drop a pin manually. Optional.
        </p>
      )}
    </div>
  )
}

export default AddressMapPicker
