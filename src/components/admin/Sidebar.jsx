import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import logo from '../../assets/euro-logo.png'

function Sidebar({ activeMenu, activeSubMenu, onMenuChange, onSubMenuChange, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState({})

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: 'dashboard', hasSubmenu: false },
    { id: 'users', name: 'User Management', icon: 'group', hasSubmenu: false },
    { 
      id: 'customers', 
      name: 'Customers', 
      icon: 'people', 
      hasSubmenu: true,
      submenus: [
        { id: 'customer-list', name: 'Customer List', icon: 'list_alt' },
        { id: 'add-customer', name: 'Add Customer', icon: 'person_add' }
      ]
    },
    { 
      id: 'inventory', 
      name: 'Inventory', 
      icon: 'inventory', 
      hasSubmenu: false  // Changed to false since you only have Inventory component
      // If you want to keep submenus, uncomment below:
      // hasSubmenu: true,
      // submenus: [
      //   { id: 'inventory-list', name: 'Inventory List', icon: 'list_alt' },
      //   { id: 'add-inventory', name: 'Add Model', icon: 'add_business' },
      //   { id: 'add-unit', name: 'Add Unit', icon: 'motorcycle' }
      // ]
    },
    { 
      id: 'transactions', 
      name: 'Transactions', 
      icon: 'receipt_long', 
      hasSubmenu: true,
      submenus: [
        { id: 'transaction-list', name: 'Transaction List', icon: 'list_alt' },
        { id: 'new-transaction', name: 'New Transaction', icon: 'add_shopping_cart' }
      ]
    },
    { id: 'ai', name: 'AI Helper', icon: 'smart_toy', hasSubmenu: false },
  ]

  // Auto-expand menu when a submenu is active
  useEffect(() => {
    if (activeSubMenu) {
      // Find which menu contains this submenu
      const parentMenu = menuItems.find(item => 
        item.submenus && item.submenus.some(sub => sub.id === activeSubMenu)
      )
      if (parentMenu) {
        setExpandedMenus(prev => ({
          ...prev,
          [parentMenu.id]: true
        }))
      }
    }
  }, [activeSubMenu])

  const toggleSubmenu = (menuId) => {
    setExpandedMenus(prev => ({
      ...prev,
      [menuId]: !prev[menuId]
    }))
  }

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      toggleSubmenu(item.id)
    } else {
      onMenuChange(item.id)
      if (onSubMenuChange) onSubMenuChange(null)
    }
    setIsMobileMenuOpen(false)
  }

  const handleSubMenuClick = (menuId, submenuId) => {
    onMenuChange(menuId)
    if (onSubMenuChange) onSubMenuChange(submenuId)
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
      try {
        const response = await fetch('http://localhost:8080/motor-shop/backend/api/logout.php', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json()

        if (data.success) {
          localStorage.removeItem('userEmail')
          localStorage.removeItem('isLoggedIn')
          localStorage.removeItem('userRole')
          sessionStorage.clear()

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
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.message || 'Failed to sign out. Please try again.',
            confirmButtonColor: '#3085d6'
          })
        }
      } catch (error) {
        console.error('Logout error:', error)
        Swal.fire({
          icon: 'error',
          title: 'Connection Error',
          text: 'Unable to connect to server. Please try again.',
          confirmButtonColor: '#3085d6'
        })
      }
    }
  }

  const isMenuActive = (menuId) => {
    return activeMenu === menuId
  }

  const isSubmenuActive = (menuId, submenuId) => {
    return activeMenu === menuId && activeSubMenu === submenuId
  }

  const isSubmenuExpanded = (menuId) => {
    // Auto-expand if a submenu is active
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
          fixed left-0 top-0 h-full w-64 bg-[#f8f9ff] border-r border-[#c6c6cd] z-40
          flex flex-col
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="p-4 flex items-center gap-1 border-b border-[#c6c6cd]">
          <img
            alt="Euro Motor Logo"
            className="h-10 w-auto object-contain"
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
                    ? 'bg-[#dce9ff] text-black font-medium'
                    : isMenuActive(item.id) && item.hasSubmenu
                    ? 'bg-[#dce9ff]/50 text-black font-medium'
                    : 'text-[#45464d] hover:text-black hover:bg-[#dce9ff]/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.name}</span>
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
                          ? 'bg-[#dce9ff] text-black font-medium'
                          : 'text-[#45464d] hover:text-black hover:bg-[#dce9ff]/30'
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
        <div className="border-t border-[#c6c6cd] mt-auto">
          <div className="p-4 space-y-2">
            {/* Support link */}
            <a 
              href="#" 
              className="flex items-center gap-3 px-3 py-2 text-sm text-[#45464d] hover:text-black hover:bg-[#dce9ff]/50 rounded-lg transition-colors duration-200"
              onClick={(e) => {
                e.preventDefault()
                Swal.fire({
                  title: 'Support',
                  text: 'For assistance, please contact IT Support.',
                  icon: 'info',
                  confirmButtonColor: '#3B82F6'
                })
              }}
            >
              <span className="material-symbols-outlined text-xl">help</span>
              <span>Support</span>
            </a>
            
            {/* Logout button */}
            <a 
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 text-sm text-[#45464d] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 cursor-pointer"
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

export default Sidebar