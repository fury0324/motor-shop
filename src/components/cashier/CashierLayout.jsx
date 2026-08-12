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
import AIAssistant from '../ai/AIAssistant'

function CashierLayout({ onLogout, userRole }) {
  // Redirect if not cashier
  if (userRole !== 'cashier') {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    if (onLogout) onLogout()
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      {/* Sidebar */}
      <CashierSidebar onLogout={handleLogout} />

      {/* Main Content Area — same min-h-screen/no-inner-scroll-container
          shell as AdminLayout/StaffLayout (sidebar is fixed, header is
          sticky, so the visual result is identical either way; this keeps
          all three portals on one scroll strategy). */}
      <div className="lg:ml-64 min-h-screen">
        {/* Header */}
        <PortalHeader role="cashier" />

        {/* Page Content — no padding here; each page owns its own */}
        <main className="min-h-[calc(100vh-64px)]">
          <Routes>
            <Route path="/" element={<CashierDashboard />} />
            <Route path="/dashboard" element={<CashierDashboard />} />
            <Route path="/new-transaction" element={<NewTransaction />} />
            <Route path="/transaction-history" element={<TransactionHistory />} />
            <Route path="/customer-list" element={<CustomerList />} />
            <Route path="/register-customer" element={<RegisterCustomer />} />
            <Route path="/inventory" element={<CheckInventory />} />
            <Route path="/ai" element={<AIAssistant />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default CashierLayout