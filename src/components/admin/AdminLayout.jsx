import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
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
import AdminSettings from './AdminSettings'

// Route -> header title/subtitle, keyed by the path relative to /admin.
// Keeps the page name in one place (the header) instead of every page
// re-rendering its own heading.
const PAGE_INFO = {
  '/': { title: 'Dashboard', subtitle: 'Real-time performance metrics and inventory health.' },
  '/dashboard': { title: 'Dashboard', subtitle: 'Real-time performance metrics and inventory health.' },
  '/users': { title: 'User Management', subtitle: 'Manage system users, roles, and permissions.' },
  '/customers': { title: 'Customer List', subtitle: 'Manage all registered customers.' },
  '/customers/add': { title: 'Customer Registration', subtitle: 'Register a new client into the Euro Motor ecosystem.' },
  '/inventory': { title: 'Inventory Management', subtitle: 'Manage motorcycle models, parts, and individual units.' },
  '/transactions': { title: 'Transaction List', subtitle: 'View and manage all sales transactions.' },
  '/transactions/new': { title: 'New Transaction', subtitle: 'Process a new sales transaction.' },
  '/predictions': { title: 'Predictions', subtitle: 'Sales trends and inventory forecasts.' },
  '/ai': { title: 'AI Assistant' },
  '/settings': { title: 'Settings', subtitle: 'Shop-wide defaults used across the app.' },
}

// Real nested routes replace the old activeMenu/activeSubMenu state machine
// (which duplicated URL-matching logic here, in Sidebar, and in every
// "navigate" callback) — the URL is now the single source of truth for what
// renders, which also fixes back/forward and deep-linking.
function AdminLayout({ onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const relativePath = location.pathname.replace(/^\/admin/, '') || '/'
  const { title, subtitle } = PAGE_INFO[relativePath] || {}

  return (
    <div className="min-h-screen bg-[#f8f9ff]">
      <Sidebar onLogout={onLogout} />
      <div className="lg:ml-64 min-h-screen">
        <PortalHeader role="admin" showSettings title={title} subtitle={subtitle} />
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
            <Route path="/settings" element={<AdminSettings />} />
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