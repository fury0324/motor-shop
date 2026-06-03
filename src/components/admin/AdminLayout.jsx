import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import Dashboard from './Dashboard'
import UserManagement from './UserManagement'
import Inventory from './Inventory'

function AdminLayout({ onLogout }) {
  const [activeMenu, setActiveMenu] = useState('dashboard')

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />
      case 'users':
        return <UserManagement />
      case 'customers':
        return (
          <div className="p-5">
            <h2 className="text-2xl font-bold text-[#0b1c30]">Customers</h2>
            <p className="text-base text-[#45464d] mt-1">Coming soon...</p>
          </div>
        )
      case 'inventory':
        return <Inventory />
      case 'transactions':
        return (
          <div className="p-5">
            <h2 className="text-2xl font-bold text-[#0b1c30]">Transactions</h2>
            <p className="text-base text-[#45464d] mt-1">Coming soon...</p>
          </div>
        )
      case 'ai':
        return (
          <div className="p-5">
            <h2 className="text-2xl font-bold text-[#0b1c30]">AI Helper</h2>
            <p className="text-base text-[#45464d] mt-1">Coming soon...</p>
          </div>
        )
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <Sidebar activeMenu={activeMenu} onMenuChange={setActiveMenu} onLogout={onLogout} />
      <div className="lg:ml-64 min-h-screen">
        <Header />
        <main className="min-h-[calc(100vh-64px)]">
          {renderContent()}
        </main>
      </div>

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
          background: #e2e8f0;
          border-radius: 10px;
        }
      `}</style>
    </div>
  )
}

export default AdminLayout