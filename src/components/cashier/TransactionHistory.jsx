// src/components/cashier/TransactionHistory.jsx
import { useState, useEffect, useRef } from 'react'
import Swal from '../../lib/swal'
import { watchTransactions, watchPartsTransactions, watchInstallmentPayments } from '../../lib/transactions'
import InstallmentPayments from './InstallmentPayments'

function TransactionHistory() {
  const [rawTransactions, setRawTransactions] = useState([])
  const [rawPartsTransactions, setRawPartsTransactions] = useState([])
  const [modelsLoaded, setModelsLoaded] = useState(false)
  const [partsLoaded, setPartsLoaded] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [selectedTransactionForPayment, setSelectedTransactionForPayment] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [isLoadingPayments, setIsLoadingPayments] = useState(false)
  const [activeTab, setActiveTab] = useState('all') // 'all', 'models', 'parts'

  const paymentsUnsubRef = useRef(null)
  const isLoading = !(modelsLoaded && partsLoaded)

  useEffect(() => {
    const unsubModels = watchTransactions(
      (list) => { setRawTransactions(list); setModelsLoaded(true) },
      (error) => {
        console.error('Error fetching transactions:', error)
        setModelsLoaded(true)
        Swal.fire({ icon: 'error', title: 'Connection Error', text: 'Unable to fetch transactions. Please try again.', confirmButtonColor: '#3B82F6' })
      }
    )
    const unsubParts = watchPartsTransactions(
      (list) => { setRawPartsTransactions(list); setPartsLoaded(true) },
      (error) => {
        console.error('Error fetching parts transactions:', error)
        setPartsLoaded(true)
        Swal.fire({ icon: 'error', title: 'Connection Error', text: 'Unable to fetch transactions. Please try again.', confirmButtonColor: '#3B82F6' })
      }
    )
    return () => {
      unsubModels()
      unsubParts()
      if (paymentsUnsubRef.current) paymentsUnsubRef.current()
    }
  }, [])

  const matchesFilters = (t) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      const haystack = `${t.transactionNo || ''} ${t.customerName || ''} ${t.inventoryName || ''}`.toLowerCase()
      if (!haystack.includes(term)) return false
    }
    if (statusFilter && t.status !== statusFilter) return false
    if (paymentTypeFilter && t.paymentType !== paymentTypeFilter) return false
    if (dateFrom && t.transactionDate < dateFrom) return false
    if (dateTo && t.transactionDate > dateTo) return false
    return true
  }

  const models = rawTransactions.map((t) => ({ ...t, transaction_type: 'model' }))
  const parts = rawPartsTransactions.map((t) => ({ ...t, transaction_type: 'part' }))
  const allTransactions = [...models, ...parts].filter(matchesFilters)
  const partsTransactions = allTransactions.filter((t) => t.transaction_type === 'part')

  const getCurrentTransactions = () => {
    if (activeTab === 'parts') return partsTransactions
    if (activeTab === 'models') return allTransactions.filter((t) => t.transaction_type === 'model')
    return allTransactions
  }

  const currentTransactions = getCurrentTransactions()

  const closeDetailsModal = () => {
    setShowDetailsModal(false)
    if (paymentsUnsubRef.current) {
      paymentsUnsubRef.current()
      paymentsUnsubRef.current = null
    }
  }

  const viewTransactionDetails = (transaction) => {
    setSelectedTransaction(transaction)
    setPaymentHistory([])
    setShowDetailsModal(true)

    if (paymentsUnsubRef.current) {
      paymentsUnsubRef.current()
      paymentsUnsubRef.current = null
    }

    if (transaction.transaction_type === 'model' && transaction.paymentType === 'Installment') {
      setIsLoadingPayments(true)
      paymentsUnsubRef.current = watchInstallmentPayments(
        transaction.id,
        (list) => { setPaymentHistory(list); setIsLoadingPayments(false) },
        (error) => {
          console.error('Error fetching payments:', error)
          setIsLoadingPayments(false)
        }
      )
    }
  }

  const viewInstallmentPayments = (transaction) => {
    setSelectedTransactionForPayment(transaction)
    setShowPaymentsModal(true)
  }

  const printInvoice = (transaction) => {
    const printWindow = window.open('', '_blank')

    const isPart = transaction.transaction_type === 'part'
    const customerName = transaction.customerName || 'N/A'
    const customerContact = transaction.customerContact || 'N/A'
    const customerEmail = transaction.email || 'N/A'
    const customerAddress = transaction.homeAddress || 'N/A'

    const productName = transaction.inventoryName || 'N/A'
    const productBrand = transaction.brand || 'N/A'
    const engineNumber = transaction.engineNumber || 'N/A'
    const chassisNumber = transaction.chassisNumber || 'N/A'
    const color = transaction.color || 'N/A'
    const quantity = transaction.quantity || 1

    const sellingPrice = parseFloat(transaction.sellingPrice || transaction.totalAmount || 0)
    const amountPaid = parseFloat(transaction.amountPaid || 0)
    const downPayment = parseFloat(transaction.downPayment || 0)
    const terms = transaction.terms || 'N/A'
    const monthlyAmount = parseFloat(transaction.monthlyAmount || 0)
    const balance = parseFloat(transaction.remainingBalance || 0)
    const change = isPart ? (transaction.changeAmount || amountPaid - sellingPrice) : amountPaid - sellingPrice

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${transaction.transactionNo}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Arial', sans-serif; margin: 0; padding: 20px; background: #fff; }
          .invoice-container { max-width: 800px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; background: #fff; }
          .header { text-align: center; border-bottom: 2px solid #000; margin-bottom: 20px; padding-bottom: 15px; }
          .header h1 { margin: 0; color: #333; font-size: 24px; }
          .header p { margin: 5px 0; color: #666; font-size: 12px; }
          .header h2 { margin: 10px 0 0; font-size: 18px; }
          .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 10px; font-weight: bold; margin-left: 10px; }
          .badge-part { background: #dbeafe; color: #1e40af; }
          .badge-model { background: #000; color: #fff; }
          .invoice-details { margin-bottom: 20px; padding: 10px; background: #f8f9ff; border-radius: 5px; }
          .invoice-details p { margin: 5px 0; }
          .section { margin-bottom: 20px; border: 1px solid #eee; padding: 15px; border-radius: 5px; }
          .section h3 { margin-top: 0; margin-bottom: 10px; color: #333; font-size: 16px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
          .info-row { margin-bottom: 8px; }
          .info-label { font-weight: bold; display: inline-block; width: 120px; font-size: 13px; }
          .info-value { display: inline-block; font-size: 13px; }
          .payment-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          .payment-table th, .payment-table td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
          .payment-table th { font-weight: bold; background: #f5f5f5; }
          .payment-table td:last-child, .payment-table th:last-child { text-align: right; }
          .total-row { border-top: 2px solid #000; font-weight: bold; }
          .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; font-size: 11px; color: #666; }
          @media print { body { margin: 0; padding: 0; } .invoice-container { border: none; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <h1>EURO MOTOR SHOP</h1>
            <p>123 Motorcycle Street, Manila, Philippines</p>
            <p>Tel: (02) 1234-5678 | Email: info@euromotor.com</p>
            <h2>SALES INVOICE
              <span class="badge ${isPart ? 'badge-part' : 'badge-model'}">${isPart ? 'PART' : 'MODEL'}</span>
            </h2>
          </div>

          <div class="invoice-details">
            <p><strong>Invoice No:</strong> ${transaction.transactionNo}</p>
            <p><strong>Date:</strong> ${formatDate(transaction.transactionDate)}</p>
            <p><strong>Processed By:</strong> ${transaction.processedBy?.name || 'Unknown'} (${transaction.processedBy?.role || 'Unknown'})</p>
          </div>

          <div class="section">
            <h3>Customer Information</h3>
            <div class="info-row"><span class="info-label">Name:</span><span class="info-value">${customerName}</span></div>
            <div class="info-row"><span class="info-label">Contact Number:</span><span class="info-value">${customerContact}</span></div>
            <div class="info-row"><span class="info-label">Email:</span><span class="info-value">${customerEmail}</span></div>
            <div class="info-row"><span class="info-label">Address:</span><span class="info-value">${customerAddress}</span></div>
          </div>

          <div class="section">
            <h3>${isPart ? 'Part' : 'Product'} Information</h3>
            <div class="info-row"><span class="info-label">${isPart ? 'Part' : 'Model'}:</span><span class="info-value">${productName}</span></div>
            ${!isPart ? `<div class="info-row"><span class="info-label">Brand:</span><span class="info-value">${productBrand}</span></div>` : ''}
            ${!isPart ? `<div class="info-row"><span class="info-label">Engine Number:</span><span class="info-value">${engineNumber}</span></div>` : ''}
            ${!isPart ? `<div class="info-row"><span class="info-label">Chassis Number:</span><span class="info-value">${chassisNumber}</span></div>` : ''}
            ${!isPart ? `<div class="info-row"><span class="info-label">Color:</span><span class="info-value">${color}</span></div>` : ''}
            ${isPart ? `<div class="info-row"><span class="info-label">Quantity:</span><span class="info-value">${quantity}</span></div>` : ''}
          </div>

          <div class="section">
            <h3>Payment Details</h3>
            <table class="payment-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${isPart ? 'Total Amount' : 'Selling Price'}</td>
                  <td>${formatCurrency(sellingPrice)}</td>
                </tr>
                ${isPart ? `
                  <tr>
                    <td>Amount Paid</td>
                    <td>${formatCurrency(amountPaid)}</td>
                  </tr>
                  <tr>
                    <td>Change</td>
                    <td>${formatCurrency(change > 0 ? change : 0)}</td>
                  </tr>
                ` : transaction.paymentType === 'Cash' ? `
                  <tr>
                    <td>Amount Paid</td>
                    <td>${formatCurrency(amountPaid)}</td>
                  </tr>
                  <tr>
                    <td>Change</td>
                    <td>${formatCurrency(change > 0 ? change : 0)}</td>
                  </tr>
                ` : `
                  <tr>
                    <td>Down Payment</td>
                    <td>${formatCurrency(downPayment)}</td>
                  </tr>
                  <tr>
                    <td>Terms</td>
                    <td>${terms} months</td>
                  </tr>
                  <tr>
                    <td>Monthly Amortization</td>
                    <td>${formatCurrency(monthlyAmount)}</td>
                  </tr>
                  <tr>
                    <td>Remaining Balance</td>
                    <td>${formatCurrency(balance)}</td>
                  </tr>
                `}
                <tr class="total-row">
                  <td><strong>Total Amount</strong></td>
                  <td><strong>${formatCurrency(isPart ? amountPaid : (transaction.paymentType === 'Cash' ? amountPaid : downPayment))}</strong></td>
                </tr>
              </tbody>
            </table>
          </div>

          ${transaction.notes ? `<div class="section"><h3>Notes</h3><p>${transaction.notes}</p></div>` : ''}

          <div class="footer">
            <p>Thank you for your purchase!</p>
            <p>This is a computer-generated invoice. No signature required.</p>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); setTimeout(function() { window.close(); }, 500); }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const getStatusBadge = (status) => {
    const badges = {
      'Completed': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Cancelled': 'bg-red-100 text-red-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentStatusBadge = (status) => {
    const badges = {
      'Paid': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Overdue': 'bg-red-100 text-red-800',
      'Partial': 'bg-blue-100 text-blue-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
  }

  const getPaymentTypeBadge = (type) => {
    return type === 'Cash'
      ? 'bg-blue-100 text-blue-800'
      : 'bg-purple-100 text-purple-800'
  }

  const getTransactionTypeBadge = (type) => {
    return type === 'part'
      ? 'bg-blue-600 text-white'
      : 'bg-black text-white'
  }

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₱0.00'
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

  const formatDateTime = (date) => {
    if (!date) return '—'
    return new Date(date).toLocaleString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setPaymentTypeFilter('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="p-4 sm:p-5">

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-[#c6c6cd]">
        <button
          onClick={() => { setActiveTab('all') }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-black text-black'
              : 'border-transparent text-[#45464d] hover:text-black'
          }`}
        >
          All Transactions
        </button>
        <button
          onClick={() => { setActiveTab('models') }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'models'
              ? 'border-black text-black'
              : 'border-transparent text-[#45464d] hover:text-black'
          }`}
        >
          <span className="material-symbols-outlined text-sm">motorcycle</span>
          Models
        </button>
        <button
          onClick={() => { setActiveTab('parts') }}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors flex items-center gap-1 ${
            activeTab === 'parts'
              ? 'border-black text-black'
              : 'border-transparent text-[#45464d] hover:text-black'
          }`}
        >
          <span className="material-symbols-outlined text-sm">build</span>
          Parts
        </button>
        <span className="ml-auto text-xs text-[#45464d] self-center">
          {currentTransactions.length} transaction(s)
        </span>
      </div>

      {/* Filters */}
      <div className="bg-white border border-[#c6c6cd] rounded-xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="text-xs font-semibold text-[#45464d] mb-1 block">Search</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
              <input
                type="text"
                placeholder="Search..."
                className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {activeTab !== 'parts' && (
            <>
              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Status</label>
                <select
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Completed">Completed</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Payment Type</label>
                <select
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                >
                  <option value="">All Types</option>
                  <option value="Cash">Cash</option>
                  <option value="Installment">Installment</option>
                </select>
              </div>
            </>
          )}

          {activeTab === 'parts' && (
            <>
              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Status</label>
                <select
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Status</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Payment Type</label>
                <select
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  disabled
                >
                  <option value="Cash">Cash (Parts Only)</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="text-xs font-semibold text-[#45464d] mb-1 block">Date From</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#45464d] mb-1 block">Date To</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        {(searchTerm || statusFilter || paymentTypeFilter || dateFrom || dateTo) && (
          <div className="mt-3 flex justify-end">
            <button onClick={clearFilters} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">clear</span>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden lg:block bg-white border border-[#c6c6cd] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f8f9ff] border-b border-[#c6c6cd]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Transaction #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Payment Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#45464d]">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#45464d]">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#45464d]">Processed By</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#45464d]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c6cd]">
              {isLoading ? (
                <tr>
                  <td colSpan="11" className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  </td>
                </tr>
              ) : currentTransactions.length === 0 ? (
                <tr>
                  <td colSpan="11" className="px-4 py-8 text-center text-[#45464d]">
                    <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : (
                currentTransactions.map((transaction) => {
                  const isPart = transaction.transaction_type === 'part'
                  return (
                    <tr key={transaction.id} className="hover:bg-[#f8f9ff] transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-sm font-mono font-semibold">{transaction.transactionNo}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getTransactionTypeBadge(isPart ? 'part' : 'model')}`}>
                          {isPart ? 'PART' : 'MODEL'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {formatDate(transaction.transactionDate)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium">{transaction.customerName}</p>
                        <p className="text-xs text-[#45464d]">{transaction.customerContact}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                            <img
                              src={transaction.imageUrl || 'https://via.placeholder.com/32x32'}
                              className="w-full h-full object-cover"
                              alt="product"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{transaction.inventoryName}</p>
                            <p className="text-xs text-[#45464d]">{transaction.brand || (isPart ? 'Part' : '')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-sm font-semibold">{transaction.quantity || 1}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentTypeBadge(transaction.paymentType)}`}>
                          {transaction.paymentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="text-sm font-semibold">{formatCurrency(transaction.sellingPrice || transaction.totalAmount)}</p>
                        {!isPart && transaction.paymentType === 'Installment' && transaction.remainingBalance > 0 && (
                          <p className="text-xs text-orange-600">Balance: {formatCurrency(transaction.remainingBalance)}</p>
                        )}
                        {isPart && transaction.changeAmount > 0 && (
                          <p className="text-xs text-green-600">Change: {formatCurrency(transaction.changeAmount)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(transaction.status)}`}>
                          {transaction.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex flex-col items-center">
                          <p className="text-xs font-medium">{transaction.processedBy?.name || 'Unknown'}</p>
                          <p className="text-xs text-[#45464d]">{transaction.processedBy?.role || 'Unknown'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            // eslint-disable-next-line react-hooks/refs -- ref is only read/reassigned inside viewTransactionDetails, invoked from this click handler, never during render
                            onClick={() => viewTransactionDetails(transaction)}
                            className="p-1 hover:text-blue-600 transition-colors"
                            title="View Details"
                          >
                            <span className="material-symbols-outlined text-base">visibility</span>
                          </button>
                          <button
                            onClick={() => printInvoice(transaction)}
                            className="p-1 hover:text-black transition-colors"
                            title="Print Invoice"
                          >
                            <span className="material-symbols-outlined text-base">print</span>
                          </button>
                          {!isPart && transaction.paymentType === 'Installment' && (
                            <button
                              onClick={() => viewInstallmentPayments(transaction)}
                              className="p-1 hover:text-purple-600 transition-colors"
                              title="View Installment Payments"
                            >
                              <span className="material-symbols-outlined text-base">receipt</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : currentTransactions.length === 0 ? (
          <div className="text-center py-8 text-[#45464d]">
            <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
            <p>No transactions found</p>
          </div>
        ) : (
          currentTransactions.map((transaction) => {
            const isPart = transaction.transaction_type === 'part'
            return (
              <div key={transaction.id} className="bg-white border border-[#c6c6cd] rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold bg-gray-100 px-2 py-1 rounded">
                      {transaction.transactionNo}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full ${getTransactionTypeBadge(isPart ? 'part' : 'model')}`}>
                      {isPart ? 'PART' : 'MODEL'}
                    </span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(transaction.status)}`}>
                    {transaction.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#c6c6cd]">
                  <div className="w-10 h-10 rounded-full bg-[#e5eeff] flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg text-black">person</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{transaction.customerName}</p>
                    <p className="text-xs text-[#45464d]">{transaction.customerContact}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#c6c6cd]">
                  <div className="w-10 h-10 rounded-lg bg-[#e5eeff] overflow-hidden">
                    <img
                      src={transaction.imageUrl || 'https://via.placeholder.com/40x40'}
                      className="w-full h-full object-cover"
                      alt="product"
                    />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{transaction.inventoryName}</p>
                    <p className="text-xs text-[#45464d]">Qty: {transaction.quantity || 1}</p>
                  </div>
                </div>

                <div className="space-y-2 mb-3 pb-3 border-b border-[#c6c6cd]">
                  <div className="flex justify-between">
                    <span className="text-xs text-[#45464d]">Payment Type</span>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPaymentTypeBadge(transaction.paymentType)}`}>
                      {transaction.paymentType}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[#45464d]">Amount</span>
                    <span className="text-sm font-semibold">{formatCurrency(transaction.sellingPrice || transaction.totalAmount)}</span>
                  </div>
                  {isPart && transaction.changeAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[#45464d]">Change</span>
                      <span className="text-sm text-green-600 font-semibold">{formatCurrency(transaction.changeAmount)}</span>
                    </div>
                  )}
                  {!isPart && transaction.paymentType === 'Installment' && transaction.remainingBalance > 0 && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[#45464d]">Balance</span>
                      <span className="text-xs text-orange-600 font-semibold">{formatCurrency(transaction.remainingBalance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-[#45464d]">Date</span>
                    <span className="text-xs">{formatDate(transaction.transactionDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-[#45464d]">Processed By</span>
                    <span className="text-xs font-medium">{transaction.processedBy?.name || 'Unknown'}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    // eslint-disable-next-line react-hooks/refs -- ref is only read/reassigned inside viewTransactionDetails, invoked from this click handler, never during render
                    onClick={() => viewTransactionDetails(transaction)}
                    className="px-3 py-1.5 hover:text-blue-600 rounded-lg text-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">visibility</span>
                    View
                  </button>
                  <button
                    onClick={() => printInvoice(transaction)}
                    className="px-3 py-1.5 hover:text-black rounded-lg text-sm flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">print</span>
                    Print
                  </button>
                  {!isPart && transaction.paymentType === 'Installment' && (
                    <button
                      onClick={() => viewInstallmentPayments(transaction)}
                      className="px-3 py-1.5 hover:text-purple-600 rounded-lg text-sm flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">receipt</span>
                      Payments
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={closeDetailsModal}>
          <div className="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#c6c6cd] p-4 flex flex-wrap justify-between items-center gap-2">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold">Transaction Details</h3>
                <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${getTransactionTypeBadge(selectedTransaction.transaction_type || 'model')}`}>
                  {selectedTransaction.transaction_type === 'part' ? 'PART' : 'MODEL'}
                </span>
              </div>
              <div className="flex gap-2">
                {selectedTransaction.transaction_type !== 'part' && selectedTransaction.paymentType === 'Installment' && (
                  <button
                    onClick={() => {
                      setShowDetailsModal(false)
                      viewInstallmentPayments(selectedTransaction)
                    }}
                    className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">receipt</span> Payments
                  </button>
                )}
                <button
                  onClick={() => printInvoice(selectedTransaction)}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-sm">print</span> Print
                </button>
                <button
                  onClick={closeDetailsModal}
                  className="p-1 text-[#45464d] hover:text-black"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gradient-to-r from-black to-gray-800 text-white p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="text-xs opacity-70">Transaction #</p>
                    <p className="text-base sm:text-lg font-mono font-bold">{selectedTransaction.transactionNo}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs opacity-70">Date</p>
                    <p className="text-sm">{formatDate(selectedTransaction.transactionDate)}</p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-white/20">
                  <p className="text-xs opacity-70">Processed By</p>
                  <p className="text-sm font-medium">{selectedTransaction.processedBy?.name} ({selectedTransaction.processedBy?.role})</p>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="text-xs font-semibold text-[#45464d] uppercase mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">person</span>
                  Customer Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-[#45464d]">Full Name</p>
                    <p className="text-sm font-medium">{selectedTransaction.customerName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#45464d]">Contact Number</p>
                    <p className="text-sm">{selectedTransaction.customerContact || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#45464d]">Email</p>
                    <p className="text-sm">{selectedTransaction.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#45464d]">Address</p>
                    <p className="text-sm">{selectedTransaction.homeAddress || '—'}</p>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="text-xs font-semibold text-[#45464d] uppercase mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">{selectedTransaction.transaction_type === 'part' ? 'build' : 'motorcycle'}</span>
                  {selectedTransaction.transaction_type === 'part' ? 'Part' : 'Product'} Information
                </h4>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-20 h-20 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                    <img
                      src={selectedTransaction.imageUrl || 'https://via.placeholder.com/80x80'}
                      className="w-full h-full object-cover"
                      alt="product"
                    />
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#45464d]">{selectedTransaction.transaction_type === 'part' ? 'Part' : 'Model'}</p>
                      <p className="text-sm font-medium">{selectedTransaction.inventoryName}</p>
                      {selectedTransaction.transaction_type !== 'part' && (
                        <p className="text-xs text-[#45464d]">{selectedTransaction.brand} • {selectedTransaction.inventoryType}</p>
                      )}
                    </div>
                    {selectedTransaction.transaction_type === 'part' ? (
                      <div>
                        <p className="text-xs text-[#45464d]">Quantity</p>
                        <p className="text-sm font-semibold">{selectedTransaction.quantity || 1}</p>
                        <p className="text-xs text-[#45464d] mt-2">Price per unit</p>
                        <p className="text-sm font-semibold">{formatCurrency(selectedTransaction.price || 0)}</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-[#45464d]">Unit Details</p>
                        <p className="text-xs font-mono">Engine: {selectedTransaction.engineNumber}</p>
                        <p className="text-xs font-mono">Chassis: {selectedTransaction.chassisNumber}</p>
                        <p className="text-xs">Color: {selectedTransaction.color || '—'}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4">
                <h4 className="text-xs font-semibold text-[#45464d] uppercase mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">payments</span>
                  Payment Details
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between py-1 border-b">
                    <span className="text-sm">{selectedTransaction.transaction_type === 'part' ? 'Total Amount' : 'Selling Price'}</span>
                    <span className="text-sm font-semibold">{formatCurrency(selectedTransaction.sellingPrice || selectedTransaction.totalAmount)}</span>
                  </div>

                  {selectedTransaction.transaction_type === 'part' ? (
                    <>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Amount Paid</span>
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(selectedTransaction.amountPaid)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm">Change</span>
                        <span className="text-sm font-semibold text-blue-600">{formatCurrency(selectedTransaction.changeAmount || 0)}</span>
                      </div>
                    </>
                  ) : selectedTransaction.paymentType === 'Cash' ? (
                    <>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Amount Paid</span>
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(selectedTransaction.amountPaid)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm">Change</span>
                        <span className="text-sm font-semibold text-blue-600">{formatCurrency(selectedTransaction.amountPaid - selectedTransaction.sellingPrice)}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Down Payment</span>
                        <span className="text-sm font-semibold">{formatCurrency(selectedTransaction.downPayment)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Terms</span>
                        <span className="text-sm font-semibold">{selectedTransaction.terms} months</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Monthly Amortization</span>
                        <span className="text-sm font-semibold">{formatCurrency(selectedTransaction.monthlyAmount)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm">Remaining Balance</span>
                        <span className="text-sm font-semibold text-orange-600">{formatCurrency(selectedTransaction.remainingBalance)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Payment History - Only for Model Installment */}
              {selectedTransaction.transaction_type !== 'part' && selectedTransaction.paymentType === 'Installment' && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-[#45464d] uppercase mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">receipt</span>
                    Payment History
                    <button
                      onClick={() => {
                        setShowDetailsModal(false)
                        viewInstallmentPayments(selectedTransaction)
                      }}
                      className="ml-auto text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">add</span>
                      Add Payment
                    </button>
                  </h4>

                  {isLoadingPayments ? (
                    <div className="flex justify-center py-6">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-black"></div>
                    </div>
                  ) : paymentHistory.length === 0 ? (
                    <div className="text-center py-6 text-[#45464d]">
                      <span className="material-symbols-outlined text-3xl mb-1">receipt_long</span>
                      <p className="text-sm">No payment records yet</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-[#f8f9ff]">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-[#45464d]">Payment #</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-[#45464d]">Due Date</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-[#45464d]">Payment Date</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-[#45464d]">Amount Due</th>
                            <th className="px-3 py-2 text-right text-xs font-semibold text-[#45464d]">Amount Paid</th>
                            <th className="px-3 py-2 text-center text-xs font-semibold text-[#45464d]">Status</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-[#45464d]">Reference No</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-[#45464d]">Notes</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#c6c6cd]">
                          {paymentHistory.map((payment, index) => (
                            <tr key={payment.id || index} className="hover:bg-[#f8f9ff]">
                              <td className="px-3 py-2 text-xs font-mono">{payment.paymentNo || index + 1}</td>
                              <td className="px-3 py-2 text-xs whitespace-nowrap">{formatDate(payment.dueDate)}</td>
                              <td className="px-3 py-2 text-xs whitespace-nowrap">{payment.paymentDate ? formatDateTime(payment.paymentDate) : '—'}</td>
                              <td className="px-3 py-2 text-xs text-right font-semibold">{formatCurrency(payment.amountDue)}</td>
                              <td className="px-3 py-2 text-xs text-right font-semibold text-green-600">{formatCurrency(payment.amountPaid)}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getPaymentStatusBadge(payment.status)}`}>
                                  {payment.status}
                                </span>
                              </td>
                              <td className="px-3 py-2 text-xs font-mono">{payment.referenceNo || '—'}</td>
                              <td className="px-3 py-2 text-xs text-[#45464d] max-w-[150px] truncate">{payment.notes || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-[#f8f9ff] border-t border-[#c6c6cd]">
                          <tr>
                            <td colSpan="4" className="px-3 py-2 text-xs font-semibold text-right">Total Paid:</td>
                            <td className="px-3 py-2 text-xs font-semibold text-right text-green-600">
                              {formatCurrency(paymentHistory.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0))}
                            </td>
                            <td colSpan="3"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {selectedTransaction.notes && (
                <div className="border rounded-lg p-4">
                  <h4 className="text-xs font-semibold text-[#45464d] uppercase mb-2">Notes</h4>
                  <p className="text-sm">{selectedTransaction.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Installment Payments Modal */}
      {showPaymentsModal && selectedTransactionForPayment && (
        <InstallmentPayments
          transactionId={selectedTransactionForPayment.id}
          onClose={() => {
            setShowPaymentsModal(false)
            if (showDetailsModal && selectedTransaction) {
              viewTransactionDetails(selectedTransaction)
            }
          }}
          onPaymentComplete={() => {
            if (showDetailsModal && selectedTransaction) {
              viewTransactionDetails(selectedTransaction)
            }
          }}
        />
      )}
    </div>
  )
}

export default TransactionHistory
