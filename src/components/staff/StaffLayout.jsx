// src/components/staff/StaffLayout.jsx
import { Routes, Route, useLocation } from 'react-router-dom'
import StaffSidebar from './StaffSidebar'
import PortalHeader from '../ui/PortalHeader'
import StaffDashboard from './StaffDashboard'
import StaffInventory from './StaffInventory'
import StaffAddNew from './StaffAddNew'
import StaffSettings from './StaffSettings'
import AIAssistant from '../ai/AIAssistant'

// Route -> header title/subtitle, keyed by the path relative to /staff.
const PAGE_INFO = {
  '/': { title: 'Staff Dashboard', subtitle: 'Manage inventory, add new items, and track stock levels.' },
  '/dashboard': { title: 'Staff Dashboard', subtitle: 'Manage inventory, add new items, and track stock levels.' },
  '/inventory': { title: 'Inventory Management', subtitle: 'Manage motorcycle models, parts, and individual units.' },
  '/add-new': { title: 'Add New Item', subtitle: 'Add a new motorcycle model or part to inventory.' },
  '/settings': { title: 'Settings', subtitle: 'Manage your account and application preferences.' },
  '/ai': { title: 'AI Assistant' },
}

function StaffLayout({ onLogout }) {
  const location = useLocation()
  const relativePath = location.pathname.replace(/^\/staff/, '') || '/'
  const { title, subtitle } = PAGE_INFO[relativePath] || {}

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <StaffSidebar onLogout={onLogout} />
      <div className="lg:ml-64 min-h-screen">
        <PortalHeader role="staff" showSettings title={title} subtitle={subtitle} />
        <main className="min-h-[calc(100vh-64px)]">
          <Routes>
            <Route path="/" element={<StaffDashboard />} />
            <Route path="/dashboard" element={<StaffDashboard />} />
            <Route path="/inventory" element={<StaffInventory />} />
            <Route path="/add-new" element={<StaffAddNew />} />
            <Route path="/settings" element={<StaffSettings />} />
            <Route path="/ai" element={<AIAssistant />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default StaffLayout