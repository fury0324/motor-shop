// src/components/staff/StaffDashboard.jsx
import { useState, useEffect } from 'react'
import {
  Package,
  AlertTriangle,
  Bike,
  Wrench,
  Clock,
  RefreshCw,
  CheckCircle2
} from 'lucide-react'
import { watchInventory } from '../../lib/inventory'
import { watchTransactions, watchPartsTransactions } from '../../lib/transactions'

function StaffDashboard() {
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStock: 0,
    totalParts: 0,
    totalMotorcycles: 0
  })
  const [inventoryLoaded, setInventoryLoaded] = useState(false)
  const [transactionsLoaded, setTransactionsLoaded] = useState(false)
  const [partsTransactionsLoaded, setPartsTransactionsLoaded] = useState(false)
  const isLoading = !(inventoryLoaded && transactionsLoaded && partsTransactionsLoaded)
  const [recentTransactions, setRecentTransactions] = useState([])
  const [recentPartsTransactions, setRecentPartsTransactions] = useState([])

  useEffect(() => {
    const unsubInventory = watchInventory(
      (items) => {
        const lowStock = items.filter((i) => i.stock > 0 && i.stock <= 3)
        const parts = items.filter((i) => i.category === 'Part')
        const motorcycles = items.filter((i) => i.category === 'Motorcycle')
        setStats({
          totalItems: items.length,
          lowStock: lowStock.length,
          totalParts: parts.length,
          totalMotorcycles: motorcycles.length
        })
        setInventoryLoaded(true)
      },
      (error) => { console.error('Error fetching inventory:', error); setInventoryLoaded(true) }
    )

    const unsubTransactions = watchTransactions(
      (transactions) => { setRecentTransactions(transactions.slice(0, 3)); setTransactionsLoaded(true) },
      (error) => { console.error('Error fetching transactions:', error); setTransactionsLoaded(true) }
    )

    const unsubPartsTransactions = watchPartsTransactions(
      (transactions) => { setRecentPartsTransactions(transactions.slice(0, 3)); setPartsTransactionsLoaded(true) },
      (error) => { console.error('Error fetching parts transactions:', error); setPartsTransactionsLoaded(true) }
    )

    return () => {
      unsubInventory()
      unsubTransactions()
      unsubPartsTransactions()
    }
  }, [])

  const recentActivity = (() => {
    if (!transactionsLoaded || !partsTransactionsLoaded) return []

    const today = new Date().toISOString().split('T')[0]
    const activities = []

    recentTransactions.forEach((t) => {
      const isToday = t.transactionDate === today
      activities.push({
        id: `trans-${t.id}`,
        action: `Transaction: ${t.transactionNo} - ${t.customerName || 'Walk-in'}`,
        time: isToday ? 'Today' : new Date(t.transactionDate).toLocaleDateString(),
        type: 'add',
      })
    })

    recentPartsTransactions.forEach((t) => {
      const isToday = t.transactionDate === today
      activities.push({
        id: `partstrans-${t.id}`,
        action: `Parts sold: ${t.inventoryName || 'Parts'} x${t.quantity}`,
        time: isToday ? 'Today' : new Date(t.transactionDate).toLocaleDateString(),
        type: 'update',
      })
    })

    if (activities.length === 0) {
      return [{ id: 1, action: 'No recent activity found', time: '—', type: 'default' }]
    }

    activities.sort((a, b) => {
      if (a.time === 'Today' && b.time !== 'Today') return -1
      if (b.time === 'Today' && a.time !== 'Today') return 1
      return 0
    })
    return activities.slice(0, 3)
  })()

  const getActivityIcon = (type) => {
    switch(type) {
      case 'add': return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'update': return <RefreshCw className="w-4 h-4 text-blue-500" />
      default: return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-[1440px] mx-auto">
      {/* Stats Cards - 4 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm hover:shadow-md transition hover:border-black group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45464d] uppercase tracking-wider">Total Items</p>
              <p className="text-2xl font-bold text-[#0b1c30]">{stats.totalItems}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm hover:shadow-md transition hover:border-black group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-lg group-hover:bg-red-100 transition">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45464d] uppercase tracking-wider">Low Stock</p>
              <p className="text-2xl font-bold text-[#ba1a1a]">{stats.lowStock}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm hover:shadow-md transition hover:border-black group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-green-50 rounded-lg group-hover:bg-green-100 transition">
              <Bike className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45464d] uppercase tracking-wider">Motorcycles</p>
              <p className="text-2xl font-bold text-[#0b1c30]">{stats.totalMotorcycles}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm hover:shadow-md transition hover:border-black group">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-purple-50 rounded-lg group-hover:bg-purple-100 transition">
              <Wrench className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45464d] uppercase tracking-wider">Parts</p>
              <p className="text-2xl font-bold text-[#0b1c30]">{stats.totalParts}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity - PURE DATABASE DATA, NO HARDCODE */}
      <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Recent Activity
          </h3>
          <span className="text-xs text-[#45464d]">Latest updates</span>
        </div>
        
        {recentActivity.length === 0 || recentActivity[0]?.action === 'No recent activity found' ? (
          <div className="text-center py-8 text-[#45464d]">
            <Clock className="w-8 h-8 mx-auto text-[#c6c6cd] mb-2" />
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center justify-between py-2 border-b border-[#c6c6cd] last:border-0 hover:bg-[#f8f9ff] px-2 rounded-lg transition">
                <div className="flex items-center gap-3">
                  {getActivityIcon(activity.type)}
                  <span className="text-sm text-[#0b1c30]">{activity.action}</span>
                </div>
                <span className="text-xs text-[#45464d]">{activity.time}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default StaffDashboard