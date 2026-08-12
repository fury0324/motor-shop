// src/components/cashier/CashierDashboard.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  Users,
  Bike,
  ShoppingCart,
  UserPlus,
  Search,
  CalendarDays,
  Activity,
  ArrowRight,
  Wallet,
  BadgeCheck,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { watchCustomers } from '../../lib/customers'
import { watchInventoryWithUnits } from '../../lib/inventory'
import { watchTransactions } from '../../lib/transactions'

function CashierDashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    todaySales: 0,
    totalCustomers: 0,
    availableUnits: 0,
    todayTransactions: 0
  })
  const [customersLoaded, setCustomersLoaded] = useState(false)
  const [inventoryLoaded, setInventoryLoaded] = useState(false)
  const [transactionsLoaded, setTransactionsLoaded] = useState(false)
  const isLoading = !(customersLoaded && inventoryLoaded && transactionsLoaded)

  useEffect(() => {
    const unsubCustomers = watchCustomers(
      (customers) => {
        setStats((prev) => ({ ...prev, totalCustomers: customers.length }))
        setCustomersLoaded(true)
      },
      (error) => { console.error('Error fetching customers:', error); setCustomersLoaded(true) }
    )

    const unsubInventory = watchInventoryWithUnits(
      (items) => {
        const availableUnits = items.reduce(
          (sum, item) => sum + item.units.filter((u) => u.status === 'Available').length,
          0
        )
        setStats((prev) => ({ ...prev, availableUnits }))
        setInventoryLoaded(true)
      },
      (error) => { console.error('Error fetching inventory:', error); setInventoryLoaded(true) }
    )

    const unsubTransactions = watchTransactions(
      (transactions) => {
        const today = new Date().toISOString().split('T')[0]
        const todaysTransactions = transactions.filter((t) => t.transactionDate === today)
        setStats((prev) => ({
          ...prev,
          todayTransactions: todaysTransactions.length,
          todaySales: todaysTransactions.reduce((sum, t) => sum + (Number(t.sellingPrice) || 0), 0),
        }))
        setTransactionsLoaded(true)
      },
      (error) => { console.error('Error fetching transactions:', error); setTransactionsLoaded(true) }
    )

    return () => {
      unsubCustomers()
      unsubInventory()
      unsubTransactions()
    }
  }, [])

  const formatCurrency = (amount) => {
    if (!amount) return '₱0.00'
    return new Intl.NumberFormat('fil-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDate = () => {
    return new Date().toLocaleDateString('en-PH', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }

  // Daily trend data
  const dailyData = [
    { day: 'Mon', value: 60 },
    { day: 'Tue', value: 80 },
    { day: 'Wed', value: 45 },
    { day: 'Thu', value: 95 },
    { day: 'Fri', value: 70 },
    { day: 'Sat', value: 85 },
    { day: 'Sun', value: 50 }
  ]

  const maxValue = Math.max(...dailyData.map(d => d.value))

  // 3 KPI Cards only (removed Pending Orders)
  const statsCards = [
    { 
      id: 1, 
      title: "Today's Sales", 
      value: formatCurrency(stats.todaySales), 
      change: `${stats.todayTransactions} transactions`, 
      icon: DollarSign,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      trend: '+15%',
      trendUp: true
    },
    { 
      id: 2, 
      title: 'Total Customers', 
      value: stats.totalCustomers.toLocaleString(), 
      change: 'Active accounts', 
      icon: Users,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      trend: '+2 new',
      trendUp: true
    },
    { 
      id: 3, 
      title: 'Available Units', 
      value: stats.availableUnits.toString(), 
      change: 'Ready for sale', 
      icon: Bike,
      iconBg: 'bg-purple-50',
      iconColor: 'text-purple-600',
      trend: 'In Stock',
      trendUp: true
    }
  ]

  return (
    <div className="p-4 sm:p-5">
      {/* Header with Greeting */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0b1c30] flex items-center gap-2">
            <Wallet className="w-6 h-6 text-[#0b1c30]" />
            Cashier Dashboard
          </h1>
          <p className="text-sm text-[#45464d] mt-1">
            Welcome back! 👋 Real-time performance metrics and inventory health.
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#45464d] mt-2 sm:mt-0 bg-white px-4 py-2 rounded-lg border border-[#c6c6cd]">
          <CalendarDays className="w-4 h-4" />
          {formatDate()}
        </div>
      </div>

      {/* KPI Cards - 3 Columns with Lucide Icons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {statsCards.map((stat) => {
          const Icon = stat.icon
          return (
            <div
              key={stat.id}
              className="bg-white rounded-xl border border-[#c6c6cd] p-5 shadow-sm hover:shadow-md transition-all hover:border-black group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2.5 ${stat.iconBg} rounded-xl group-hover:scale-105 transition-transform`}>
                  <Icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  stat.trendUp 
                    ? 'bg-green-50 text-green-600' 
                    : 'bg-red-50 text-red-600'
                } flex items-center gap-1`}>
                  {stat.trendUp ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {stat.trend}
                </span>
              </div>
              <p className="text-xs font-semibold tracking-wide text-[#45464d] uppercase">
                {stat.title}
              </p>
              {isLoading ? (
                <div className="h-8 w-24 bg-gray-200 rounded animate-pulse mt-1"></div>
              ) : (
                <h3 className="text-2xl font-bold text-[#0b1c30] mt-1">{stat.value}</h3>
              )}
              <p className="text-xs text-[#45464d] mt-1 flex items-center gap-1">
                <BadgeCheck className="w-3 h-3 text-green-500" />
                {stat.change}
              </p>
            </div>
          )
        })}
      </div>

      {/* Main Grid: Chart + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        
        {/* Daily Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#0b1c30]" />
              <div>
                <h3 className="text-sm font-semibold text-[#0b1c30]">Daily Sales Trend</h3>
                <p className="text-xs text-[#45464d]">Last 7 days performance</p>
              </div>
            </div>
            <span className="text-xs text-[#45464d] bg-[#f8f9ff] px-3 py-1 rounded-full border border-[#c6c6cd]">
              This week
            </span>
          </div>
          <div className="flex items-end justify-between h-32 gap-2">
            {dailyData.map((day, i) => {
              const heightPercent = (day.value / maxValue) * 100
              return (
                <div key={i} className="flex-1 text-center group">
                  <div 
                    className="bg-[#dce9ff] rounded-t-sm w-full transition-all group-hover:bg-black group-hover:opacity-80 cursor-pointer" 
                    style={{ 
                      height: `${Math.max(heightPercent, 15)}%`, 
                      minHeight: '20px',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 text-[8px] text-white bg-black px-1.5 py-0.5 rounded -mt-6 mx-auto w-fit transition-opacity">
                      {day.value}%
                    </div>
                  </div>
                  <p className="text-[10px] text-[#45464d] mt-1.5 font-medium">{day.day}</p>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-[#0b1c30] mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Quick Actions
          </h3>
          <div className="space-y-2.5">
            <button
              onClick={() => navigate('/cashier/new-transaction', { state: { type: 'model' } })}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#f8f9ff] hover:bg-[#dce9ff] rounded-xl transition-all text-left hover:border hover:border-black group"
            >
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition">
                <ShoppingCart className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0b1c30]">New Motorcycle Transaction</p>
                <p className="text-xs text-[#45464d]">Sell with unit tracking</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#45464d] ml-auto opacity-0 group-hover:opacity-100 transition" />
            </button>

            <button
              onClick={() => navigate('/cashier/new-transaction', { state: { type: 'part' } })}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#f8f9ff] hover:bg-[#dce9ff] rounded-xl transition-all text-left hover:border hover:border-black group"
            >
              <div className="w-9 h-9 bg-orange-100 rounded-lg flex items-center justify-center group-hover:bg-orange-200 transition">
                <Search className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0b1c30]">New Parts Transaction</p>
                <p className="text-xs text-[#45464d]">Quick parts sale</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#45464d] ml-auto opacity-0 group-hover:opacity-100 transition" />
            </button>

            <button
              onClick={() => navigate('/cashier/register-customer')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#f8f9ff] hover:bg-[#dce9ff] rounded-xl transition-all text-left hover:border hover:border-black group"
            >
              <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200 transition">
                <UserPlus className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0b1c30]">Register Customer</p>
                <p className="text-xs text-[#45464d]">Add new customer</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#45464d] ml-auto opacity-0 group-hover:opacity-100 transition" />
            </button>

            <button
              onClick={() => navigate('/cashier/inventory')}
              className="w-full flex items-center gap-3 px-4 py-3 bg-[#f8f9ff] hover:bg-[#dce9ff] rounded-xl transition-all text-left hover:border hover:border-black group"
            >
              <div className="w-9 h-9 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition">
                <Search className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-[#0b1c30]">Check Inventory</p>
                <p className="text-xs text-[#45464d]">View stock levels</p>
              </div>
              <ArrowRight className="w-4 h-4 text-[#45464d] ml-auto opacity-0 group-hover:opacity-100 transition" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#0b1c30]" />
            <div>
              <h3 className="text-sm font-semibold text-[#0b1c30]">Recent Transactions</h3>
              <p className="text-xs text-[#45464d]">Latest activities today</p>
            </div>
          </div>
          <button className="text-xs text-[#45464d] hover:text-black font-medium transition-colors flex items-center gap-1">
            View All
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="text-center py-6 text-sm text-[#45464d]">
          <Search className="w-8 h-8 mx-auto text-[#c6c6cd] mb-2" />
          No transactions yet today
        </div>
      </div>
    </div>
  )
}

export default CashierDashboard