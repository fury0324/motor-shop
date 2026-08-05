// src/components/cashier/CashierHeader.jsx
import { useState, useEffect } from 'react'
import Swal from '../../lib/swal'

function CashierHeader({ activeMenu, activeSubMenu }) {
  const [userName, setUserName] = useState('Cashier')
  const [currentDateTime, setCurrentDateTime] = useState(new Date())

  useEffect(() => {
    // Get user info from localStorage
    const userEmail = localStorage.getItem('userEmail')
    if (userEmail) {
      const name = userEmail.split('@')[0]
      setUserName(name.charAt(0).toUpperCase() + name.slice(1))
    }

    // Update time every second
    const timer = setInterval(() => {
      setCurrentDateTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const formatDate = (date) => {
    return date.toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }

  const getPageTitle = () => {
    if (activeSubMenu) {
      switch(activeSubMenu) {
        case 'new-transaction': return 'New Transaction'
        case 'transaction-history': return 'Transaction History'
        case 'customer-list': return 'Customer List'
        case 'register-customer': return 'Register Customer'
        default: return 'Cashier Panel'
      }
    }
    
    switch(activeMenu) {
      case 'dashboard': return 'Dashboard'
      case 'inventory': return 'Check Inventory'
      case 'sales': return 'Today\'s Sales'
      default: return 'Cashier Panel'
    }
  }

  const getPageSubtitle = () => {
    if (activeSubMenu) {
      switch(activeSubMenu) {
        case 'new-transaction': return 'Process a new motorcycle sales transaction'
        case 'transaction-history': return 'View and search past transactions'
        case 'customer-list': return 'Manage registered customers'
        case 'register-customer': return 'Add new customer to the database'
        default: return 'Welcome to the Cashier Portal'
      }
    }
    
    switch(activeMenu) {
      case 'dashboard': return 'Welcome back! Here\'s your daily overview'
      case 'inventory': return 'Check available motorcycle units'
      case 'sales': return 'View today\'s sales summary'
      default: return 'Manage sales and customers efficiently'
    }
  }

  return (
    <header className="bg-white border-b border-[#c6c6cd] px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left side - Page info */}
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-[#0b1c30]">
            {getPageTitle()}
          </h1>
          <p className="text-sm text-[#45464d] mt-1">
            {getPageSubtitle()}
          </p>
        </div>

        {/* Right side - Date/Time and User */}
        <div className="flex items-center gap-6">
          {/* Date and Time */}
          <div className="hidden md:block text-right">
            <p className="text-sm font-medium text-[#0b1c30]">{formatDate(currentDateTime)}</p>
            <p className="text-xs text-[#45464d] mt-0.5">{formatTime(currentDateTime)}</p>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#dce9ff] rounded-full flex items-center justify-center">
              <span className="material-symbols-outlined text-[#0b1c30]">person</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-medium text-[#0b1c30]">{userName}</p>
              <p className="text-xs text-[#45464d]">Cashier</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default CashierHeader