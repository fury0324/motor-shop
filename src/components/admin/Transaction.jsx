import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

function Transaction({ onNavigateToAddCustomer, onNavigateToTransactionList }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [customers, setCustomers] = useState([])
  const [inventory, setInventory] = useState([])
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [availableUnits, setAvailableUnits] = useState([])
  const [searchCustomerTerm, setSearchCustomerTerm] = useState('')
  const [searchProductTerm, setSearchProductTerm] = useState('')
  const [paymentType, setPaymentType] = useState('Cash')
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [amountPaid, setAmountPaid] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [terms, setTerms] = useState('12')
  const [isLoading, setIsLoading] = useState(false)
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)

  const steps = [
    { number: 1, title: 'Customer', description: 'Select or add customer', icon: 'person' },
    { number: 2, title: 'Product & Unit', description: 'Select model and unit', icon: 'motorcycle' },
    { number: 3, title: 'Payment', description: 'Payment details', icon: 'payments' },
    { number: 4, title: 'Confirm', description: 'Review transaction', icon: 'check_circle' }
  ]

  useEffect(() => {
    fetchCustomers()
    fetchInventory()
  }, [])

  const fetchCustomers = async () => {
    try {
      const response = await fetch('http://localhost:8080/motor-shop/backend/api/get-customers.php')
      const data = await response.json()
      if (data.success) {
        setCustomers(data.customers)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    }
  }

  const fetchInventory = async () => {
    try {
      const response = await fetch('http://localhost:8080/motor-shop/backend/api/get-inventory.php')
      const data = await response.json()
      if (data.success) {
        setInventory(data.items)
      }
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }

  const fetchAvailableUnits = async (inventoryId) => {
    try {
      const response = await fetch(`http://localhost:8080/motor-shop/backend/api/get-inventory-units.php?inventory_id=${inventoryId}`)
      const data = await response.json()
      if (data.success) {
        const available = data.units.filter(unit => unit.unit_status === 'Available')
        setAvailableUnits(available)
      }
    } catch (error) {
      console.error('Error fetching units:', error)
      setAvailableUnits([])
    }
  }

  const filteredCustomers = customers.filter(customer =>
    customer.full_name?.toLowerCase().includes(searchCustomerTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchCustomerTerm.toLowerCase()) ||
    customer.contact_number?.includes(searchCustomerTerm)
  )

  const filteredProducts = inventory.filter(item =>
    item.name?.toLowerCase().includes(searchProductTerm.toLowerCase()) ||
    item.brand?.toLowerCase().includes(searchProductTerm.toLowerCase())
  )

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed'
    if (stepNumber === currentStep) return 'current'
    return 'pending'
  }

  const isStep1Complete = () => {
    return selectedCustomer !== null
  }

  const isStep2Complete = () => {
    return selectedProduct !== null && selectedUnit !== null
  }

  const isStep3Complete = () => {
    const price = parseFloat(selectedUnit?.selling_price || selectedProduct?.price || 0)
    
    if (price <= 0) return false
    
    if (paymentType === 'Cash') {
      const paid = parseFloat(amountPaid) || 0
      return amountPaid !== '' && paid > 0 && paid >= price
    } else {
      const dp = parseFloat(downPayment) || 0
      return downPayment !== '' && dp > 0 && dp < price
    }
  }

  const calculateMonthlyAmortization = () => {
    const price = parseFloat(selectedUnit?.selling_price || selectedProduct?.price || 0)
    const dp = parseFloat(downPayment) || 0
    const balance = price - dp
    const months = parseInt(terms)
    if (balance <= 0 || months === 0) return 0
    return balance / months
  }

  const calculateChange = () => {
    const price = parseFloat(selectedUnit?.selling_price || selectedProduct?.price || 0)
    const paid = parseFloat(amountPaid) || 0
    return Math.max(0, paid - price)
  }

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowCustomerDropdown(false)
    setSearchCustomerTerm(customer.full_name)
  }

  const handleClearCustomer = () => {
    setSelectedCustomer(null)
    setSearchCustomerTerm('')
  }

  const handleSelectProduct = async (product) => {
    setSelectedProduct(product)
    setSelectedUnit(null)
    setAvailableUnits([])
    setShowProductDropdown(false)
    setSearchProductTerm(product.name)
    await fetchAvailableUnits(product.id)
  }

  const handleSelectUnit = (unit) => {
    setSelectedUnit(unit)
  }

  const handleAddNewCustomer = () => {
    if (onNavigateToAddCustomer) {
      onNavigateToAddCustomer()
    } else {
      window.location.hash = '#add-customer'
    }
  }

  const handleBackToList = () => {
    if (onNavigateToTransactionList) {
      onNavigateToTransactionList()
    }
  }

  const nextStep = () => {
    if (currentStep === 1 && !isStep1Complete()) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Customer',
        text: 'Please select a customer first!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }
    
    if (currentStep === 2 && !isStep2Complete()) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Product/Unit',
        text: 'Please select a product and unit!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }
    
    if (currentStep === 3 && !isStep3Complete()) {
      const price = parseFloat(selectedUnit?.selling_price || selectedProduct?.price || 0)
      if (paymentType === 'Cash') {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Amount',
          html: `Amount paid must be at least <strong>₱${price.toLocaleString()}</strong>!`,
          confirmButtonColor: '#3B82F6'
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Down Payment',
          html: `Down payment must be greater than 0 and less than <strong>₱${price.toLocaleString()}</strong>!`,
          confirmButtonColor: '#3B82F6'
        })
      }
      return
    }
    
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!isStep3Complete()) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please complete all payment details!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsSubmitting(true)

    Swal.fire({
      title: 'Processing Transaction...',
      text: 'Please wait.',
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading()
    })

    try {
      const transactionData = {
        customer_id: selectedCustomer.id,
        inventory_id: selectedProduct.id,
        unit_id: selectedUnit.id,
        payment_type: paymentType,
        selling_price: parseFloat(selectedUnit?.selling_price || selectedProduct?.price || 0),
        amount_paid: paymentType === 'Cash' ? parseFloat(amountPaid) || 0 : 0,
        down_payment: paymentType === 'Installment' ? parseFloat(downPayment) || 0 : 0,
        terms: paymentType === 'Installment' ? parseInt(terms) : null,
        monthly_amount: paymentType === 'Installment' ? calculateMonthlyAmortization() : null,
        balance: paymentType === 'Installment' ? (parseFloat(selectedUnit?.selling_price || selectedProduct?.price || 0) - (parseFloat(downPayment) || 0)) : 0,
        transaction_date: transactionDate,
        notes: notes
      }

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/add-transaction.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      })

      const data = await response.json()

      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Transaction Completed!',
          text: `Transaction ${data.transaction_no} has been successfully processed.`,
          confirmButtonColor: '#3B82F6',
          timer: 3000,
          timerProgressBar: true
        }).then(() => {
          if (onNavigateToTransactionList) {
            onNavigateToTransactionList()
          }
        })
        
        setCurrentStep(1)
        setSelectedCustomer(null)
        setSelectedProduct(null)
        setSelectedUnit(null)
        setAvailableUnits([])
        setSearchCustomerTerm('')
        setSearchProductTerm('')
        setPaymentType('Cash')
        setAmountPaid('')
        setDownPayment('')
        setTerms('12')
        setNotes('')
        
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Failed to process transaction.',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to connect to server. Please try again.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercentage = (currentStep / 4) * 100

  return (
    <div className="p-4 sm:p-5">
      {/* Back Button */}
      <div className="mb-4">
        <button 
          onClick={handleBackToList}
          className="flex items-center gap-1 text-sm text-[#45464d] hover:text-black transition-colors"
        >
          <span className="material-symbols-outlined text-base">arrow_back</span>
          Back to Transaction List
        </button>
      </div>

      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-[#45464d] mb-2">
          <span>Transactions</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-black font-semibold">New Transaction</span>
        </nav>
        <div className="flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-bold text-[#0b1c30]">New Transaction</h2>
            <p className="text-sm text-[#45464d] mt-1">Process a new sale or installment transaction.</p>
          </div>
        </div>
      </div>

      {/* Steps Indicator */}
      <div className="mb-8">
        <div className="relative flex justify-between items-center">
          {steps.map((step, idx) => {
            const status = getStepStatus(step.number)
            const isLast = idx === steps.length - 1
            
            return (
              <div key={step.number} className="relative flex-1">
                <div className="flex flex-col items-center">
                  <div className={`
                    relative z-10 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 text-sm
                    ${status === 'completed' ? 'bg-green-600 text-white' : ''}
                    ${status === 'current' ? 'bg-black text-white ring-2 ring-black/20' : ''}
                    ${status === 'pending' ? 'bg-white border border-[#c6c6cd] text-[#45464d]' : ''}
                  `}>
                    {status === 'completed' ? (
                      <span className="material-symbols-outlined text-sm">check</span>
                    ) : (
                      <span className="text-xs font-medium">{step.number}</span>
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p className={`text-xs font-medium ${status === 'current' ? 'text-black' : status === 'completed' ? 'text-green-600' : 'text-[#45464d]'}`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-[#45464d] mt-0.5 hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {!isLast && (
                  <div className={`absolute top-4 left-1/2 w-full h-0.5 transition-all duration-300 ${
                    step.number < currentStep ? 'bg-green-600' : 'bg-[#e5eeff]'
                  }`} style={{ transform: 'translateX(0%)' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          {/* Step 1: Customer Selection */}
          {currentStep === 1 && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-black">person</span>
                <h3 className="text-lg font-semibold text-[#0b1c30]">Customer Information</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#45464d] mb-1 block">Search Customer</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
                    <input 
                      className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none" 
                      placeholder="Type name, email or contact number..."
                      type="text"
                      value={searchCustomerTerm}
                      onChange={(e) => {
                        setSearchCustomerTerm(e.target.value)
                        setShowCustomerDropdown(true)
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      disabled={selectedCustomer !== null}
                    />
                    {showCustomerDropdown && filteredCustomers.length > 0 && !selectedCustomer && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#c6c6cd] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.map(customer => (
                          <div 
                            key={customer.id}
                            className="p-3 hover:bg-[#f8f9ff] cursor-pointer border-b last:border-0"
                            onClick={() => handleSelectCustomer(customer)}
                          >
                            <p className="text-sm font-medium">{customer.full_name}</p>
                            <p className="text-xs text-[#45464d]">{customer.email} | {customer.contact_number}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {!selectedCustomer && (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="h-px flex-1 bg-[#c6c6cd]"></div>
                      <span className="text-xs text-[#45464d]">OR</span>
                      <div className="h-px flex-1 bg-[#c6c6cd]"></div>
                    </div>
                    
                    <button 
                      className="w-full py-2 border-2 border-dashed border-[#c6c6cd] rounded-lg text-xs font-semibold text-black hover:border-black hover:bg-[#f8f9ff] transition-all flex items-center justify-center gap-2"
                      onClick={handleAddNewCustomer}
                    >
                      <span className="material-symbols-outlined text-base">person_add</span>
                      Add New Customer
                    </button>
                  </>
                )}

                {selectedCustomer && (
                  <div className="bg-[#f8f9ff] p-4 rounded-lg border border-[#c6c6cd] mt-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-semibold text-[#3B82F6] uppercase mb-2">Selected Customer</h4>
                      <button 
                        onClick={handleClearCustomer}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">close</span>
                        Change
                      </button>
                    </div>
                    <div className="flex gap-3">
                      <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-2xl">person</span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{selectedCustomer.full_name}</p>
                        <p className="text-xs text-[#45464d]">{selectedCustomer.contact_number}</p>
                        <p className="text-xs text-[#45464d]">{selectedCustomer.email}</p>
                        <p className="text-xs text-[#45464d] mt-1">{selectedCustomer.home_address}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Product & Unit Selection */}
          {currentStep === 2 && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-black">motorcycle</span>
                <h3 className="text-lg font-semibold text-[#0b1c30]">Product & Unit Selection</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#45464d] mb-1 block">Select Model</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
                    <input 
                      className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none" 
                      placeholder="Search by model name or brand..."
                      type="text"
                      value={searchProductTerm}
                      onChange={(e) => {
                        setSearchProductTerm(e.target.value)
                        setShowProductDropdown(true)
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                    />
                    {showProductDropdown && filteredProducts.length > 0 && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#c6c6cd] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredProducts.map(product => (
                          <div 
                            key={product.id}
                            className="p-3 hover:bg-[#f8f9ff] cursor-pointer border-b last:border-0"
                            onClick={() => handleSelectProduct(product)}
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                                <img src={product.image || 'https://via.placeholder.com/40x40'} className="w-full h-full object-cover" alt={product.name} />
                              </div>
                              <div>
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-[#45464d]">{product.brand} • {product.type}</p>
                              </div>
                              <div className="ml-auto text-right">
                                <p className="text-sm font-semibold">₱{parseFloat(product.price).toLocaleString()}</p>
                                <p className="text-xs text-green-600">{product.stock} available</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {selectedProduct && (
                  <div className="mt-4">
                    <label className="text-xs font-semibold text-[#45464d] mb-2 block">Available Units</label>
                    {availableUnits.length === 0 ? (
                      <div className="text-center py-8 bg-[#f8f9ff] rounded-lg border">
                        <span className="material-symbols-outlined text-3xl text-gray-400">inventory</span>
                        <p className="text-sm text-[#45464d] mt-2">No available units for this model.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-left">
                          <thead className="bg-black text-white">
                            <tr>
                              <th className="px-4 py-2 text-xs">Select</th>
                              <th className="px-4 py-2 text-xs">Engine #</th>
                              <th className="px-4 py-2 text-xs">Chassis #</th>
                              <th className="px-4 py-2 text-xs">Color</th>
                              <th className="px-4 py-2 text-xs text-right">Price</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {availableUnits.map(unit => (
                              <tr 
                                key={unit.id} 
                                className={`cursor-pointer hover:bg-[#f8f9ff] transition-colors ${selectedUnit?.id === unit.id ? 'bg-[#e5eeff]' : ''}`}
                                onClick={() => handleSelectUnit(unit)}
                              >
                                <td className="px-4 py-2">
                                  <input 
                                    type="radio" 
                                    name="unit_select"
                                    checked={selectedUnit?.id === unit.id}
                                    onChange={() => handleSelectUnit(unit)}
                                    className="text-black focus:ring-black"
                                  />
                                </td>
                                <td className="px-4 py-2 text-xs font-mono">{unit.engine_number}</td>
                                <td className="px-4 py-2 text-xs font-mono">{unit.chassis_number}</td>
                                <td className="px-4 py-2 text-xs">
                                  <div className="flex items-center gap-1">
                                    <div className={`w-3 h-3 rounded-full ${unit.color?.toLowerCase() === 'black' ? 'bg-black' : unit.color?.toLowerCase() === 'red' ? 'bg-red-600' : unit.color?.toLowerCase() === 'blue' ? 'bg-blue-600' : 'bg-gray-400'}`}></div>
                                    {unit.color || '—'}
                                  </div>
                                </td>
                                <td className="px-4 py-2 text-xs text-right font-semibold">
                                  ₱{parseFloat(unit.selling_price || selectedProduct.price).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {selectedUnit && (
                  <div className="bg-[#f8f9ff] p-3 rounded-lg border mt-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-[#45464d]">Selected Unit</p>
                        <p className="text-sm font-semibold">{selectedUnit.engine_number} / {selectedUnit.chassis_number}</p>
                        <p className="text-xs text-[#45464d]">Color: {selectedUnit.color || '—'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-[#45464d]">Price</p>
                        <p className="text-lg font-bold text-black">₱{parseFloat(selectedUnit.selling_price || selectedProduct?.price).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Payment Details */}
          {currentStep === 3 && selectedUnit && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-black">payments</span>
                  <h3 className="text-lg font-semibold text-[#0b1c30]">Payment Details</h3>
                </div>
                <div className="flex bg-[#e5eeff] p-1 rounded-lg">
                  <button 
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${paymentType === 'Cash' ? 'bg-white text-black shadow-sm' : 'text-[#45464d]'}`}
                    onClick={() => setPaymentType('Cash')}
                  >
                    Cash
                  </button>
                  <button 
                    className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-all ${paymentType === 'Installment' ? 'bg-white text-black shadow-sm' : 'text-[#45464d]'}`}
                    onClick={() => setPaymentType('Installment')}
                  >
                    Installment
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {paymentType === 'Cash' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#45464d] mb-1 block">Selling Price</label>
                      <input 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff]"
                        type="text"
                        readOnly
                        value={`₱${parseFloat(selectedUnit?.selling_price || selectedProduct?.price || 0).toLocaleString()}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#45464d] mb-1 block">Amount Paid</label>
                      <input 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                        type="number"
                        placeholder="0.00"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#45464d] mb-1 block">Change</label>
                      <input 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff] text-green-600 font-semibold"
                        type="text"
                        readOnly
                        value={`₱${calculateChange().toLocaleString()}`}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#45464d] mb-1 block">Selling Price</label>
                      <input 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff]"
                        type="text"
                        readOnly
                        value={`₱${parseFloat(selectedUnit?.selling_price || selectedProduct?.price || 0).toLocaleString()}`}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#45464d] mb-1 block">Down Payment</label>
                      <input 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                        type="number"
                        placeholder="0.00"
                        value={downPayment}
                        onChange={(e) => setDownPayment(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#45464d] mb-1 block">Terms (Months)</label>
                      <select 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                      >
                        <option value="3">3 months</option>
                        <option value="6">6 months</option>
                        <option value="12">12 months</option>
                        <option value="24">24 months</option>
                        <option value="36">36 months</option>
                      </select>
                    </div>
                    <div className="bg-[#f8f9ff] p-3 rounded-lg border">
                      <label className="text-xs font-semibold text-[#45464d] mb-1 block">Monthly Amortization</label>
                      <p className="text-xl font-bold text-black">₱{calculateMonthlyAmortization().toLocaleString()}</p>
                      <p className="text-[10px] text-[#45464d]">For {terms} months</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#45464d] mb-1 block">Transaction Date</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-sm">calendar_today</span>
                      <input 
                        className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                        type="date"
                        value={transactionDate}
                        onChange={(e) => setTransactionDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#45464d] mb-1 block">Notes</label>
                    <textarea 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                      placeholder="Additional notes..."
                      rows={1}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Confirm */}
          {currentStep === 4 && selectedCustomer && selectedProduct && selectedUnit && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl overflow-hidden">
              <div className="bg-black text-white p-4 text-center">
                <h3 className="text-lg font-semibold">Transaction Summary</h3>
                <p className="text-xs opacity-70 mt-1">Please review all details before confirming</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-3 border-b gap-2">
                  <div>
                    <p className="text-xs text-[#45464d] uppercase">Customer</p>
                    <p className="font-semibold">{selectedCustomer.full_name}</p>
                    <p className="text-xs text-[#45464d]">{selectedCustomer.contact_number}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-[#45464d] uppercase">Date</p>
                    <p className="text-sm">{new Date(transactionDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pb-3 border-b">
                  <div className="w-12 h-12 rounded-lg bg-[#e5eeff] flex items-center justify-center overflow-hidden">
                    <img src={selectedProduct.image || 'https://via.placeholder.com/48x48'} className="w-full h-full object-cover" alt={selectedProduct.name} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-[#45464d] uppercase">Product</p>
                    <p className="font-semibold">{selectedProduct.name}</p>
                    <p className="text-xs text-[#45464d]">{selectedProduct.brand} • {selectedProduct.type}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-[#45464d] uppercase">Unit Details</p>
                    <p className="text-xs font-mono">{selectedUnit.engine_number}</p>
                    <p className="text-xs font-mono">{selectedUnit.chassis_number}</p>
                  </div>
                </div>

                <div className="pb-3 border-b">
                  <p className="text-xs text-[#45464d] uppercase mb-2">Payment Details</p>
                  <div className="flex justify-between text-sm">
                    <span>Selling Price</span>
                    <span>₱{parseFloat(selectedUnit.selling_price || selectedProduct.price).toLocaleString()}</span>
                  </div>
                  {paymentType === 'Cash' ? (
                    <>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Amount Paid</span>
                        <span>₱{parseFloat(amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Change</span>
                        <span className="text-green-600">₱{calculateChange().toLocaleString()}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Down Payment</span>
                        <span>₱{parseFloat(downPayment || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Terms</span>
                        <span>{terms} months</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Monthly Amortization</span>
                        <span>₱{calculateMonthlyAmortization().toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Total Balance</span>
                        <span>₱{(parseFloat(selectedUnit.selling_price || selectedProduct.price) - (parseFloat(downPayment) || 0)).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-[#45464d] uppercase">Total Amount</span>
                  <span className="text-xl sm:text-2xl font-bold text-black">
                    ₱{paymentType === 'Cash' 
                      ? parseFloat(amountPaid || 0).toLocaleString() 
                      : parseFloat(downPayment || 0).toLocaleString()
                    }
                  </span>
                </div>

                {notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-[#45464d] uppercase">Notes</p>
                    <p className="text-sm mt-1">{notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar Summary */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-[#131b2e] to-[#1a2538] text-white rounded-xl p-5 shadow-lg sticky top-5">
            <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70 mb-4">Transaction Summary</h4>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isStep1Complete() ? 'bg-green-500' : 'bg-white/20 text-white'}`}>
                  {isStep1Complete() ? <span className="material-symbols-outlined text-xs">check</span> : 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold">Customer</p>
                    {isStep1Complete() && <span className="text-green-400 text-[9px]">✓</span>}
                  </div>
                  <p className="text-[10px] opacity-50 truncate">{selectedCustomer?.full_name || 'Not selected'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isStep2Complete() ? 'bg-green-500' : 'bg-white/20 text-white'}`}>
                  {isStep2Complete() ? <span className="material-symbols-outlined text-xs">check</span> : 2}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold">Product & Unit</p>
                    {isStep2Complete() && <span className="text-green-400 text-[9px]">✓</span>}
                  </div>
                  <p className="text-[10px] opacity-50 truncate">{selectedProduct?.name || 'Not selected'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isStep3Complete() ? 'bg-green-500' : 'bg-white/20 text-white'}`}>
                  {isStep3Complete() ? <span className="material-symbols-outlined text-xs">check</span> : 3}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold">Payment</p>
                    {currentStep > 3 && <span className="text-green-400 text-[9px]">✓</span>}
                  </div>
                  <p className="text-[10px] opacity-50">{paymentType === 'Cash' ? 'Cash payment' : `${terms} months installment`}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-white/70">Transaction Status</span>
                <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase ${
                  isStep1Complete() && isStep2Complete() && isStep3Complete() ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {isStep1Complete() && isStep2Complete() && isStep3Complete() ? 'Ready' : 'In Progress'}
                </span>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Total Amount</span>
                <span className="font-bold">
                  ₱{paymentType === 'Cash' 
                    ? parseFloat(amountPaid || 0).toLocaleString()
                    : parseFloat(downPayment || 0).toLocaleString()
                  }
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-6">
        <button 
          onClick={prevStep}
          className={`px-5 py-2 border border-[#c6c6cd] rounded-lg text-xs font-semibold transition-all ${
            currentStep === 1 ? 'invisible' : 'hover:bg-[#eff4ff] hover:border-black'
          }`}
        >
          ← Previous
        </button>
        
        {currentStep < 4 ? (
          <button 
            onClick={nextStep}
            className="px-5 py-2 bg-black text-white rounded-lg text-xs font-semibold hover:bg-gray-800 transition-all shadow-sm"
          >
            Next →
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-5 py-2 bg-gradient-to-r from-green-600 to-green-500 text-white rounded-lg text-xs font-semibold hover:from-green-700 hover:to-green-600 transition-all shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : '✓ Confirm Transaction'}
          </button>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white p-3 border-t border-[#c6c6cd] flex gap-3 z-50 shadow-lg">
        <button 
          onClick={prevStep}
          className={`flex-1 py-2.5 border border-[#c6c6cd] text-[#0b1c30] text-sm font-semibold rounded-lg ${currentStep === 1 ? 'opacity-50' : ''}`}
          disabled={currentStep === 1}
        >
          Previous
        </button>
        {currentStep < 4 ? (
          <button 
            onClick={nextStep}
            className="flex-1 py-2.5 bg-black text-white text-sm font-semibold rounded-lg"
          >
            Next →
          </button>
        ) : (
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Confirm'}
          </button>
        )}
      </div>

      <div className="md:hidden h-20"></div>
    </div>
  )
}

export default Transaction