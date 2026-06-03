import { useState } from 'react'
import Swal from 'sweetalert2'
import logo from '../../assets/euro-logo.png'

function Sidebar({ activeMenu, onMenuChange, onLogout }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: 'dashboard' },
    { id: 'users', name: 'User Management', icon: 'group' },
    { id: 'customers', name: 'Customers', icon: 'people' },
    { id: 'inventory', name: 'Inventory', icon: 'inventory' },
    { id: 'transactions', name: 'Transactions', icon: 'receipt_long' },
    { id: 'ai', name: 'AI Helper', icon: 'smart_toy' },
  ]

  const handleMenuClick = (itemId) => {
    onMenuChange(itemId)
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

  return (
    <>
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg border border-gray-200"
      >
        <span className="material-symbols-outlined">
          {isMobileMenuOpen ? 'close' : 'menu'}
        </span>
      </button>

      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-[#f8f9ff] border-r border-[#c6c6cd] z-40
          transition-transform duration-300 ease-in-out
          lg:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="p-4 flex items-center gap-2 border-b border-[#c6c6cd]">
          <img
            alt="Euro Motor Logo"
            className="h-8 w-auto object-contain"
            src={logo}
          />
          <span className="text-lg font-bold text-[#0b1c30]">Admin Panel</span>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <a
              key={item.id}
              onClick={() => handleMenuClick(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 cursor-pointer ${
                activeMenu === item.id
                  ? 'bg-[#dce9ff] text-black font-medium'
                  : 'text-[#45464d] hover:text-black hover:bg-[#dce9ff]/50'
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-sm">{item.name}</span>
            </a>
          ))}
        </nav>

        <div className="p-4 border-t border-[#c6c6cd] mt-auto space-y-2">
          <button className="w-full bg-black text-white text-sm py-2 rounded-lg hover:opacity-80 transition-opacity flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-base">file_download</span>
            Export Report
          </button>
          <a className="flex items-center gap-3 px-3 py-2 text-sm text-[#45464d] hover:text-black hover:bg-[#dce9ff]/50 rounded-lg transition-colors duration-200 cursor-pointer">
            <span className="material-symbols-outlined text-xl">help</span>
            <span>Support</span>
          </a>
          <a 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-sm text-[#45464d] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">logout</span>
            <span>Sign Out</span>
          </a>
        </div>
      </aside>
    </>
  )
}

export default Sidebar