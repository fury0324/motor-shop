// src/components/cashier/CashierLayout.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import CashierSidebar from './CashierSidebar'
import PortalHeader from '../ui/PortalHeader'
import CashierDashboard from './CashierDashboard'
import NewTransaction from './NewTransaction'
import TransactionHistory from './TransactionHistory'
import CustomerList from './CustomerList'
import RegisterCustomer from './RegisterCustomer'
import CheckInventory from './CheckInventory'

function CashierLayout({ onLogout, userRole }) {
  // Redirect if not cashier
  if (userRole !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    if (onLogout) onLogout()
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <CashierSidebar onLogout={handleLogout} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
        {/* Header */}
        <PortalHeader role="cashier" showDateTime />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Routes>
            <Route path="/" element={<CashierDashboard />} />
            <Route path="/dashboard" element={<CashierDashboard />} />
            <Route path="/new-transaction" element={<NewTransaction />} />
            <Route path="/transaction-history" element={<TransactionHistory />} />
            <Route path="/customer-list" element={<CustomerList />} />
            <Route path="/register-customer" element={<RegisterCustomer />} />
            <Route path="/inventory" element={<CheckInventory />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default CashierLayout