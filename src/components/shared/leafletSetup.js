// src/components/shared/leafletSetup.js
// Shared between AddressMapPicker (editable) and AddressMapView (read-only)
// — the default-marker-icon fix and tile sources only need to exist once.
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Vite bundles marker images under a hashed URL that Leaflet's default
// CSS-relative lookup can't find — point it at the imported assets instead.
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// Centered on the Philippines by default until a pin is set.
export const DEFAULT_CENTER = [12.8797, 121.7740]
export const DEFAULT_ZOOM = 6
export const PIN_ZOOM = 16

// Esri World Imagery — free, no API key required, standard satellite tile
// source for Leaflet (unlike Google's satellite tiles, which need a billed
// Maps API key).
export const TILE_LAYERS = {
  street: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
  },
}
