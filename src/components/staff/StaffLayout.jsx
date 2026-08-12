// src/components/staff/StaffLayout.jsx
import { Routes, Route } from 'react-router-dom'
import StaffSidebar from './StaffSidebar'
import PortalHeader from '../ui/PortalHeader'
import StaffDashboard from './StaffDashboard'
import StaffInventory from './StaffInventory'
import StaffAddNew from './StaffAddNew'
import StaffSettings from './StaffSettings'
import AIAssistant from '../ai/AIAssistant'

function StaffLayout({ onLogout }) {
  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <StaffSidebar onLogout={onLogout} />
      <div className="lg:ml-64 min-h-screen">
        <PortalHeader role="staff" showSettings />
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