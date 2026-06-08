import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import InstallmentPayments from './InstallmentPayments'

function TransactionList({ onNavigateToTransaction }) {
  const [transactions, setTransactions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedTransactions, setSelectedTransactions] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [showPaymentsModal, setShowPaymentsModal] = useState(false)
  const [selectedTransactionForPayment, setSelectedTransactionForPayment] = useState(null)

  useEffect(() => {
    fetchTransactions()
  }, [searchTerm, statusFilter, paymentTypeFilter, dateFrom, dateTo])

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      let url = 'http://localhost:8080/motor-shop/backend/api/get-transactions.php?'
      const params = []
      
      if (searchTerm) params.push(`search=${encodeURIComponent(searchTerm)}`)
      if (statusFilter) params.push(`status=${statusFilter}`)
      if (paymentTypeFilter) params.push(`payment_type=${paymentTypeFilter}`)
      if (dateFrom) params.push(`date_from=${dateFrom}`)
      if (dateTo) params.push(`date_to=${dateTo}`)
      
      url += params.join('&')
      
      const response = await fetch(url)
      const data = await response.json()
      
      if (data.success) {
        setTransactions(data.transactions)
        setSelectedTransactions([])
        setSelectAll(false)
      } else {
        console.error('Error fetching transactions:', data.message)
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to fetch transactions. Please try again.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Refresh function for after payment completion
  const handleRefreshTransactions = () => {
    fetchTransactions()
  }

  const viewTransactionDetails = async (id) => {
    try {
      const response = await fetch(`http://localhost:8080/motor-shop/backend/api/get-transaction-details.php?id=${id}`)
      const data = await response.json()
      
      if (data.success) {
        setSelectedTransaction(data.transaction)
        setShowDetailsModal(true)
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message,
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to fetch transaction details.',
        confirmButtonColor: '#3B82F6'
      })
    }
  }

  const viewInstallmentPayments = (transaction) => {
    setSelectedTransactionForPayment(transaction)
    setShowPaymentsModal(true)
  }

  const deleteTransaction = async (id, transactionNo) => {
    const result = await Swal.fire({
      title: 'Delete Transaction?',
      text: `Are you sure you want to delete ${transactionNo}? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Deleting...',
        text: 'Please wait.',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      })

      try {
        const response = await fetch('http://localhost:8080/motor-shop/backend/api/delete-transaction.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: id })
        })
        
        const data = await response.json()
        
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: 'Transaction has been deleted.',
            confirmButtonColor: '#3B82F6',
            timer: 2000,
            showConfirmButton: false
          })
          fetchTransactions()
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.message,
            confirmButtonColor: '#3B82F6'
          })
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete transaction.',
          confirmButtonColor: '#3B82F6'
        })
      }
    }
  }

const printInvoice = (transaction) => {
  // Create a new window for printing
  const printWindow = window.open('', '_blank')
  
  // Get customer details safely
  const customerName = transaction.customer_name || 'N/A'
  const customerContact = transaction.contact_number || 'N/A'
  const customerEmail = transaction.email || 'N/A'
  const customerAddress = transaction.home_address || 'N/A'
  
  // Get product details safely
  const productName = transaction.product_name || 'N/A'
  const productBrand = transaction.brand || 'N/A'
  const engineNumber = transaction.engine_number || 'N/A'
  const chassisNumber = transaction.chassis_number || 'N/A'
  const color = transaction.color || 'N/A'
  
  // Calculate payment details
  const sellingPrice = parseFloat(transaction.selling_price) || 0
  const amountPaid = parseFloat(transaction.amount_paid) || 0
  const downPayment = parseFloat(transaction.down_payment) || 0
  const terms = transaction.terms || 'N/A'
  const monthlyAmount = parseFloat(transaction.monthly_amount) || 0
  const balance = parseFloat(transaction.balance) || 0
  
  const change = amountPaid - sellingPrice
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Invoice ${transaction.transaction_no}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body { 
          font-family: 'Arial', sans-serif; 
          margin: 0; 
          padding: 20px; 
          background: #fff;
        }
        .invoice-container { 
          max-width: 800px; 
          margin: 0 auto; 
          border: 1px solid #ddd; 
          padding: 30px;
          background: #fff;
        }
        .header { 
          text-align: center; 
          border-bottom: 2px solid #000; 
          margin-bottom: 20px; 
          padding-bottom: 15px;
        }
        .header h1 { 
          margin: 0; 
          color: #333;
          font-size: 24px;
        }
        .header p { 
          margin: 5px 0; 
          color: #666;
          font-size: 12px;
        }
        .header h2 {
          margin: 10px 0 0;
          font-size: 18px;
        }
        .invoice-details {
          margin-bottom: 20px;
          padding: 10px;
          background: #f8f9ff;
          border-radius: 5px;
        }
        .invoice-details p {
          margin: 5px 0;
        }
        .section { 
          margin-bottom: 20px; 
          border: 1px solid #eee; 
          padding: 15px;
          border-radius: 5px;
        }
        .section h3 { 
          margin-top: 0; 
          margin-bottom: 10px;
          color: #333;
          font-size: 16px;
          border-bottom: 1px solid #ddd;
          padding-bottom: 8px;
        }
        .info-row {
          margin-bottom: 8px;
        }
        .info-label {
          font-weight: bold;
          display: inline-block;
          width: 120px;
          font-size: 13px;
        }
        .info-value {
          display: inline-block;
          font-size: 13px;
        }
        .payment-table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-top: 10px;
        }
        .payment-table th, .payment-table td { 
          padding: 10px; 
          text-align: left; 
          border-bottom: 1px solid #eee;
        }
        .payment-table th {
          font-weight: bold;
          background: #f5f5f5;
        }
        .payment-table td:last-child,
        .payment-table th:last-child {
          text-align: right;
        }
        .total-row {
          border-top: 2px solid #000;
          font-weight: bold;
        }
        .footer { 
          text-align: center; 
          margin-top: 30px; 
          padding-top: 15px; 
          border-top: 1px solid #ddd; 
          font-size: 11px; 
          color: #666;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .invoice-container { border: none; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="header">
          <h1>EURO MOTOR SHOP</h1>
          <p>123 Motorcycle Street, Manila, Philippines</p>
          <p>Tel: (02) 1234-5678 | Email: info@euromotor.com</p>
          <h2>SALES INVOICE</h2>
        </div>
        
        <div class="invoice-details">
          <p><strong>Invoice No:</strong> ${transaction.transaction_no}</p>
          <p><strong>Date:</strong> ${formatDate(transaction.transaction_date)}</p>
        </div>
        
        <div class="section">
          <h3>Customer Information</h3>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${customerName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Contact Number:</span>
            <span class="info-value">${customerContact}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Email:</span>
            <span class="info-value">${customerEmail}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Address:</span>
            <span class="info-value">${customerAddress}</span>
          </div>
        </div>
        
        <div class="section">
          <h3>Product Information</h3>
          <div class="info-row">
            <span class="info-label">Model:</span>
            <span class="info-value">${productName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Brand:</span>
            <span class="info-value">${productBrand}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Engine Number:</span>
            <span class="info-value">${engineNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Chassis Number:</span>
            <span class="info-value">${chassisNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Color:</span>
            <span class="info-value">${color}</span>
          </div>
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
                <td>Selling Price</td>
                <td>${formatCurrency(sellingPrice)}</td>
              </tr>
              ${transaction.payment_type === 'Cash' ? `
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
                <td><strong>${formatCurrency(transaction.payment_type === 'Cash' ? amountPaid : downPayment)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        
        ${transaction.notes ? `
          <div class="section">
            <h3>Notes</h3>
            <p>${transaction.notes}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>This is a computer-generated invoice. No signature required.</p>
        </div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() {
            window.close();
          }, 500);
        }
      </script>
    </body>
    </html>
  `)
  printWindow.document.close()
}

  const exportToCSV = () => {
    if (transactions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Data',
        text: 'There are no transactions to export.',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    const exportData = transactions.map(t => ({
      'Transaction No': t.transaction_no,
      'Date': formatDate(t.transaction_date),
      'Customer': t.customer_name,
      'Contact': t.contact_number,
      'Product': t.product_name,
      'Brand': t.brand,
      'Engine #': t.engine_number,
      'Chassis #': t.chassis_number,
      'Payment Type': t.payment_type,
      'Selling Price': t.selling_price,
      'Amount Paid': t.amount_paid || 0,
      'Down Payment': t.down_payment || 0,
      'Terms': t.terms || 'N/A',
      'Monthly Amortization': t.monthly_amount || 0,
      'Balance': t.balance || 0,
      'Status': t.status,
      'Notes': t.notes || ''
    }))

    const headers = Object.keys(exportData[0])
    const csvRows = [headers.join(',')]
    
    for (const row of exportData) {
      const values = headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') ? `"${value}"` : value
      })
      csvRows.push(values.join(','))
    }
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    link.setAttribute('href', url)
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    Swal.fire({
      icon: 'success',
      title: 'Exported!',
      text: 'Transactions have been exported to CSV.',
      confirmButtonColor: '#3B82F6',
      timer: 2000
    })
  }

  const handleSelectTransaction = (id) => {
    setSelectedTransactions(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id)
      } else {
        return [...prev, id]
      }
    })
    setSelectAll(false)
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTransactions([])
    } else {
      setSelectedTransactions(transactions.map(t => t.id))
    }
    setSelectAll(!selectAll)
  }

  const bulkDelete = async () => {
    if (selectedTransactions.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'No Selection',
        text: 'Please select transactions to delete.',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    const result = await Swal.fire({
      title: 'Delete Transactions?',
      text: `Are you sure you want to delete ${selectedTransactions.length} transaction(s)? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete all!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Deleting...',
        text: 'Please wait.',
        allowOutsideClick: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading()
      })

      try {
        const response = await fetch('http://localhost:8080/motor-shop/backend/api/bulk-delete-transactions.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: selectedTransactions })
        })
        
        const data = await response.json()
        
        if (data.success) {
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: data.message,
            confirmButtonColor: '#3B82F6',
            timer: 2000,
            showConfirmButton: false
          })
          setSelectedTransactions([])
          setSelectAll(false)
          fetchTransactions()
        } else {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: data.message,
            confirmButtonColor: '#3B82F6'
          })
        }
      } catch (error) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to delete transactions.',
          confirmButtonColor: '#3B82F6'
        })
      }
    }
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

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return '₱0.00'
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

  const handleNewTransaction = () => {
    if (onNavigateToTransaction) {
      onNavigateToTransaction()
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    setStatusFilter('')
    setPaymentTypeFilter('')
    setDateFrom('')
    setDateTo('')
  }

  return (
    <div className="p-4 sm:p-6 max-w-full mx-auto">
      {/* Header */}
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-[#45464d] mb-2">
          <span>Transactions</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-black font-semibold">Transaction List</span>
        </nav>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">Transaction List</h2>
            <p className="text-sm text-[#45464d] mt-1">View and manage all sales transactions.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedTransactions.length > 0 && (
              <button 
                onClick={bulkDelete}
                className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span className="hidden sm:inline">Delete ({selectedTransactions.length})</span>
                <span className="sm:hidden">{selectedTransactions.length}</span>
              </button>
            )}
            <button 
              onClick={exportToCSV}
              className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={handleNewTransaction}
              className="px-3 sm:px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">add</span>
              <span className="hidden sm:inline">New Transaction</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters - Responsive Grid */}
      <div className="bg-white border border-[#c6c6cd] rounded-xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
          
          <div>
            <label className="text-xs font-semibold text-[#45464d] mb-1 block">Date Range</label>
            <div className="flex items-center gap-1">
              <input
                type="date"
                className="flex-1 px-2 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                placeholder="From"
              />
              <span className="text-[#45464d] text-xs">-</span>
              <input
                type="date"
                className="flex-1 px-2 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                placeholder="To"
              />
            </div>
          </div>
        </div>
        
        {(searchTerm || statusFilter || paymentTypeFilter || dateFrom || dateTo) && (
          <div className="mt-3 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">clear</span>
              Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* Desktop Table View - Hidden on mobile */}
      <div className="hidden lg:block bg-white border border-[#c6c6cd] rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#f8f9ff] border-b border-[#c6c6cd]">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d] w-10">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded border-[#c6c6cd] text-black focus:ring-black"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Transaction #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-[#45464d]">Payment Type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-[#45464d]">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#45464d]">Status</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-[#45464d]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c6cd]">
              {isLoading ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
                    </div>
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-8 text-center text-[#45464d]">
                    <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
                    <p>No transactions found</p>
                  </td>
                </tr>
              ) : (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-[#f8f9ff] transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        className="rounded border-[#c6c6cd] text-black focus:ring-black"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-mono font-semibold">{transaction.transaction_no}</p>
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">{formatDate(transaction.transaction_date)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium">{transaction.customer_name}</p>
                      <p className="text-xs text-[#45464d]">{transaction.contact_number}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                          <img src={transaction.image || 'https://via.placeholder.com/32x32'} className="w-full h-full object-cover" alt="product" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{transaction.product_name}</p>
                          <p className="text-xs text-[#45464d]">{transaction.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentTypeBadge(transaction.payment_type)}`}>
                        {transaction.payment_type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-semibold">{formatCurrency(transaction.selling_price)}</p>
                      {transaction.payment_type === 'Installment' && transaction.balance > 0 && (
                        <p className="text-xs text-orange-600">Balance: {formatCurrency(transaction.balance)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(transaction.status)}`}>
                        {transaction.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => viewTransactionDetails(transaction.id)} 
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
                        {transaction.payment_type === 'Installment' && (
                          <button 
                            onClick={() => viewInstallmentPayments(transaction)} 
                            className="p-1 hover:text-purple-600 transition-colors" 
                            title="View Installment Payments"
                          >
                            <span className="material-symbols-outlined text-base">receipt</span>
                          </button>
                        )}
                        <button 
                          onClick={() => deleteTransaction(transaction.id, transaction.transaction_no)} 
                          className="p-1 hover:text-red-600 transition-colors" 
                          title="Delete"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View - Visible only on mobile/tablet */}
      <div className="lg:hidden space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 text-[#45464d]">
            <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
            <p>No transactions found</p>
          </div>
        ) : (
          transactions.map((transaction) => (
            <div key={transaction.id} className="bg-white border border-[#c6c6cd] rounded-xl p-4 shadow-sm">
              {/* Select Checkbox */}
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.includes(transaction.id)}
                    onChange={() => handleSelectTransaction(transaction.id)}
                    className="rounded border-[#c6c6cd] text-black focus:ring-black"
                  />
                  <span className="text-xs font-mono font-semibold bg-gray-100 px-2 py-1 rounded">
                    {transaction.transaction_no}
                  </span>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(transaction.status)}`}>
                  {transaction.status}
                </span>
              </div>

              {/* Customer Info */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#c6c6cd]">
                <div className="w-10 h-10 rounded-full bg-[#e5eeff] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg text-black">person</span>
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.customer_name}</p>
                  <p className="text-xs text-[#45464d]">{transaction.contact_number}</p>
                </div>
              </div>

              {/* Product Info */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-[#c6c6cd]">
                <div className="w-10 h-10 rounded-lg bg-[#e5eeff] overflow-hidden">
                  <img src={transaction.image || 'https://via.placeholder.com/40x40'} className="w-full h-full object-cover" alt="product" />
                </div>
                <div>
                  <p className="text-sm font-medium">{transaction.product_name}</p>
                  <p className="text-xs text-[#45464d]">{transaction.brand}</p>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-2 mb-3 pb-3 border-b border-[#c6c6cd]">
                <div className="flex justify-between">
                  <span className="text-xs text-[#45464d]">Payment Type</span>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getPaymentTypeBadge(transaction.payment_type)}`}>
                    {transaction.payment_type}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-[#45464d]">Amount</span>
                  <span className="text-sm font-semibold">{formatCurrency(transaction.selling_price)}</span>
                </div>
                {transaction.payment_type === 'Installment' && transaction.balance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-xs text-[#45464d]">Balance</span>
                    <span className="text-xs text-orange-600 font-semibold">{formatCurrency(transaction.balance)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-xs text-[#45464d]">Date</span>
                  <span className="text-xs">{formatDate(transaction.transaction_date)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => viewTransactionDetails(transaction.id)} 
                  className="px-3 py-1.5 hover:text-blue-600 rounded-lg text-sm flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">visibility</span>
                  View
                </button>
                <button 
                  onClick={() => printInvoice(transaction)} 
                  className="px-3 py-1.5 hover:text-black rounded-lg text-sm flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print
                </button>
                {transaction.payment_type === 'Installment' && (
                  <button 
                    onClick={() => viewInstallmentPayments(transaction)} 
                    className="px-3 py-1.5 hover:text-purple-600 rounded-lg text-sm flex items-center gap-1 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">receipt</span>
                    Payments
                  </button>
                )}
                <button 
                  onClick={() => deleteTransaction(transaction.id, transaction.transaction_no)} 
                  className="px-3 py-1.5 hover:text-red-600 rounded-lg text-sm flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Transaction Details Modal */}
      {showDetailsModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#c6c6cd] p-4 flex flex-wrap justify-between items-center gap-2">
              <h3 className="text-lg font-semibold">Transaction Details</h3>
              <div className="flex gap-2">
                <button onClick={() => printInvoice(selectedTransaction)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">print</span>
                  Print
                </button>
                <button onClick={() => setShowDetailsModal(false)} className="p-1 text-[#45464d] hover:text-black">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            
            <div className="p-5 space-y-4">
              <div className="bg-gradient-to-r from-black to-gray-800 text-white p-4 rounded-lg">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <p className="text-xs opacity-70">Transaction #</p>
                    <p className="text-base sm:text-lg font-mono font-bold">{selectedTransaction.transaction_no}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs opacity-70">Date</p>
                    <p className="text-sm">{formatDate(selectedTransaction.transaction_date)}</p>
                  </div>
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
                    <p className="text-sm font-medium">{selectedTransaction.customer_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#45464d]">Contact Number</p>
                    <p className="text-sm">{selectedTransaction.contact_number || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#45464d]">Email</p>
                    <p className="text-sm">{selectedTransaction.email || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#45464d]">Address</p>
                    <p className="text-sm">{selectedTransaction.home_address || '—'}</p>
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-4">
                <h4 className="text-xs font-semibold text-[#45464d] uppercase mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">motorcycle</span>
                  Product Information
                </h4>
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="w-20 h-20 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                    <img src={selectedTransaction.image || 'https://via.placeholder.com/80x80'} className="w-full h-full object-cover" alt="product" />
                  </div>
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-[#45464d]">Model</p>
                      <p className="text-sm font-medium">{selectedTransaction.product_name}</p>
                      <p className="text-xs text-[#45464d]">{selectedTransaction.brand} • {selectedTransaction.product_type}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#45464d]">Unit Details</p>
                      <p className="text-xs font-mono">Engine: {selectedTransaction.engine_number}</p>
                      <p className="text-xs font-mono">Chassis: {selectedTransaction.chassis_number}</p>
                      <p className="text-xs">Color: {selectedTransaction.color || '—'}</p>
                    </div>
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
                    <span className="text-sm">Selling Price</span>
                    <span className="text-sm font-semibold">{formatCurrency(selectedTransaction.selling_price)}</span>
                  </div>
                  
                  {selectedTransaction.payment_type === 'Cash' ? (
                    <>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Amount Paid</span>
                        <span className="text-sm font-semibold text-green-600">{formatCurrency(selectedTransaction.amount_paid)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm">Change</span>
                        <span className="text-sm font-semibold text-blue-600">
                          {formatCurrency(selectedTransaction.amount_paid - selectedTransaction.selling_price)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Down Payment</span>
                        <span className="text-sm font-semibold">{formatCurrency(selectedTransaction.down_payment)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Terms</span>
                        <span className="text-sm font-semibold">{selectedTransaction.terms} months</span>
                      </div>
                      <div className="flex justify-between py-1 border-b">
                        <span className="text-sm">Monthly Amortization</span>
                        <span className="text-sm font-semibold">{formatCurrency(selectedTransaction.monthly_amount)}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-sm">Remaining Balance</span>
                        <span className="text-sm font-semibold text-orange-600">{formatCurrency(selectedTransaction.balance)}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
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

      {/* Installment Payments Modal with refresh callback */}
      {showPaymentsModal && selectedTransactionForPayment && (
        <InstallmentPayments 
          transactionId={selectedTransactionForPayment.id}
          onClose={() => setShowPaymentsModal(false)}
          onPaymentComplete={handleRefreshTransactions}
        />
      )}
    </div>
  )
}

export default TransactionList