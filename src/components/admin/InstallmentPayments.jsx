import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

function InstallmentPayments({ transactionId, onClose, onPaymentComplete }) {
  const [payments, setPayments] = useState([])
  const [transaction, setTransaction] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    reference_no: '',
    notes: ''
  })

  useEffect(() => {
    fetchPayments()
  }, [transactionId])

  const fetchPayments = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`http://localhost:8080/motor-shop/backend/api/get-installment-payments.php?transaction_id=${transactionId}`)
      const data = await response.json()
      if (data.success) {
        setPayments(data.payments)
        setTransaction(data.transaction)
      } else {
        console.error('Error fetching payments:', data.message)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleRecordPayment = (payment) => {
    setSelectedPayment(payment)
    setPaymentForm({
      amount_paid: payment.amount_due,
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'Cash',
      reference_no: '',
      notes: ''
    })
    setShowPaymentModal(true)
  }

  const handleSubmitPayment = async (e) => {
    e.preventDefault()
    
    Swal.fire({
      title: 'Processing Payment...',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    })

    try {
      const response = await fetch('http://localhost:8080/motor-shop/backend/api/record-payment.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payment_id: selectedPayment.id,
          amount_paid: parseFloat(paymentForm.amount_paid),
          payment_date: paymentForm.payment_date,
          payment_method: paymentForm.payment_method,
          reference_no: paymentForm.reference_no,
          notes: paymentForm.notes
        })
      })

      const data = await response.json()

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Payment Recorded!',
          text: `Payment of ₱${parseFloat(paymentForm.amount_paid).toLocaleString()} has been recorded.`,
          confirmButtonColor: '#3B82F6',
          timer: 2000
        })
        setShowPaymentModal(false)
        await fetchPayments()
        
        if (onPaymentComplete) {
          onPaymentComplete()
        }
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
        text: 'Failed to record payment.',
        confirmButtonColor: '#3B82F6'
      })
    }
  }

 const printPaymentReceipt = (payment) => {
  const printWindow = window.open('', '_blank')
  
  const paymentNo = payment.payment_no
  const dueDate = formatDate(payment.due_date)
  const amountDue = formatCurrency(payment.amount_due)
  const amountPaid = formatCurrency(payment.amount_paid)
  const paymentDate = formatDate(payment.payment_date)
  const paymentMethod = payment.payment_method || 'Cash'
  const referenceNo = payment.reference_no || 'N/A'
  const notes = payment.notes || 'N/A'
  
  // Get product details from transaction object
  const productName = transaction?.product_name || 'N/A'
  const productBrand = transaction?.brand || 'N/A'
  const engineNumber = transaction?.engine_number || 'N/A'
  const chassisNumber = transaction?.chassis_number || 'N/A'
  const color = transaction?.color || 'N/A'
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Payment Receipt - ${transaction?.transaction_no} - Payment #${paymentNo}</title>
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
        .receipt-container { 
          max-width: 600px; 
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
          font-size: 16px;
        }
        .receipt-title {
          text-align: center;
          margin: 15px 0;
          padding: 10px;
          background: #f0f0f0;
          border-radius: 5px;
        }
        .receipt-title h3 {
          margin: 0;
          font-size: 18px;
        }
        .info-section {
          margin-bottom: 20px;
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 5px;
        }
        .info-section h4 {
          margin-bottom: 10px;
          color: #333;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
        }
        .info-row {
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
        }
        .info-label {
          font-weight: bold;
          font-size: 13px;
        }
        .info-value {
          font-size: 13px;
        }
        .amount-row {
          background: #f8f9ff;
          padding: 10px;
          margin-top: 10px;
          border-radius: 5px;
        }
        .footer { 
          text-align: center; 
          margin-top: 20px; 
          padding-top: 15px; 
          border-top: 1px solid #ddd; 
          font-size: 11px; 
          color: #666;
        }
        @media print {
          body { margin: 0; padding: 0; }
          .receipt-container { border: none; padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="header">
          <h1>EURO MOTOR SHOP</h1>
          <p>123 Motorcycle Street, Manila, Philippines</p>
          <p>Tel: (02) 1234-5678 | Email: info@euromotor.com</p>
          <h2>OFFICIAL RECEIPT</h2>
        </div>
        
        <div class="receipt-title">
          <h3>PAYMENT RECEIPT</h3>
          <p>Transaction: ${transaction?.transaction_no} | Payment #${paymentNo}</p>
        </div>
        
        <div class="info-section">
          <h4>Customer Information</h4>
          <div class="info-row">
            <span class="info-label">Name:</span>
            <span class="info-value">${transaction?.customer_name || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Contact:</span>
            <span class="info-value">${transaction?.contact_number || 'N/A'}</span>
          </div>
        </div>
        
        <div class="info-section">
          <h4>Payment Details</h4>
          <div class="info-row">
            <span class="info-label">Payment #:</span>
            <span class="info-value">${paymentNo}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Due Date:</span>
            <span class="info-value">${dueDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Amount Due:</span>
            <span class="info-value">${amountDue}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Date:</span>
            <span class="info-value">${paymentDate}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Payment Method:</span>
            <span class="info-value">${paymentMethod}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Reference No:</span>
            <span class="info-value">${referenceNo}</span>
          </div>
          <div class="amount-row">
            <div class="info-row">
              <span class="info-label">Amount Paid:</span>
              <span class="info-value" style="font-size: 16px; font-weight: bold; color: green;">${amountPaid}</span>
            </div>
          </div>
          ${notes !== 'N/A' ? `
            <div class="info-row" style="margin-top: 10px;">
              <span class="info-label">Notes:</span>
              <span class="info-value">${notes}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="info-section">
          <h4>Product Information</h4>
          <div class="info-row">
            <span class="info-label">Model:</span>
            <span class="info-value">${productName}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Brand:</span>
            <span class="info-value">${productBrand}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Engine #:</span>
            <span class="info-value">${engineNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Chassis #:</span>
            <span class="info-value">${chassisNumber}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Color:</span>
            <span class="info-value">${color}</span>
          </div>
        </div>
        
        <div class="footer">
          <p>Thank you for your payment!</p>
          <p>This is a computer-generated receipt. No signature required.</p>
          <p>Printed on: ${new Date().toLocaleString()}</p>
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
  const getStatusBadge = (status) => {
    const badges = {
      'Paid': 'bg-green-100 text-green-800',
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Overdue': 'bg-red-100 text-red-800',
      'Partial': 'bg-blue-100 text-blue-800'
    }
    return badges[status] || 'bg-gray-100 text-gray-800'
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

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl p-6 sm:p-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
          <p className="mt-4 text-sm text-[#45464d]">Loading payments...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-xl w-full max-w-full sm:max-w-5xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#c6c6cd] p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h3 className="text-base sm:text-lg font-semibold">Installment Payments</h3>
            <p className="text-xs sm:text-sm text-[#45464d]">
              Transaction: {transaction?.transaction_no} | 
              Remaining Balance: {formatCurrency(transaction?.remaining_balance || 0)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 hover:text-black self-end sm:self-auto">
            <span className="material-symbols-outlined text-base sm:text-xl">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {/* Mobile Card View */}
          <div className="block sm:hidden space-y-3 mb-6">
            {payments.length === 0 ? (
              <div className="text-center py-8 text-[#45464d]">
                <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
                <p>No payment schedule found.</p>
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="bg-white border border-[#c6c6cd] rounded-xl p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-semibold bg-gray-100 px-2 py-1 rounded">
                      Payment #{payment.payment_no}
                    </span>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                      {payment.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-3">
                    <div className="flex justify-between">
                      <span className="text-xs text-[#45464d]">Due Date</span>
                      <span className="text-sm">{formatDate(payment.due_date)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs text-[#45464d]">Amount Due</span>
                      <span className="text-sm font-semibold">{formatCurrency(payment.amount_due)}</span>
                    </div>
                    {payment.amount_paid > 0 && (
                      <div className="flex justify-between">
                        <span className="text-xs text-[#45464d]">Amount Paid</span>
                        <span className="text-sm text-green-600">{formatCurrency(payment.amount_paid)}</span>
                      </div>
                    )}
                    {payment.payment_date && (
                      <div className="flex justify-between">
                        <span className="text-xs text-[#45464d]">Payment Date</span>
                        <span className="text-sm">{formatDate(payment.payment_date)}</span>
                      </div>
                    )}
                  </div>
                  
                  {(payment.status === 'Pending' || payment.status === 'Overdue') && (
                    <button
                      onClick={() => handleRecordPayment(payment)}
                      className={`w-full py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
                        payment.status === 'Overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'
                      }`}
                    >
                      {payment.status === 'Overdue' ? 'Pay Overdue' : 'Record Payment'}
                    </button>
                  )}
                  {payment.status === 'Paid' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => printPaymentReceipt(payment)}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">print</span>
                        Print Receipt
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto mb-6">
            <table className="w-full min-w-[800px]">
              <thead className="bg-black text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Payment #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Due Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">Amount Due</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold">Amount Paid</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold">Payment Date</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#c6c6cd]">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-4 py-8 text-center text-[#45464d]">
                      No payment schedule found.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-[#f8f9ff]">
                      <td className="px-4 py-3 text-sm font-medium">{payment.payment_no}</td>
                      <td className="px-4 py-3 text-sm">{formatDate(payment.due_date)}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold">
                        {formatCurrency(payment.amount_due)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm">
                        {payment.amount_paid > 0 ? formatCurrency(payment.amount_paid) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {payment.payment_date ? formatDate(payment.payment_date) : '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(payment.status === 'Pending' || payment.status === 'Overdue') && (
                            <button
                              onClick={() => handleRecordPayment(payment)}
                              className={`px-3 py-1 rounded-lg text-xs font-semibold text-white transition-colors ${
                                payment.status === 'Overdue' ? 'bg-red-600 hover:bg-red-700' : 'bg-black hover:bg-gray-800'
                              }`}
                            >
                              {payment.status === 'Overdue' ? 'Pay Overdue' : 'Record Payment'}
                            </button>
                          )}
                          {payment.status === 'Paid' && (
                            <button
                              onClick={() => printPaymentReceipt(payment)}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Print Receipt"
                            >
                              <span className="material-symbols-outlined text-sm">print</span>
                              Receipt
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Payment Summary */}
          {transaction && (
            <div className="p-3 sm:p-4 bg-[#f8f9ff] rounded-lg border">
              <h4 className="text-sm font-semibold mb-3">Payment Summary</h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs text-[#45464d]">Total Price</p>
                  <p className="text-base sm:text-lg font-bold">{formatCurrency(transaction.selling_price)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#45464d]">Down Payment</p>
                  <p className="text-base sm:text-lg font-bold">{formatCurrency(transaction.down_payment)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#45464d]">Monthly Amortization</p>
                  <p className="text-base sm:text-lg font-bold">{formatCurrency(transaction.monthly_amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-[#45464d]">Remaining Balance</p>
                  <p className="text-base sm:text-lg font-bold text-orange-600">{formatCurrency(transaction.remaining_balance || 0)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-2 sm:p-4">
          <div className="bg-white rounded-xl w-full max-w-full sm:max-w-md max-h-[95vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-[#c6c6cd] p-3 sm:p-4 flex justify-between items-center">
              <h3 className="text-base sm:text-lg font-semibold">Record Payment</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 hover:text-black">
                <span className="material-symbols-outlined text-base sm:text-xl">close</span>
              </button>
            </div>
            
            <form onSubmit={handleSubmitPayment} className="p-4 sm:p-5 space-y-3 sm:space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Payment #</label>
                <input
                  type="text"
                  value={`Payment ${selectedPayment?.payment_no}`}
                  disabled
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Due Date</label>
                <input
                  type="text"
                  value={formatDate(selectedPayment?.due_date)}
                  disabled
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Amount Due</label>
                <input
                  type="text"
                  value={formatCurrency(selectedPayment?.amount_due || 0)}
                  disabled
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff] font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Amount Paid</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentForm.amount_paid}
                  onChange={(e) => setPaymentForm({...paymentForm, amount_paid: e.target.value})}
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Payment Date</label>
                <input
                  type="date"
                  value={paymentForm.payment_date}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Payment Method</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({...paymentForm, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
                >
                  <option value="Cash">Cash</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="GCash">GCash</option>
                  <option value="Others">Others</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Reference No. (Optional)</label>
                <input
                  type="text"
                  value={paymentForm.reference_no}
                  onChange={(e) => setPaymentForm({...paymentForm, reference_no: e.target.value})}
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                  placeholder="OR #, Transaction ID, etc."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-[#45464d] mb-1 block">Notes (Optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  rows={2}
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                  placeholder="Additional notes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 sm:pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-3 sm:px-4 py-2 border border-[#c6c6cd] rounded-lg text-sm font-semibold hover:bg-[#f8f9ff]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 sm:px-4 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default InstallmentPayments