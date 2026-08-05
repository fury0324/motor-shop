// src/components/cashier/NewTransaction.jsx
import { useState, useEffect } from 'react'
import Swal from '../../lib/swal'
import { watchCustomers } from '../../lib/customers'
import { watchInventoryWithUnits } from '../../lib/inventory'
import { createTransaction, createPartsTransaction } from '../../lib/transactions'
import { useCurrentUser } from '../../lib/useCurrentUser'

function NewTransaction() {
  const { user } = useCurrentUser()
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
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [transactionType, setTransactionType] = useState(null) // 'model' or 'part'
  const [partQuantity, setPartQuantity] = useState(1)
  const [customerName, setCustomerName] = useState('')

  // Steps for Model transaction
  const modelSteps = [
    { number: 1, title: 'Customer', description: 'Select customer', icon: 'person' },
    { number: 2, title: 'Product', description: 'Select model & unit', icon: 'motorcycle' },
    { number: 3, title: 'Payment', description: 'Payment details', icon: 'payments' },
    { number: 4, title: 'Confirm', description: 'Review transaction', icon: 'check_circle' }
  ]

  // Steps for Part transaction
  const partSteps = [
    { number: 1, title: 'Customer', description: 'Enter customer name', icon: 'person' },
    { number: 2, title: 'Part & Payment', description: 'Select part and pay', icon: 'build' },
    { number: 3, title: 'Confirm', description: 'Review transaction', icon: 'check_circle' }
  ]

  const steps = transactionType === 'part' ? partSteps : modelSteps

  useEffect(() => {
    const unsubCustomers = watchCustomers(setCustomers, (error) => console.error('Error fetching customers:', error))
    const unsubInventory = watchInventoryWithUnits(setInventory, (error) => console.error('Error fetching inventory:', error))
    return () => {
      unsubCustomers()
      unsubInventory()
    }
  }, [])

  const filteredCustomers = customers.filter(c =>
    c.fullName?.toLowerCase().includes(searchCustomerTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchCustomerTerm.toLowerCase()) ||
    c.contactNumber?.includes(searchCustomerTerm)
  )

  // Filter only parts for part transaction
  const filteredParts = inventory.filter(item =>
    item.isPart && item.name?.toLowerCase().includes(searchProductTerm.toLowerCase())
  )

  // Filter only models for model transaction
  const filteredModels = inventory.filter(item =>
    !item.isPart && item.name?.toLowerCase().includes(searchProductTerm.toLowerCase())
  )

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed'
    if (stepNumber === currentStep) return 'current'
    return 'pending'
  }

  const isStep1Complete = () => {
    if (transactionType === 'part') {
      return customerName.trim() !== ''
    }
    return selectedCustomer !== null
  }

  const isStep2Complete = () => {
    if (!selectedProduct) return false
    return true
  }

  const isStep3Complete = () => {
    if (transactionType === 'part') {
      const total = parseFloat(selectedProduct?.price || 0) * partQuantity
      const paid = parseFloat(amountPaid) || 0
      return amountPaid !== '' && paid > 0 && paid >= total
    }
    
    const price = parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0)
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
    const price = parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0)
    const dp = parseFloat(downPayment) || 0
    const balance = price - dp
    const months = parseInt(terms)
    if (balance <= 0 || months === 0) return 0
    return balance / months
  }

  const calculateChange = () => {
    const price = parseFloat(selectedProduct?.price || 0)
    const qty = transactionType === 'part' ? partQuantity : 1
    const total = price * qty
    const paid = parseFloat(amountPaid) || 0
    return Math.max(0, paid - total)
  }

  const getTotalAmount = () => {
    const price = parseFloat(selectedProduct?.price || 0)
    const qty = transactionType === 'part' ? partQuantity : 1
    return price * qty
  }

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowCustomerDropdown(false)
    setSearchCustomerTerm(customer.fullName)
  }

  const handleClearCustomer = () => {
    setSelectedCustomer(null)
    setSearchCustomerTerm('')
  }

  const handleSelectProduct = (product) => {
    setSelectedProduct(product)
    setSelectedUnit(null)
    setShowProductDropdown(false)
    setSearchProductTerm(product.name)
    setAvailableUnits(
      transactionType !== 'part' ? (product.units || []).filter(u => u.status === 'Available') : []
    )
  }

  const handleSelectUnit = (unit) => {
    setSelectedUnit(unit)
  }

  const handleSelectTransactionType = (type) => {
    setTransactionType(type)
    setCurrentStep(1)
    setSelectedProduct(null)
    setSelectedUnit(null)
    setAvailableUnits([])
    setSearchProductTerm('')
    setPartQuantity(1)
    setAmountPaid('')
    setCustomerName('')
    setPaymentType('Cash')
    setDownPayment('')
  }

  const nextStep = () => {
    if (currentStep === 1 && !isStep1Complete()) {
      const message = transactionType === 'part' 
        ? 'Please enter customer name!' 
        : 'Please select a customer!'
      Swal.fire({ 
        icon: 'error', 
        title: 'Missing Customer', 
        text: message, 
        confirmButtonColor: '#3B82F6' 
      })
      return
    }
    
    if (currentStep === 2 && !isStep2Complete()) {
      const message = transactionType === 'part' 
        ? 'Please select a part!' 
        : 'Please select a model and unit!'
      Swal.fire({ 
        icon: 'error', 
        title: 'Missing Product', 
        text: message, 
        confirmButtonColor: '#3B82F6' 
      })
      return
    }
    
    if (currentStep === steps.length - 1 && !isStep3Complete()) {
      if (transactionType === 'part') {
        const total = getTotalAmount()
        Swal.fire({
          icon: 'error',
          title: 'Invalid Amount',
          html: `Amount paid must be at least <strong>₱${total.toLocaleString()}</strong>!`,
          confirmButtonColor: '#3B82F6'
        })
      } else {
        const price = parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0)
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
      }
      return
    }
    
    if (currentStep < steps.length) setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
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
      const isPart = transactionType === 'part'
      let result

      if (isPart) {
        result = await createPartsTransaction({
          customerName,
          inventoryId: selectedProduct.id,
          inventoryName: selectedProduct.name,
          quantity: partQuantity,
          price: parseFloat(selectedProduct.price || 0),
          amountPaid: parseFloat(amountPaid) || 0,
          paymentType: 'Cash',
          transactionDate,
          notes,
          processedByName: user?.name,
          processedByRole: user?.role,
        })
      } else {
        result = await createTransaction({
          customerId: selectedCustomer.id,
          customerName: selectedCustomer.fullName,
          customerContact: selectedCustomer.contactNumber,
          inventoryId: selectedProduct.id,
          inventoryName: selectedProduct.name,
          inventorySku: selectedProduct.sku,
          inventoryType: selectedProduct.type,
          brand: selectedProduct.brand,
          imageUrl: selectedProduct.imageUrl,
          unitId: selectedUnit.id,
          engineNumber: selectedUnit.engineNumber,
          chassisNumber: selectedUnit.chassisNumber,
          color: selectedUnit.color,
          paymentType,
          sellingPrice: parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0),
          amountPaid: paymentType === 'Cash' ? parseFloat(amountPaid) || 0 : 0,
          downPayment: paymentType === 'Installment' ? parseFloat(downPayment) || 0 : 0,
          terms: paymentType === 'Installment' ? parseInt(terms) : null,
          monthlyAmount: paymentType === 'Installment' ? calculateMonthlyAmortization() : null,
          transactionDate,
          notes,
          processedByName: user?.name,
          processedByRole: user?.role,
        })
      }

      Swal.fire({
        icon: 'success',
        title: 'Transaction Completed!',
        html: `Transaction <strong>${result.transactionNo}</strong> has been successfully processed.<br/><br/>
               <small class="text-gray-500">Processed by: ${user?.name} (${user?.role})</small>`,
        timer: 4000,
        timerProgressBar: true
      })

      // Reset form
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
      setTransactionType(null)
      setPartQuantity(1)
      setCustomerName('')
    } catch (error) {
      console.error('Submit error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to process transaction.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const progressPercentage = (currentStep / steps.length) * 100
  const isPart = transactionType === 'part'
  const totalAmount = getTotalAmount()

  // If no transaction type selected yet, show selection screen
  if (!transactionType) {
    return (
      <div className="p-4 sm:p-5">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-[#0b1c30]">New Transaction</h2>
          <p className="text-sm text-[#45464d] mt-1">What type of transaction would you like to process?</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl mx-auto mt-8">
          <button
            onClick={() => handleSelectTransactionType('model')}
            className="group bg-white border-2 border-[#c6c6cd] rounded-2xl p-8 hover:border-black transition-all hover:shadow-lg text-left"
          >
            <div className="w-16 h-16 rounded-full bg-black text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">motorcycle</span>
            </div>
            <h3 className="text-xl font-bold text-[#0b1c30] mb-2">Motorcycle Transaction</h3>
            <p className="text-sm text-[#45464d]">Sell a motorcycle with individual unit tracking (engine/chassis number).</p>
          </button>

          <button
            onClick={() => handleSelectTransactionType('part')}
            className="group bg-white border-2 border-[#c6c6cd] rounded-2xl p-8 hover:border-black transition-all hover:shadow-lg text-left"
          >
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-3xl">build</span>
            </div>
            <h3 className="text-xl font-bold text-[#0b1c30] mb-2">Parts Transaction</h3>
            <p className="text-sm text-[#45464d]">Quick parts sale. Just type customer name, select part, enter amount paid, and get change.</p>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="mb-4 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-[#0b1c30]">New {isPart ? 'Parts' : 'Motorcycle'} Transaction</h2>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
              isPart ? 'bg-blue-100 text-blue-700' : 'bg-black text-white'
            }`}>
              {isPart ? 'Part' : 'Model'}
            </span>
          </div>
          <p className="text-sm text-[#45464d] mt-1">
            {isPart ? 'Quick parts sale - type customer name, select part, pay.' : 'Full motorcycle sale with unit tracking.'}
          </p>
        </div>
        <button 
          onClick={() => {
            setTransactionType(null)
            setCurrentStep(1)
            setSelectedProduct(null)
            setSelectedUnit(null)
            setAvailableUnits([])
            setSearchProductTerm('')
            setPartQuantity(1)
            setAmountPaid('')
            setCustomerName('')
          }}
          className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Change Type
        </button>
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
                    relative z-10 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 text-sm
                    ${status === 'completed' ? 'bg-green-600 text-white' : ''}
                    ${status === 'current' ? 'bg-black text-white ring-2 ring-black/20' : ''}
                    ${status === 'pending' ? 'bg-white border border-[#c6c6cd] text-[#45464d]' : ''}
                  `}>
                    {status === 'completed' ? (
                      <span className="material-symbols-outlined text-base">check</span>
                    ) : (
                      <span className="text-sm font-medium">{step.number}</span>
                    )}
                  </div>
                  <div className="text-center mt-2">
                    <p className={`text-xs font-semibold ${status === 'current' ? 'text-black' : status === 'completed' ? 'text-green-600' : 'text-[#45464d]'}`}>
                      {step.title}
                    </p>
                    <p className="text-[10px] text-[#45464d] mt-0.5 hidden sm:block">{step.description}</p>
                  </div>
                </div>
                {!isLast && (
                  <div className={`absolute top-5 left-1/2 w-full h-0.5 transition-all duration-300 ${
                    step.number < currentStep ? 'bg-green-600' : 'bg-gray-200'
                  }`} style={{ transform: 'translateX(0%)' }} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Step 1: Customer */}
          {currentStep === 1 && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-black">person</span>
                <h3 className="text-lg font-semibold text-[#0b1c30]">
                  {isPart ? 'Customer Name' : 'Customer Information'}
                </h3>
                {isPart && (
                  <span className="ml-auto text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Type name only
                  </span>
                )}
              </div>
              <div className="space-y-4">
                {isPart ? (
                  // PARTS: Simple name input
                  <div>
                    <label className="text-xs font-semibold text-[#45464d] mb-1 block">Customer Name *</label>
                    <input 
                      className="w-full px-4 py-3 border border-[#c6c6cd] rounded-lg text-base focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                      placeholder="Enter customer name..."
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      autoFocus
                    />
                    <p className="text-[10px] text-[#45464d] mt-1">Type the customer's full name</p>
                  </div>
                ) : (
                  // MODELS: Full customer selection
                  <>
                    <div>
                      <label className="text-xs font-semibold text-[#45464d] mb-1 block">Search Customer</label>
                      <div className="relative">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
                        <input 
                          className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none" 
                          placeholder="Type name, email or contact number..."
                          type="text"
                          value={searchCustomerTerm}
                          onChange={(e) => { setSearchCustomerTerm(e.target.value); setShowCustomerDropdown(true) }}
                          onFocus={() => setShowCustomerDropdown(true)}
                          disabled={selectedCustomer !== null}
                        />
                        {showCustomerDropdown && filteredCustomers.length > 0 && !selectedCustomer && (
                          <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#c6c6cd] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                            {filteredCustomers.map(customer => (
                              <div key={customer.id} className="p-3 hover:bg-[#f8f9ff] cursor-pointer border-b last:border-0" onClick={() => handleSelectCustomer(customer)}>
                                <p className="text-sm font-medium">{customer.fullName}</p>
                                <p className="text-xs text-[#45464d]">{customer.email} | {customer.contactNumber}</p>
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
                        <button className="w-full py-2 border-2 border-dashed border-[#c6c6cd] rounded-lg text-xs font-semibold text-black hover:border-black hover:bg-[#f8f9ff] transition-all flex items-center justify-center gap-2">
                          <span className="material-symbols-outlined text-base">person_add</span>
                          Add New Customer
                        </button>
                      </>
                    )}

                    {selectedCustomer && (
                      <div className="bg-[#f8f9ff] p-4 rounded-lg border border-[#c6c6cd] mt-4">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-semibold text-[#3B82F6] uppercase mb-2">Selected Customer</h4>
                          <button onClick={handleClearCustomer} className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">close</span> Change
                          </button>
                        </div>
                        <div className="flex gap-3">
                          <div className="w-12 h-12 rounded-full bg-black flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-2xl">person</span>
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{selectedCustomer.fullName}</p>
                            <p className="text-xs text-[#45464d]">{selectedCustomer.contactNumber}</p>
                            <p className="text-xs text-[#45464d]">{selectedCustomer.email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Product Selection */}
          {currentStep === 2 && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-black">
                  {isPart ? 'build' : 'motorcycle'}
                </span>
                <h3 className="text-lg font-semibold text-[#0b1c30]">
                  {isPart ? 'Select Part' : 'Select Model & Unit'}
                </h3>
                {isPart && (
                  <span className="ml-auto text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                    Cash only
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#45464d] mb-1 block">
                    {isPart ? 'Search Part' : 'Search Model'}
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
                    <input 
                      className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none" 
                      placeholder={isPart ? "Search parts..." : "Search models..."}
                      type="text"
                      value={searchProductTerm}
                      onChange={(e) => { setSearchProductTerm(e.target.value); setShowProductDropdown(true) }}
                      onFocus={() => setShowProductDropdown(true)}
                    />
                    {showProductDropdown && (
                      <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-[#c6c6cd] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {(isPart ? filteredParts : filteredModels).map(product => (
                          <div key={product.id} className="p-3 hover:bg-[#f8f9ff] cursor-pointer border-b last:border-0" onClick={() => handleSelectProduct(product)}>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#e5eeff] overflow-hidden">
                                <img src={product.imageUrl || 'https://via.placeholder.com/40x40'} className="w-full h-full object-cover" alt={product.name} />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium">{product.name}</p>
                                <p className="text-xs text-[#45464d]">
                                  {isPart ? `Stock: ${product.quantity || 0}` : `${product.brand} • ${product.type}`}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">₱{parseFloat(product.price).toLocaleString()}</p>
                                <p className="text-xs text-green-600">
                                  {isPart ? `${product.quantity || 0} in stock` : `${product.stock || 0} available`}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {(isPart ? filteredParts : filteredModels).length === 0 && (
                          <div className="p-4 text-center text-sm text-[#45464d]">
                            No {isPart ? 'parts' : 'models'} found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {selectedProduct && (
                  <>
                    {/* Selected Product Display */}
                    <div className={`p-3 rounded-lg border mt-4 ${
                      isPart ? 'bg-blue-50 border-blue-200' : 'bg-[#f8f9ff] border-[#c6c6cd]'
                    }`}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-white overflow-hidden border">
                            <img src={selectedProduct.imageUrl || 'https://via.placeholder.com/48x48'} className="w-full h-full object-cover" alt={selectedProduct.name} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{selectedProduct.name}</p>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                isPart ? 'bg-blue-600 text-white' : 'bg-black text-white'
                              }`}>
                                {isPart ? 'Part' : 'Model'}
                              </span>
                            </div>
                            {isPart ? (
                              <p className="text-xs text-[#45464d]">Stock: {selectedProduct.quantity || 0}</p>
                            ) : (
                              <p className="text-xs text-[#45464d]">{selectedProduct.brand} • {selectedProduct.type}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[#45464d]">Price</p>
                          <p className="text-lg font-bold text-black">₱{parseFloat(selectedProduct.price).toLocaleString()}</p>
                        </div>
                      </div>
                      
                      {/* For Parts: Quantity selector */}
                      {isPart && (
                        <div className="mt-3 pt-3 border-t border-blue-200">
                          <label className="text-xs font-semibold text-[#45464d] mb-1 block">Quantity</label>
                          <div className="flex items-center gap-3">
                            <button 
                              className="w-8 h-8 rounded-lg border border-[#c6c6cd] flex items-center justify-center hover:bg-black hover:text-white transition-colors bg-white"
                              onClick={() => {
                                if (partQuantity > 1) setPartQuantity(partQuantity - 1)
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">remove</span>
                            </button>
                            <input 
                              type="number"
                              min="1"
                              max={selectedProduct.quantity || 0}
                              className="w-16 text-center px-2 py-1 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none bg-white"
                              value={partQuantity}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1
                                if (val > 0 && val <= (selectedProduct.quantity || 0)) {
                                  setPartQuantity(val)
                                }
                              }}
                            />
                            <button 
                              className="w-8 h-8 rounded-lg border border-[#c6c6cd] flex items-center justify-center hover:bg-black hover:text-white transition-colors bg-white"
                              onClick={() => {
                                const maxQty = parseInt(selectedProduct.quantity) || 0
                                if (partQuantity < maxQty) setPartQuantity(partQuantity + 1)
                              }}
                            >
                              <span className="material-symbols-outlined text-sm">add</span>
                            </button>
                            <span className="text-xs text-[#45464d]">of {selectedProduct.quantity} available</span>
                          </div>
                          <div className="mt-2 text-sm font-semibold text-blue-700">
                            Total: ₱{(parseFloat(selectedProduct.price) * partQuantity).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* For Models: Show units */}
                    {!isPart && (
                      <>
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
                                      <td className="px-4 py-2 text-xs font-mono">{unit.engineNumber}</td>
                                      <td className="px-4 py-2 text-xs font-mono">{unit.chassisNumber}</td>
                                      <td className="px-4 py-2 text-xs">
                                        <div className={`w-3 h-3 rounded-full inline-block mr-1 ${unit.color?.toLowerCase() === 'black' ? 'bg-black' : unit.color?.toLowerCase() === 'red' ? 'bg-red-600' : 'bg-gray-400'}`}></div>
                                        {unit.color || '—'}
                                      </td>
                                      <td className="px-4 py-2 text-xs text-right font-semibold">
                                        ₱{parseFloat(unit.sellingPrice || selectedProduct.price).toLocaleString()}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {selectedUnit && (
                          <div className="bg-[#f8f9ff] p-3 rounded-lg border mt-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <p className="text-xs text-[#45464d]">Selected Unit</p>
                                <p className="text-sm font-semibold">{selectedUnit.engineNumber} / {selectedUnit.chassisNumber}</p>
                                <p className="text-xs text-[#45464d]">Color: {selectedUnit.color || '—'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs text-[#45464d]">Price</p>
                                <p className="text-lg font-bold text-black">₱{parseFloat(selectedUnit.sellingPrice || selectedProduct?.price).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {currentStep === steps.length - 1 && selectedProduct && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-black">payments</span>
                <h3 className="text-lg font-semibold text-[#0b1c30]">
                  {isPart ? 'Payment' : 'Payment Details'}
                </h3>
              </div>

              <div className="space-y-4">
                {isPart ? (
                  // PARTS: Simple payment with change
                  <>
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#45464d]">Customer:</span>
                        <span className="font-semibold">{customerName}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#45464d]">Part:</span>
                        <span className="font-semibold">{selectedProduct.name}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-[#45464d]">Quantity:</span>
                        <span className="font-semibold">{partQuantity}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1 pt-1 border-t border-blue-200">
                        <span className="font-bold">Total Amount:</span>
                        <span className="font-bold text-lg">₱{totalAmount.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-semibold text-[#45464d] mb-1 block">Amount Paid</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                          type="number"
                          placeholder="0.00"
                          value={amountPaid}
                          onChange={(e) => setAmountPaid(e.target.value)}
                          autoFocus
                        />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-[#45464d] mb-1 block">Change</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff] text-green-600 font-semibold text-lg"
                          type="text"
                          readOnly
                          value={`₱${calculateChange().toLocaleString()}`}
                        />
                      </div>
                    </div>

                    <div className="text-xs text-[#45464d] text-center">
                      <span className="material-symbols-outlined text-sm align-middle text-green-600">info</span>
                      Cash payment only for parts
                    </div>
                  </>
                ) : (
                  // MODELS: Full payment
                  <>
                    <div className="flex bg-[#e5eeff] p-1 rounded-lg w-fit">
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

                    {paymentType === 'Cash' ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-[#45464d] mb-1 block">Selling Price</label>
                          <input className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff]" type="text" readOnly value={`₱${parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0).toLocaleString()}`} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#45464d] mb-1 block">Amount Paid</label>
                          <input className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" type="number" placeholder="0.00" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#45464d] mb-1 block">Change</label>
                          <input className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff] text-green-600 font-semibold" type="text" readOnly value={`₱${calculateChange().toLocaleString()}`} />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-semibold text-[#45464d] mb-1 block">Selling Price</label>
                          <input className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-[#f8f9ff]" type="text" readOnly value={`₱${parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0).toLocaleString()}`} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#45464d] mb-1 block">Down Payment</label>
                          <input className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" type="number" placeholder="0.00" value={downPayment} onChange={(e) => setDownPayment(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-[#45464d] mb-1 block">Terms (Months)</label>
                          <select className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm bg-white focus:border-black outline-none" value={terms} onChange={(e) => setTerms(e.target.value)}>
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
                        </div>
                      </div>
                    )}
                  </>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#45464d] mb-1 block">Transaction Date</label>
                    <input className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#45464d] mb-1 block">Notes</label>
                    <textarea className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" placeholder="Additional notes..." rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step: Confirm */}
          {currentStep === steps.length && selectedProduct && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl overflow-hidden">
              <div className={`${isPart ? 'bg-blue-600' : 'bg-black'} text-white p-4 text-center`}>
                <h3 className="text-lg font-semibold">Transaction Summary</h3>
                <p className="text-xs opacity-70 mt-1">Please review all details before confirming</p>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex justify-between pb-3 border-b">
                  <div>
                    <p className="text-xs text-[#45464d] uppercase">Customer</p>
                    <p className="font-semibold">{isPart ? customerName : selectedCustomer.fullName}</p>
                    {!isPart && <p className="text-xs text-[#45464d]">{selectedCustomer.contactNumber}</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#45464d] uppercase">Date</p>
                    <p className="text-sm">{new Date(transactionDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-3 pb-3 border-b">
                  <div className="w-12 h-12 rounded-lg bg-[#e5eeff] overflow-hidden">
                    <img src={selectedProduct.imageUrl || 'https://via.placeholder.com/48x48'} className="w-full h-full object-cover" alt={selectedProduct.name} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#45464d] uppercase">Product</p>
                      <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase ${
                        isPart ? 'bg-blue-600 text-white' : 'bg-black text-white'
                      }`}>
                        {isPart ? 'Part' : 'Model'}
                      </span>
                    </div>
                    <p className="font-semibold">{selectedProduct.name}</p>
                    {isPart ? (
                      <p className="text-xs text-[#45464d]">Qty: {partQuantity} | Total: ₱{totalAmount.toLocaleString()}</p>
                    ) : (
                      <p className="text-xs text-[#45464d]">{selectedProduct.brand} • {selectedProduct.type}</p>
                    )}
                  </div>
                  {!isPart && selectedUnit && (
                    <div className="text-right">
                      <p className="text-xs text-[#45464d] uppercase">Unit Details</p>
                      <p className="text-xs font-mono">{selectedUnit.engineNumber}</p>
                      <p className="text-xs font-mono">{selectedUnit.chassisNumber}</p>
                    </div>
                  )}
                </div>

                <div className="pb-3 border-b">
                  <p className="text-xs text-[#45464d] uppercase mb-2">Payment Details</p>
                  {isPart ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Total Amount</span>
                        <span>₱{totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Amount Paid</span>
                        <span>₱{parseFloat(amountPaid || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mt-1">
                        <span>Change</span>
                        <span className="text-green-600 font-bold">₱{calculateChange().toLocaleString()}</span>
                      </div>
                    </>
                  ) : paymentType === 'Cash' ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span>Selling Price</span>
                        <span>₱{parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0).toLocaleString()}</span>
                      </div>
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
                      <div className="flex justify-between text-sm">
                        <span>Selling Price</span>
                        <span>₱{parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0).toLocaleString()}</span>
                      </div>
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
                        <span>₱{(parseFloat(selectedUnit?.sellingPrice || selectedProduct?.price || 0) - (parseFloat(downPayment) || 0)).toLocaleString()}</span>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex justify-between items-center pt-2">
                  <span className="text-xs text-[#45464d] uppercase">Total Amount</span>
                  <span className="text-xl font-bold text-black">
                    {isPart ? `₱${totalAmount.toLocaleString()}` : (
                      paymentType === 'Cash' 
                        ? `₱${parseFloat(amountPaid || 0).toLocaleString()}`
                        : `₱${parseFloat(downPayment || 0).toLocaleString()}`
                    )}
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

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-4">
            <button 
              onClick={prevStep} 
              className={`px-5 py-2 border border-[#c6c6cd] rounded-lg text-xs font-semibold transition-all ${currentStep === 1 ? 'invisible' : 'hover:bg-[#eff4ff] hover:border-black'}`}
            >
              ← Previous
            </button>
            {currentStep < steps.length ? (
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
                  <p className="text-xs font-semibold">Customer</p>
                  <p className="text-[10px] opacity-50 truncate">
                    {isPart ? (customerName || 'Not entered') : (selectedCustomer?.fullName || 'Not selected')}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isStep2Complete() ? 'bg-green-500' : 'bg-white/20 text-white'}`}>
                  {isStep2Complete() ? <span className="material-symbols-outlined text-xs">check</span> : 2}
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold">Product</p>
                  <p className="text-[10px] opacity-50 truncate">{selectedProduct?.name || 'Not selected'}</p>
                  {selectedProduct && (
                    <p className={`text-[9px] ${isPart ? 'text-blue-400' : 'text-gray-400'}`}>
                      {isPart ? 'Part' : 'Model'}
                    </p>
                  )}
                </div>
              </div>
              
              {!isPart && (
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isStep3Complete() ? 'bg-green-500' : 'bg-white/20 text-white'}`}>
                    {isStep3Complete() ? <span className="material-symbols-outlined text-xs">check</span> : 3}
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold">Payment</p>
                    <p className="text-[10px] opacity-50">{paymentType === 'Cash' ? 'Cash payment' : `${terms} months installment`}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-white/70">Transaction Progress</span>
                <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase ${
                  isStep1Complete() && isStep2Complete() && (isPart || isStep3Complete()) ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {isStep1Complete() && isStep2Complete() && (isPart || isStep3Complete()) ? 'Ready' : 'In Progress'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
              </div>
              <p className="text-[10px] text-white/50 text-center mt-2">{Math.round(progressPercentage)}% Complete</p>
            </div>

            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="flex justify-between text-xs">
                <span className="opacity-70">Total Amount</span>
                <span className="font-bold">
                  {isPart ? `₱${totalAmount.toLocaleString()}` : (
                    paymentType === 'Cash' 
                      ? `₱${parseFloat(amountPaid || 0).toLocaleString()}`
                      : `₱${parseFloat(downPayment || 0).toLocaleString()}`
                  )}
                </span>
              </div>
            </div>

            {/* Cashier Info */}
            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xs text-white/50">badge</span>
                <div>
                  <p className="text-[10px] text-white/50 uppercase">Processed By</p>
                  <p className="text-xs font-semibold">{user?.name}</p>
                  <p className="text-[10px] text-white/40">{user?.role}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NewTransaction