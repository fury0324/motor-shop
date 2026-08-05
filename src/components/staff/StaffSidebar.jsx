// src/components/staff/StaffSidebar.jsx
import { useState } from 'react'
import Swal from '../../lib/swal'
import logo from '../../assets/euro-logo.png'

function StaffSidebar({ activeMenu, onMenuChange, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', name: 'Home', icon: 'home' },
    { id: 'add-new', name: 'Add New', icon: 'add_circle' },
    { id: 'inventory', name: 'Inventory', icon: 'inventory_2' },
    { id: 'settings', name: 'Settings', icon: 'settings' }
  ]

  const handleMenuClick = (item) => {
    onMenuChange(item.id)
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
          <span className="text-[10px] font-bold bg-brand-red text-white px-2 py-0.5 rounded-full">
            STAFF
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6 space-y-1">
          {menuItems.map((item) => (
            <a
              key={item.id}
              onClick={() => handleMenuClick(item)}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer
                ${isMenuActive(item.id)
                  ? 'bg-brand-red text-white font-medium shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <span className="material-symbols-outlined text-2xl">{item.icon}</span>
              <span className="text-sm font-medium">{item.name}</span>
            </a>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/10 p-4 space-y-2">
          <a
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm text-white/60 hover:text-red-400 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Sign Out</span>
          </a>
        </div>
      </aside>
    </>
  )
}

export default StaffSidebar