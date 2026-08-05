import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getDashboardStats } from '../../lib/dashboard'

function Dashboard() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState({
    total_customers: 0,
    total_transactions: 0,
    total_revenue: 0,
    total_users: 0,
    recent_transactions: [],
    low_stock_items: [],
    recent_customers: [],
    monthly_revenue: [],
    status_counts: []
  })

  const fetchDashboardData = async () => {
    setIsLoading(true)
    try {
      const data = await getDashboardStats()

      if (data.success) {
        setDashboardData(data)
      } else {
        console.error('Error fetching dashboard data:', data.message)
        setDashboardData({
          total_customers: 0,
          total_transactions: 0,
          total_revenue: 0,
          total_users: 0,
          recent_transactions: [],
          low_stock_items: [],
          recent_customers: [],
          monthly_revenue: [],
          status_counts: []
        })
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setDashboardData({
        total_customers: 0,
        total_transactions: 0,
        total_revenue: 0,
        total_users: 0,
        recent_transactions: [],
        low_stock_items: [],
        recent_customers: [],
        monthly_revenue: [],
        status_counts: []
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch on mount, not a derived-state sync
    fetchDashboardData()
  }, [])

  const goToTransactions = () => navigate('/admin/transactions')
  const goToInventory = () => navigate('/admin/inventory')
  const goToCustomers = () => navigate('/admin/customers')

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fil-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatDate = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      'Completed': 'bg-green-100 text-green-700',
      'Pending': 'bg-yellow-100 text-yellow-700',
      'Cancelled': 'bg-red-100 text-red-700'
    }
    return badges[status] || 'bg-gray-100 text-gray-700'
  }

  const stats = [
    { 
      id: 1, 
      title: 'Total Customers', 
      value: dashboardData.total_customers.toLocaleString(), 
      change: '+12%', 
      icon: 'people',
      color: 'blue'
    },
    { 
      id: 2, 
      title: 'Total Transactions', 
      value: dashboardData.total_transactions.toLocaleString(), 
      change: '+8', 
      icon: 'receipt_long',
      color: 'green'
    },
    { 
      id: 3, 
      title: 'Total Revenue', 
      value: formatCurrency(dashboardData.total_revenue), 
      change: '+15.3%', 
      icon: 'payments',
      color: 'purple'
    }
  ]

  const getIconBgColor = (color) => {
    const colors = {
      blue: 'bg-blue-100',
      green: 'bg-green-100',
      purple: 'bg-purple-100'
    }
    return colors[color] || 'bg-gray-100'
  }

  const getIconTextColor = (color) => {
    const colors = {
      blue: 'text-blue-600',
      green: 'text-green-600',
      purple: 'text-purple-600'
    }
    return colors[color] || 'text-gray-600'
  }

  if (isLoading) {
    return (
      <div className="p-5 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0b1c30]">Dashboard</h2>
            <p className="text-sm text-[#45464d] mt-1">Real-time performance metrics and inventory health.</p>
          </div>
          <button 
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-white border border-[#c6c6cd] rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {stats.map((stat) => (
          <div
            key={stat.id}
            className="bg-white p-5 rounded-xl border border-[#c6c6cd] shadow-sm hover:shadow-md transition-all relative overflow-hidden cursor-pointer hover:border-blue-300"
            onClick={() => {
              if (stat.id === 1) goToCustomers()
              else if (stat.id === 2) goToTransactions()
            }}
          >
            <div className="flex justify-between items-start mb-3">
              <div className={`p-2.5 ${getIconBgColor(stat.color)} rounded-lg`}>
                <span className={`material-symbols-outlined text-2xl ${getIconTextColor(stat.color)}`}>
                  {stat.icon}
                </span>
              </div>
              <span className="text-xs font-medium text-green-600">
                {stat.change}
              </span>
            </div>
            <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">{stat.title}</p>
            <h3 className="text-2xl font-bold text-[#0b1c30] mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#c6c6cd] flex justify-between items-center">
            <h4 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">receipt_long</span>
              Recent Transactions
            </h4>
            <button 
              onClick={goToTransactions}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All →
            </button>
          </div>
          <div className="overflow-x-auto">
            {dashboardData.recent_transactions.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
                <p className="text-sm">No transactions yet</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-[#f8f9ff] border-b border-[#c6c6cd]">
                  <tr>
                    <th className="px-4 py-2 text-xs font-semibold text-[#45464d]">Transaction #</th>
                    <th className="px-4 py-2 text-xs font-semibold text-[#45464d]">Customer</th>
                    <th className="px-4 py-2 text-xs font-semibold text-[#45464d] hidden sm:table-cell">Product</th>
                    <th className="px-4 py-2 text-xs font-semibold text-[#45464d]">Amount</th>
                    <th className="px-4 py-2 text-xs font-semibold text-[#45464d]">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c6cd]">
                  {dashboardData.recent_transactions.map((transaction, index) => (
                    <tr
                      key={transaction.id}
                      className={`hover:bg-[#f8f9ff] transition-colors ${
                        index % 2 === 1 ? 'bg-[#f8f9ff]/30' : ''
                      }`}
                    >
                      <td className="px-4 py-2 font-mono text-xs text-[#76777d]">
                        {transaction.transaction_no || 'N/A'}
                      </td>
                      <td className="px-4 py-2 font-medium text-sm">
                        {transaction.customer_name || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm hidden sm:table-cell">
                        {transaction.product_name || 'N/A'}
                      </td>
                      <td className="px-4 py-2 text-sm font-medium">
                        {formatCurrency(transaction.selling_price)}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${getStatusBadge(transaction.status)}`}>
                          {transaction.status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#c6c6cd] flex justify-between items-center">
            <h4 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">warning</span>
              Low Stock Alerts
            </h4>
            <button 
              onClick={goToInventory}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View All →
            </button>
          </div>
          <div className="p-4">
            {dashboardData.low_stock_items.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 block">check_circle</span>
                <p className="text-sm">All items have sufficient stock</p>
              </div>
            ) : (
              <div className="space-y-2">
                {dashboardData.low_stock_items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">{item.brand || 'N/A'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{item.stock} units</p>
                      <p className="text-[10px] text-gray-400">Min: {item.min_stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Customers */}
      <div className="mt-4 bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#c6c6cd] flex justify-between items-center">
          <h4 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">people</span>
            Recent Customers
          </h4>
          <button 
            onClick={goToCustomers}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
          >
            View All →
          </button>
        </div>
        <div className="overflow-x-auto">
          {dashboardData.recent_customers.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <span className="material-symbols-outlined text-4xl mb-2 block">people</span>
              <p className="text-sm">No customers yet</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-[#f8f9ff] border-b border-[#c6c6cd]">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-[#45464d]">Name</th>
                  <th className="px-4 py-2 text-xs font-semibold text-[#45464d]">Email</th>
                  <th className="px-4 py-2 text-xs font-semibold text-[#45464d]">Contact</th>
                  <th className="px-4 py-2 text-xs font-semibold text-[#45464d]">Date Registered</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c6cd]">
                {dashboardData.recent_customers.map((customer, index) => (
                  <tr
                    key={customer.id}
                    className={`hover:bg-[#f8f9ff] transition-colors ${
                      index % 2 === 1 ? 'bg-[#f8f9ff]/30' : ''
                    }`}
                  >
                    <td className="px-4 py-2 font-medium text-sm">{customer.full_name}</td>
                    <td className="px-4 py-2 text-sm">{customer.email}</td>
                    <td className="px-4 py-2 text-sm">{customer.contact_number}</td>
                    <td className="px-4 py-2 text-sm">{formatDate(customer.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard