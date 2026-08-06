import { Routes, Route, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import PortalHeader from '../ui/PortalHeader'
import Dashboard from './Dashboard'
import UserManagement from './UserManagement'
import Inventory from './Inventory'
import CustomerList from './CustomerList'
import CustomerRegistration from './CustomerRegistration'
import TransactionList from './TransactionList'
import Transaction from './Transaction'
import AIAssistant from '../ai/AIAssistant'
import PredictiveDashboard from './PredictiveDashboard'

// Real nested routes replace the old activeMenu/activeSubMenu state machine
// (which duplicated URL-matching logic here, in Sidebar, and in every
// "navigate" callback) — the URL is now the single source of truth for what
// renders, which also fixes back/forward and deep-linking.
function AdminLayout({ onLogout }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <Sidebar onLogout={onLogout} />
      <div className="lg:ml-64 min-h-screen">
        <PortalHeader role="admin" showSettings />
        <main className="min-h-[calc(100vh-64px)]">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/customers" element={<CustomerList />} />
            <Route path="/customers/add" element={<CustomerRegistration />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/transactions" element={
              <TransactionList onNavigateToTransaction={() => navigate('/admin/transactions/new')} />
            } />
            <Route path="/transactions/new" element={
              <Transaction
                onNavigateToAddCustomer={() => navigate('/admin/customers/add')}
                onNavigateToTransactionList={() => navigate('/admin/transactions')}
              />
            } />
            <Route path="/predictions" element={<PredictiveDashboard />} />
            <Route path="/ai" element={<AIAssistant />} />
          </Routes>
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