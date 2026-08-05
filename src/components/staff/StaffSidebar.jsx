// src/components/staff/StaffSidebar.jsx
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Swal from '../../lib/swal'
import logo from '../../assets/euro-logo.png'
import Badge from '../ui/Badge'
import { MENU_ITEMS, matchActive } from './navigation'

function StaffSidebar({ onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { activeMenu } = matchActive(location.pathname)

  const handleMenuClick = (item) => {
    navigate(item.path)
    setIsMobileMenuOpen(false)
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You are about to sign out of your account.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, sign out',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      // Signing out is now a client-side Firebase Auth call (App.jsx's
      // onLogout prop) — no server round-trip to fail on.
      Swal.fire({
        icon: 'success',
        title: 'Signed Out!',
        text: 'You have been successfully signed out.',
        confirmButtonColor: '#3085d6',
        timer: 2000,
        timerProgressBar: true
      }).then(() => {
        if (onLogout) onLogout()
      })
    }
  }

  const isMenuActive = (menuId) => activeMenu === menuId

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        <span className="material-symbols-outlined">
          {isMobileMenuOpen ? 'close' : 'menu'}
        </span>
      </button>

      {/* Mobile overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-brand-navy border-r border-white/10 z-40
          flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-2 border-b border-white/10">
          <img
            alt="Euro Motor Logo"
            className="h-9 w-auto object-contain"
            src={logo}
          />
          <Badge>STAFF</Badge>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {MENU_ITEMS.map((item) => (
            <a
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                isMenuActive(item.id)
                  ? 'bg-brand-red text-white font-medium'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 mt-auto">
          <div className="p-4 space-y-2">
            <a
              href="#"
              className="flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 rounded-lg transition-colors duration-200"
              onClick={(e) => {
                e.preventDefault()
                Swal.fire({
                  title: 'Support',
                  text: 'For assistance, please contact your supervisor or IT Support.',
                  icon: 'info',
                  confirmButtonColor: '#dc2626'
                })
              }}
            >
              <span className="material-symbols-outlined text-xl">help</span>
              <span>Support</span>
            </a>

            <a
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors duration-200 cursor-pointer"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span>Sign Out</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  )
}

export default StaffSidebar
