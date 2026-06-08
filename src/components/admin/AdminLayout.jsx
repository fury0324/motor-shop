import { useState } from 'react'
import Sidebar from './Sidebar'
import Header from './Header'
import Dashboard from './Dashboard'
import UserManagement from './UserManagement'
import Inventory from './Inventory'
import CustomerList from './CustomerList'
import CustomerRegistration from './CustomerRegistration'
import TransactionList from './TransactionList'
import Transaction from './Transaction'

function AdminLayout({ onLogout }) {
  const [activeMenu, setActiveMenu] = useState('dashboard')
  const [activeSubMenu, setActiveSubMenu] = useState(null)

  const handleNavigateToAddCustomer = () => {
    setActiveMenu('customers')
    setActiveSubMenu('add-customer')
  }

  const handleNavigateToTransactionList = () => {
    setActiveMenu('transactions')
    setActiveSubMenu('transaction-list')
  }

  const handleNavigateToNewTransaction = () => {
    setActiveMenu('transactions')
    setActiveSubMenu('new-transaction')
  }

  const renderContent = () => {
    // Handle Customers submenus
    if (activeMenu === 'customers') {
      if (activeSubMenu === 'add-customer') {
        return <CustomerRegistration onNavigateToCustomerList={() => {
          setActiveMenu('customers')
          setActiveSubMenu('customer-list')
        }} />
      }
      return <CustomerList onNavigateToAddCustomer={handleNavigateToAddCustomer} />
    }

    // Handle Inventory - just use Inventory component directly
    if (activeMenu === 'inventory') {
      return <Inventory />
    }

    // Handle Transactions submenus
    if (activeMenu === 'transactions') {
      if (activeSubMenu === 'transaction-list') {
        return <TransactionList onNavigateToTransaction={handleNavigateToNewTransaction} />
      }
      if (activeSubMenu === 'new-transaction') {
        return <Transaction 
          onNavigateToAddCustomer={handleNavigateToAddCustomer} 
          onNavigateToTransactionList={handleNavigateToTransactionList} 
        />
      }
      return <TransactionList onNavigateToTransaction={handleNavigateToNewTransaction} />
    }

    // Handle other menus
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />
      case 'users':
        return <UserManagement />
      case 'ai':
        return <AIHelper />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <Sidebar 
        activeMenu={activeMenu} 
        activeSubMenu={activeSubMenu}
        onMenuChange={setActiveMenu} 
        onSubMenuChange={setActiveSubMenu}
        onLogout={onLogout} 
      />
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