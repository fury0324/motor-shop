// src/components/cashier/RegisterCustomer.jsx
import { useState } from 'react'
import Swal from '../../lib/swal'
import { useCurrentUser } from '../../lib/useCurrentUser'
import { newCustomerId, uploadCustomerFile, createCustomer } from '../../lib/customers'

function RegisterCustomer() {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [personalInfo, setPersonalInfo] = useState({
    fullName: '',
    contactNumber: '',
    email: '',
    homeAddress: '',
    birthDate: '',
    civilStatus: '',
    occupation: '',
    monthlyIncome: ''
  })

  const [documents, setDocuments] = useState({
    validId: { file: null, uploaded: false, name: '', url: '' },
    barangayClearance: { file: null, uploaded: false, name: '', url: '' },
    utilityReceipt: { file: null, uploaded: false, name: '', url: '' },
    proofOfIncome: { file: null, uploaded: false, name: '', url: '' }
  })

  const [coMaker, setCoMaker] = useState({
    fullName: '',
    contactNumber: '',
    relationship: '',
    address: '',
    validId: { file: null, uploaded: false, name: '', url: '' }
  })

  // Get current user info for "Added By" (sent to the backend but not displayed)
  const { user } = useCurrentUser()
  const userName = user?.name || 'Cashier'
  const userRole = user?.role || 'cashier'

  const steps = [
    { number: 1, title: 'Personal Information', description: 'Basic client details', icon: 'person' },
    { number: 2, title: 'Required Documents', description: 'Upload requirements', icon: 'description' },
    { number: 3, title: 'Co-Maker Verification', description: 'Guarantor details', icon: 'handshake' }
  ]

  const civilStatusOptions = ['Single', 'Married', 'Divorced', 'Widowed']
  const relationshipOptions = ['Spouse', 'Parent', 'Sibling', 'Relative', 'Friend', 'Employer']

  const isStep1Complete = () => {
    return !!(personalInfo.fullName && personalInfo.contactNumber && personalInfo.email && personalInfo.homeAddress)
  }

  const isStep2Complete = () => {
    const requiredDocs = ['validId', 'barangayClearance', 'utilityReceipt', 'proofOfIncome']
    return requiredDocs.every(doc => documents[doc].uploaded)
  }

  const isStep3Complete = () => {
    return !!(coMaker.fullName && coMaker.contactNumber && coMaker.relationship && coMaker.validId.uploaded)
  }

  const getStepStatus = (stepNumber) => {
    if (stepNumber < currentStep) return 'completed'
    if (stepNumber === currentStep) return 'current'
    return 'pending'
  }

  const handlePersonalInfoChange = (e) => {
    setPersonalInfo({ ...personalInfo, [e.target.name]: e.target.value })
  }

  const handleDocumentUpload = (docType, file) => {
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setDocuments(prev => ({
          ...prev,
          [docType]: { 
            file: file, 
            uploaded: true, 
            name: file.name,
            url: reader.result 
          }
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCoMakerChange = (e) => {
    setCoMaker({ ...coMaker, [e.target.name]: e.target.value })
  }

  const handleCoMakerIdUpload = (file) => {
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setCoMaker(prev => ({
          ...prev,
          validId: { 
            file: file, 
            uploaded: true, 
            name: file.name,
            url: reader.result 
          }
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  const removeDocument = (docType) => {
    setDocuments(prev => ({
      ...prev,
      [docType]: { file: null, uploaded: false, name: '', url: '' }
    }))
  }

  const removeCoMakerId = () => {
    setCoMaker(prev => ({
      ...prev,
      validId: { file: null, uploaded: false, name: '', url: '' }
    }))
  }

  const nextStep = () => {
    if (currentStep === 1 && !isStep1Complete()) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please fill in all required personal information fields!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }
    
    if (currentStep === 2 && !isStep2Complete()) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Documents',
        text: 'Please upload all required documents!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }
    
    if (currentStep < 3) {
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
        text: 'Please fill in all co-maker information fields and upload valid ID!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsSubmitting(true)

    Swal.fire({
      title: 'Submitting Application...',
      text: 'Please wait while we process the registration.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      const customerId = newCustomerId()

      Swal.update({ text: 'Uploading documents...' })
      const [validIdUrl, barangayClearanceUrl, utilityReceiptUrl, proofOfIncomeUrl, coMakerIdUrl] =
        await Promise.all([
          uploadCustomerFile(customerId, 'validId', documents.validId.file),
          uploadCustomerFile(customerId, 'barangayClearance', documents.barangayClearance.file),
          uploadCustomerFile(customerId, 'utilityReceipt', documents.utilityReceipt.file),
          uploadCustomerFile(customerId, 'proofOfIncome', documents.proofOfIncome.file),
          uploadCustomerFile(customerId, 'coMakerId', coMaker.validId.file),
        ])

      Swal.update({ text: 'Saving customer record...' })
      await createCustomer({
        customerId,
        fullName: personalInfo.fullName,
        contactNumber: personalInfo.contactNumber,
        email: personalInfo.email,
        homeAddress: personalInfo.homeAddress,
        birthDate: personalInfo.birthDate,
        civilStatus: personalInfo.civilStatus,
        occupation: personalInfo.occupation,
        monthlyIncome: personalInfo.monthlyIncome,
        documents: {
          validIdUrl,
          barangayClearanceUrl,
          utilityReceiptUrl,
          proofOfIncomeUrl,
        },
        coMaker: {
          name: coMaker.fullName,
          contact: coMaker.contactNumber,
          relationship: coMaker.relationship,
          address: coMaker.address,
          idUrl: coMakerIdUrl,
        },
        addedByName: userName,
        addedByRole: userRole,
      })

      Swal.fire({
        icon: 'success',
        title: 'Customer Registered!',
        text: `${personalInfo.fullName} has been successfully registered.`,
        timer: 2000,
        timerProgressBar: true
      })

      setCurrentStep(1)
      setPersonalInfo({
        fullName: '',
        contactNumber: '',
        email: '',
        homeAddress: '',
        birthDate: '',
        civilStatus: '',
        occupation: '',
        monthlyIncome: ''
      })
      setDocuments({
        validId: { file: null, uploaded: false, name: '', url: '' },
        barangayClearance: { file: null, uploaded: false, name: '', url: '' },
        utilityReceipt: { file: null, uploaded: false, name: '', url: '' },
        proofOfIncome: { file: null, uploaded: false, name: '', url: '' }
      })
      setCoMaker({
        fullName: '',
        contactNumber: '',
        relationship: '',
        address: '',
        validId: { file: null, uploaded: false, name: '', url: '' }
      })
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Registration Failed',
        text: error.message || 'Failed to register customer.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getDocumentIcon = (docType) => {
    const icons = {
      validId: 'badge',
      barangayClearance: 'home',
      utilityReceipt: 'receipt',
      proofOfIncome: 'work'
    }
    return icons[docType] || 'description'
  }

  const getDocumentTitle = (docType) => {
    const titles = {
      validId: 'Valid ID',
      barangayClearance: 'Barangay Clearance',
      utilityReceipt: 'Latest Utility Receipt',
      proofOfIncome: 'Proof of Income'
    }
    return titles[docType] || docType
  }

  const getDocumentSubtitle = (docType) => {
    const subtitles = {
      validId: 'Passport/UMID/License',
      barangayClearance: 'Issued within 6 months',
      utilityReceipt: 'Meralco/Water/Internet',
      proofOfIncome: 'Payslip/Certificate of Employment'
    }
    return subtitles[docType] || ''
  }

  const uploadedCount = Object.values(documents).filter(d => d.uploaded).length
  const progressPercentage = (currentStep / 3) * 100

  return (
    <div className="p-4 sm:p-5">
      <div className="mb-6">
        <nav className="flex items-center gap-2 text-sm text-[#45464d] mb-2">
          <span>Customer Management</span>
          <span className="material-symbols-outlined text-sm">chevron_right</span>
          <span className="text-black font-semibold">Register Customer</span>
        </nav>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-2xl font-bold text-[#0b1c30]">Register Customer</h2>
            <p className="text-sm text-[#45464d] mt-1">Register a new client into the Euro Motor ecosystem.</p>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg shadow-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 w-full sm:w-auto"
          >
            {isSubmitting ? 'Submitting...' : 'Register Customer'}
          </button>
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
        {/* Main Content */}
        <div className="lg:col-span-2">
          {currentStep === 1 && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-black text-xl">person</span>
                <h3 className="text-lg font-semibold text-[#0b1c30]">Personal Information</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Full Name *</label>
                  <input 
                    name="fullName"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="e.g. Juan Dela Cruz" 
                    type="text"
                    value={personalInfo.fullName}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Contact Number *</label>
                  <input 
                    name="contactNumber"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="e.g. 09123456789" 
                    type="tel"
                    value={personalInfo.contactNumber}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Email Address *</label>
                  <input 
                    name="email"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="e.g. juan@example.com" 
                    type="email"
                    value={personalInfo.email}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Birth Date</label>
                  <input 
                    name="birthDate"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    type="date"
                    value={personalInfo.birthDate}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Civil Status</label>
                  <select 
                    name="civilStatus"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
                    value={personalInfo.civilStatus}
                    onChange={handlePersonalInfoChange}
                  >
                    <option value="">Select status...</option>
                    {civilStatusOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Occupation</label>
                  <input 
                    name="occupation"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="e.g. Software Engineer"
                    type="text"
                    value={personalInfo.occupation}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Monthly Income (₱)</label>
                  <input 
                    name="monthlyIncome"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="e.g. 50000"
                    type="number"
                    value={personalInfo.monthlyIncome}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
                <div className="md:col-span-2 flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Complete Home Address *</label>
                  <textarea 
                    name="homeAddress"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="Street, Barangay, City, Province"
                    rows="3"
                    value={personalInfo.homeAddress}
                    onChange={handlePersonalInfoChange}
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-black text-xl">description</span>
                <h3 className="text-lg font-semibold text-[#0b1c30]">Required Documents</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {['validId', 'barangayClearance', 'utilityReceipt', 'proofOfIncome'].map((docType) => (
                  <div 
                    key={docType}
                    className={`p-3 border rounded-lg flex items-center justify-between transition-all cursor-pointer hover:border-black ${
                      documents[docType].uploaded ? 'border-green-500 bg-green-50' : 'border-[#c6c6cd] bg-white'
                    }`}
                    onClick={() => {
                      if (!documents[docType].uploaded) {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*,.pdf'
                        input.onchange = (e) => {
                          if (e.target.files[0]) {
                            handleDocumentUpload(docType, e.target.files[0])
                          }
                        }
                        input.click()
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#e5eeff] flex items-center justify-center">
                        <span className="material-symbols-outlined text-black text-sm">{getDocumentIcon(docType)}</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0b1c30]">{getDocumentTitle(docType)}</p>
                        <p className="text-[10px] text-[#45464d]">{getDocumentSubtitle(docType)}</p>
                        {documents[docType].uploaded && (
                          <p className="text-[9px] text-green-600 mt-1">{documents[docType].name}</p>
                        )}
                      </div>
                    </div>
                    {documents[docType].uploaded ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-xs font-semibold">Uploaded</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            removeDocument(docType)
                          }}
                          className="p-1 hover:bg-red-100 rounded-full transition-colors"
                        >
                          <span className="material-symbols-outlined text-red-500 text-sm">close</span>
                        </button>
                      </div>
                    ) : (
                      <span className="material-symbols-outlined text-[#45464d] text-sm">cloud_upload</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="bg-white border border-[#c6c6cd] rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-black text-xl">handshake</span>
                <h3 className="text-lg font-semibold text-[#0b1c30]">Co-Maker Verification</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Co-Maker Full Name *</label>
                  <input 
                    name="fullName"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="Full name of co-maker"
                    type="text"
                    value={coMaker.fullName}
                    onChange={handleCoMakerChange}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Contact Number *</label>
                  <input 
                    name="contactNumber"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="e.g. 09123456789"
                    type="tel"
                    value={coMaker.contactNumber}
                    onChange={handleCoMakerChange}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Relationship *</label>
                  <select 
                    name="relationship"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
                    value={coMaker.relationship}
                    onChange={handleCoMakerChange}
                  >
                    <option value="">Select relationship...</option>
                    {relationshipOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Complete Address</label>
                  <input 
                    name="address"
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all" 
                    placeholder="Street, Barangay, City, Province"
                    type="text"
                    value={coMaker.address}
                    onChange={handleCoMakerChange}
                  />
                </div>
                <div className="md:col-span-2">
                  <div 
                    className={`p-3 border rounded-lg flex items-center justify-between transition-all cursor-pointer ${
                      coMaker.validId.uploaded ? 'border-green-500 bg-green-50' : 'border-[#c6c6cd] bg-white hover:border-black'
                    }`}
                    onClick={() => {
                      if (!coMaker.validId.uploaded) {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*,.pdf'
                        input.onchange = (e) => {
                          if (e.target.files[0]) {
                            handleCoMakerIdUpload(e.target.files[0])
                          }
                        }
                        input.click()
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#e5eeff] flex items-center justify-center">
                        <span className="material-symbols-outlined text-black text-sm">badge</span>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-[#0b1c30]">Co-Maker Valid ID *</p>
                        <p className="text-[10px] text-[#45464d]">Passport/UMID/Driver's License</p>
                        {coMaker.validId.uploaded && (
                          <p className="text-[9px] text-green-600 mt-1">{coMaker.validId.name}</p>
                        )}
                      </div>
                    </div>
                    {coMaker.validId.uploaded ? (
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-xs font-semibold">Uploaded</span>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation()
                            removeCoMakerId()
                          }}
                          className="p-1 hover:bg-red-100 rounded-full transition-colors"
                        >
                          <span className="material-symbols-outlined text-red-500 text-sm">close</span>
                        </button>
                      </div>
                    ) : (
                      <span className="material-symbols-outlined text-[#45464d] text-sm">cloud_upload</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Summary Sidebar - No "Added By" for cashier */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-[#131b2e] to-[#1a2538] text-white rounded-xl p-5 shadow-lg sticky top-5">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider opacity-70">Registration Summary</h4>
              <span className="text-xs font-bold bg-white/10 px-2 py-0.5 rounded-full">
                {currentStep}/3
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isStep1Complete() ? 'bg-green-500' : currentStep === 1 ? 'bg-white text-black' : 'bg-white/20'
                }`}>
                  {isStep1Complete() ? <span className="material-symbols-outlined text-xs">check</span> : 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold">Personal Info</p>
                    {isStep1Complete() && <span className="text-green-400 text-[9px]">Complete</span>}
                  </div>
                  <p className="text-[10px] opacity-50 mt-0.5 truncate">{personalInfo.fullName || 'Not filled'}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isStep2Complete() ? 'bg-green-500' : currentStep === 2 ? 'bg-white text-black' : 'bg-white/20'
                }`}>
                  {isStep2Complete() ? <span className="material-symbols-outlined text-xs">check</span> : 2}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold">Documents</p>
                    {isStep2Complete() && <span className="text-green-400 text-[9px]">Complete</span>}
                  </div>
                  <p className="text-[10px] opacity-50 mt-0.5">{uploadedCount} of 4 uploaded</p>
                  <div className="w-full h-1 bg-white/20 mt-1 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-300"
                      style={{ width: `${(uploadedCount / 4) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isStep3Complete() ? 'bg-green-500' : currentStep === 3 ? 'bg-white text-black' : 'bg-white/20'
                }`}>
                  {isStep3Complete() ? <span className="material-symbols-outlined text-xs">check</span> : 3}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-semibold">Co-Maker</p>
                    {isStep3Complete() && <span className="text-green-400 text-[9px]">Complete</span>}
                  </div>
                  <p className="text-[10px] opacity-50 mt-0.5 truncate">{coMaker.fullName || 'Pending'}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] text-white/70">Application Status</span>
                <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded uppercase ${
                  currentStep === 3 && isStep3Complete() ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                }`}>
                  {currentStep === 3 && isStep3Complete() ? 'Ready' : 'In Progress'}
                </span>
              </div>
              <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercentage}%` }}
                />
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
        
        {currentStep < 3 ? (
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
            {isSubmitting ? 'Processing...' : '✓ Submit'}
          </button>
        )}
      </div>
    </div>
  )
}

export default RegisterCustomer