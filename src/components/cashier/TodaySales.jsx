// src/components/cashier/TodaySales.jsx
import { useState, useEffect } from 'react'

function TodaySales() {
  const [sales, setSales] = useState([])
  const [totalSales, setTotalSales] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  const fetchTodaySales = async () => {
    setIsLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const response = await fetch(`http://localhost:8080/motor-shop/backend/api/get-transactions.php?date_from=${today}&date_to=${today}`)
      const data = await response.json()

      if (data.success && data.transactions) {
        setSales(data.transactions)
        const total = data.transactions.reduce((sum, t) => sum + parseFloat(t.selling_price || 0), 0)
        setTotalSales(total)
      }
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Standard fetch-on-mount: setIsLoading(true) runs before the first
    // await, which is the correct shape for this, not the "derived state"
    // anti-pattern the rule otherwise targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchTodaySales()
  }, [])

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fil-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount)
  }

  const formatTime = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleTimeString('en-PH', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status) => {
    const badges = {
      'Completed': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Cancelled': 'bg-red-100 text-red-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentTypeBadge = (type) => {
    return type === 'Cash' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800'
  }

  return (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-[#0b1c30]">Today's Sales</h2>
            <p className="text-sm text-[#45464d] mt-1">Summary of today's transactions</p>
          </div>
          <button 
            onClick={fetchTodaySales}
            className="px-3 sm:px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border border-[#c6c6cd] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <span className="material-symbols-outlined text-blue-600">point_of_sale</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45464d] uppercase">Total Sales</p>
              {isLoading ? (
                <div className="h-6 w-24 bg-gray-200 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-xl font-bold text-[#0b1c30]">{formatCurrency(totalSales)}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#c6c6cd] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-50 rounded-lg">
              <span className="material-symbols-outlined text-green-600">receipt_long</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45464d] uppercase">Transactions</p>
              {isLoading ? (
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-xl font-bold text-[#0b1c30]">{sales.length}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#c6c6cd] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <span className="material-symbols-outlined text-purple-600">payments</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45464d] uppercase">Cash Sales</p>
              {isLoading ? (
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-xl font-bold text-[#0b1c30]">
                  {sales.filter(s => s.payment_type === 'Cash').length}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-[#c6c6cd] shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <span className="material-symbols-outlined text-orange-600">installment</span>
            </div>
            <div>
              <p className="text-xs font-semibold text-[#45464d] uppercase">Installment</p>
              {isLoading ? (
                <div className="h-6 w-16 bg-gray-200 rounded animate-pulse mt-1"></div>
              ) : (
                <p className="text-xl font-bold text-[#0b1c30]">
                  {sales.filter(s => s.payment_type === 'Installment').length}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white border border-[#c6c6cd] rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-[#c6c6cd] bg-[#f8f9ff]">
          <h3 className="text-sm font-semibold text-[#0b1c30] flex items-center gap-2">
            <span className="material-symbols-outlined text-base">receipt_long</span>
            Transaction Details
          </h3>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 text-[#45464d]">
            <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
            <p>No sales recorded today</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[#f8f9ff] border-b border-[#c6c6cd]">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Transaction #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Payment Type</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-[#45464d]">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#45464d]">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-[#45464d]">Processed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c6cd]">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="px-4 py-3 text-sm font-mono font-semibold">
                      {sale.transaction_no}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#45464d] whitespace-nowrap">
                      {formatTime(sale.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{sale.customer_name}</p>
                      <p className="text-xs text-[#45464d]">{sale.contact_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                          <img 
                            src={sale.image || 'https://via.placeholder.com/32x32'} 
                            className="w-full h-full object-cover" 
                            alt="product" 
                          />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{sale.product_name}</p>
                          <p className="text-xs text-[#45464d]">{sale.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentTypeBadge(sale.payment_type)}`}>
                        {sale.payment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold">{formatCurrency(sale.selling_price)}</p>
                      {sale.payment_type === 'Installment' && sale.balance > 0 && (
                        <p className="text-xs text-orange-600">Balance: {formatCurrency(sale.balance)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(sale.status)}`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <p className="text-xs font-medium">{sale.processed_by_name || 'Unknown'}</p>
                        <p className="text-[10px] text-[#45464d]">{sale.processed_by_role || '—'}</p>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#f8f9ff] border-t border-[#c6c6cd]">
                <tr>
                  <td colSpan="5" className="px-4 py-3 text-xs font-semibold text-[#45464d]">Total</td>
                  <td className="px-4 py-3 text-right text-sm font-bold text-[#0b1c30]">
                    {isLoading ? '...' : formatCurrency(totalSales)}
                  </td>
                  <td colSpan="2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default TodaySales