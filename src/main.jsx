// src/main.jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'

// Service worker registration is handled by vite-plugin-pwa (registerType:
// 'autoUpdate' in vite.config.js) — it auto-injects its own registration
// script for the Workbox-generated sw.js, so no manual registration here.
// (A hand-written public/sw.js used to also register itself at this same
// URL, which could serve stale content in dev since it cached '/' forever;
// removed in favor of the plugin's generated one.)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)