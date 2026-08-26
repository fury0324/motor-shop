import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
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
    daily_revenue: [],
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
          daily_revenue: [],
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
        daily_revenue: [],
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

  const formatMonthLabel = (monthStr) => {
    const [year, month] = monthStr.split('-')
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('en-PH', {
      month: 'short',
      year: 'numeric'
    })
  }

  const formatDayLabel = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })
  }

  const monthlyRevenue = dashboardData.monthly_revenue || []
  const dailyRevenue = dashboardData.daily_revenue || []

  const monthlyChartData = monthlyRevenue.map((m) => ({
    month: formatMonthLabel(m.month),
    revenue: m.revenue
  }))

  const dailyChartData = dailyRevenue.map((d) => ({
    date: formatDayLabel(d.date),
    revenue: d.revenue
  }))

  const currentMonthEntry = monthlyRevenue[monthlyRevenue.length - 1] || null
  const previousMonthEntry = monthlyRevenue[monthlyRevenue.length - 2] || null
  const currentMonthRevenue = currentMonthEntry?.revenue || 0
  const previousMonthRevenue = previousMonthEntry?.revenue || 0
  const incomeChangePercent = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : (currentMonthRevenue > 0 ? 100 : 0)

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
      <div className="mb-6 flex justify-end">
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-white border border-[#c6c6cd] rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">refresh</span>
          Refresh
        </button>
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

      {/* Revenue Overview: overall chart + past vs. present income */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 mb-6">
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-[#c6c6cd]">
            <h4 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
              <span className="material-symbols-outlined text-base">monitoring</span>
              Revenue Overview
            </h4>
            <p className="text-xs text-[#76777d] mt-0.5">Monthly revenue trend, last 6 months</p>
          </div>
          <div className="p-4">
            {monthlyChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">
                No revenue data yet
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={monthlyChartData}>
                  <defs>
                    <linearGradient id="dashboardRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#76777d' }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#76777d' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: 'white', border: '1px solid #c6c6cd', borderRadius: '8px', padding: '10px' }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2} fill="url(#dashboardRevenueGradient)" name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm p-5 flex-1">
            <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">Present Income</p>
            <p className="text-[10px] text-[#76777d] mt-0.5">{currentMonthEntry ? formatMonthLabel(currentMonthEntry.month) : 'This month'}</p>
            <h3 className="text-2xl font-bold text-[#0b1c30] mt-2">{formatCurrency(currentMonthRevenue)}</h3>
            <p className={`text-xs font-medium mt-1 flex items-center gap-1 ${incomeChangePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <span className="material-symbols-outlined text-sm">
                {incomeChangePercent >= 0 ? 'trending_up' : 'trending_down'}
              </span>
              {incomeChangePercent >= 0 ? '+' : ''}{incomeChangePercent.toFixed(1)}% vs. past month
            </p>
          </div>

          <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm p-5 flex-1">
            <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">Past Income</p>
            <p className="text-[10px] text-[#76777d] mt-0.5">{previousMonthEntry ? formatMonthLabel(previousMonthEntry.month) : 'Last month'}</p>
            <h3 className="text-2xl font-bold text-[#0b1c30] mt-2">{formatCurrency(previousMonthRevenue)}</h3>
          </div>
        </div>
      </div>

      {/* Daily Income */}
      <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden mb-6">
        <div className="p-4 border-b border-[#c6c6cd]">
          <h4 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">calendar_view_day</span>
            Daily Income
          </h4>
          <p className="text-xs text-[#76777d] mt-0.5">Last 30 days</p>
        </div>
        <div className="p-4">
          {dailyChartData.length === 0 ? (
            <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
              No daily income data yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dailyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5eeff" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#76777d' }}
                  axisLine={false}
                  tickLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#76777d' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => `₱${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: 'white', border: '1px solid #c6c6cd', borderRadius: '8px', padding: '10px' }}
                />
                <Bar dataKey="revenue" fill="#2563eb" radius={[3, 3, 0, 0]} name="Income" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
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