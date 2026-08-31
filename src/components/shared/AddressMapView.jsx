// src/components/shared/AddressMapView.jsx
// Read-only counterpart to AddressMapPicker — shows a customer's saved map
// pin (Customer Details view) without letting it be moved from here.
import { useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { PIN_ZOOM, TILE_LAYERS } from './leafletSetup'

function AddressMapView({ lat, lng, label }) {
  const [mapType, setMapType] = useState('street')

  if (lat == null || lng == null) {
    return (
      <div className="flex items-center gap-2 text-sm text-[#76777d] bg-[#f8f9ff] border border-[#c6c6cd] rounded-lg p-3">
        <span className="material-symbols-outlined text-lg">location_off</span>
        No map location saved for this customer.
      </div>
    )
  }

  const position = [lat, lng]

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
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
      </div>
      <div className="rounded-lg overflow-hidden border border-[#c6c6cd]" style={{ height: 220 }}>
        <MapContainer center={position} zoom={PIN_ZOOM} style={{ height: '100%', width: '100%' }}>
          <TileLayer key={mapType} attribution={TILE_LAYERS[mapType].attribution} url={TILE_LAYERS[mapType].url} />
          <Marker position={position}>
            {label && <Popup>{label}</Popup>}
          </Marker>
        </MapContainer>
      </div>
    </div>
  )
}

export default AddressMapView
