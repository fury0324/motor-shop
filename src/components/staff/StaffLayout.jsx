// src/components/staff/StaffLayout.jsx
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import StaffSidebar from './StaffSidebar'
import StaffHeader from './StaffHeader'
import StaffDashboard from './StaffDashboard'
import StaffInventory from './StaffInventory'
import StaffAddNew from './StaffAddNew'
import StaffSettings from './StaffSettings'

const MENU_PATHS = {
  dashboard: '/staff/dashboard',
  inventory: '/staff/inventory',
  'add-new': '/staff/add-new',
  settings: '/staff/settings',
}

function activeMenuFor(pathname) {
  if (pathname.includes('/staff/inventory')) return 'inventory'
  if (pathname.includes('/staff/add-new')) return 'add-new'
  if (pathname.includes('/staff/settings')) return 'settings'
  return 'dashboard'
}

function StaffLayout({ onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const activeMenu = activeMenuFor(location.pathname)

  const handleMenuChange = (menu) => {
    if (MENU_PATHS[menu]) navigate(MENU_PATHS[menu])
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <StaffSidebar
        activeMenu={activeMenu}
        onMenuChange={handleMenuChange}
        onLogout={onLogout}
      />
      <div className="lg:ml-64 min-h-screen">
        <StaffHeader />
        <main className="min-h-[calc(100vh-64px)]">
          <Routes>
            <Route path="/" element={<StaffDashboard />} />
            <Route path="/dashboard" element={<StaffDashboard />} />
            <Route path="/inventory" element={<StaffInventory />} />
            <Route path="/add-new" element={<StaffAddNew />} />
            <Route path="/settings" element={<StaffSettings />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default StaffLayout