// components/admin/Sidebar.jsx
import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Swal from '../../lib/swal'
import logo from '../../assets/euro-logo.png'

const MENU_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', icon: 'dashboard', hasSubmenu: false, path: '/admin/dashboard' },
  { id: 'users', name: 'User Management', icon: 'group', hasSubmenu: false, path: '/admin/users' },
  {
    id: 'customers',
    name: 'Customers',
    icon: 'people',
    hasSubmenu: true,
    path: '/admin/customers',
    submenus: [
      { id: 'customer-list', name: 'Customer List', icon: 'list_alt', path: '/admin/customers' },
      { id: 'add-customer', name: 'Add Customer', icon: 'person_add', path: '/admin/customers/add' }
    ]
  },
  {
    id: 'inventory',
    name: 'Inventory',
    icon: 'inventory',
    hasSubmenu: false,
    path: '/admin/inventory'
  },
  {
    id: 'transactions',
    name: 'Transactions',
    icon: 'receipt_long',
    hasSubmenu: true,
    path: '/admin/transactions',
    submenus: [
      { id: 'transaction-list', name: 'Transaction List', icon: 'list_alt', path: '/admin/transactions' },
      { id: 'new-transaction', name: 'New Transaction', icon: 'add_shopping_cart', path: '/admin/transactions/new' }
    ]
  },
  {
    id: 'predictions',
    name: 'Predictions',
    icon: 'analytics',
    hasSubmenu: false,
    path: '/admin/predictions',
    badge: 'NEW'
  },
  {
    id: 'ai',
    name: 'AI Helper',
    icon: 'smart_toy',
    hasSubmenu: false,
    path: '/admin/ai'
  },
]

// Flattens MENU_ITEMS into { menuId, subId, path } candidates and picks the
// longest path that matches the current URL — this replaces what used to be
// a hand-maintained if/else chain duplicating every route's path here, in
// AdminLayout, and in every navigation callback.
function matchActive(pathname) {
  const candidates = []
  for (const item of MENU_ITEMS) {
    if (item.submenus) {
      for (const sub of item.submenus) candidates.push({ menuId: item.id, subId: sub.id, path: sub.path })
    } else {
      candidates.push({ menuId: item.id, subId: null, path: item.path })
    }
  }
  candidates.sort((a, b) => b.path.length - a.path.length)
  const match = candidates.find((c) => pathname === c.path || pathname.startsWith(`${c.path}/`))
  return match ? { activeMenu: match.menuId, activeSubMenu: match.subId } : { activeMenu: 'dashboard', activeSubMenu: null }
}

function Sidebar({ onLogout }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({})
  const menuItems = MENU_ITEMS

  const { activeMenu, activeSubMenu } = matchActive(location.pathname)

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      toggleSubmenu(item.id)
    } else if (item.path) {
      navigate(item.path)
    }
    setIsMobileMenuOpen(false)
  }

  const handleSubMenuClick = (menuId, submenuId) => {
    const parentMenu = menuItems.find(item => item.id === menuId)
    const submenu = parentMenu?.submenus?.find(sub => sub.id === submenuId)
    if (submenu?.path) {
      navigate(submenu.path)
    }
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
        if (onLogout) {
          onLogout()
        }
      })
    }
  }

  const isMenuActive = (menuId) => {
    return activeMenu === menuId
  }

  const isSubmenuActive = (menuId, submenuId) => {
    return activeMenu === menuId && activeSubMenu === submenuId
  }

  const isSubmenuExpanded = (menuId) => {
    if (activeMenu === menuId && activeSubMenu) {
      return true
    }
    return expandedMenus[menuId] || false
  }

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
        <div className="p-4 flex items-center gap-1 border-b border-white/10">
          <img
            alt="Euro Motor Logo"
            className="h-9 w-auto object-contain"
            src={logo}
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <div key={item.id}>
              <a
                onClick={() => handleMenuClick(item)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                  isMenuActive(item.id) && !item.hasSubmenu
                    ? 'bg-brand-red text-white font-medium'
                    : isMenuActive(item.id) && item.hasSubmenu
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.name}</span>
                  {item.badge && (
                    <span className="ml-auto text-[8px] font-bold bg-brand-red text-white px-1.5 py-0.5 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </div>
                {item.hasSubmenu && (
                  <span className="material-symbols-outlined text-base transition-transform duration-200" style={{
                    transform: isSubmenuExpanded(item.id) ? 'rotate(180deg)' : 'rotate(0deg)'
                  }}>
                    expand_more
                  </span>
                )}
              </a>

              {/* Submenu items */}
              {item.hasSubmenu && isSubmenuExpanded(item.id) && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.submenus.map((submenu) => (
                    <a
                      key={submenu.id}
                      onClick={() => handleSubMenuClick(item.id, submenu.id)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer ${
                        isSubmenuActive(item.id, submenu.id)
                          ? 'bg-brand-red text-white font-medium'
                          : 'text-white/50 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">{submenu.icon}</span>
                      <span className="text-xs font-medium">{submenu.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
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
                  text: 'For assistance, please contact IT Support.',
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

      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          vertical-align: middle;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 10px;
        }
      `}</style>
    </>
  )
}

export default Sidebar