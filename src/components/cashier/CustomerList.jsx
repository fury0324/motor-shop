// src/components/cashier/CustomerList.jsx
import { useState, useEffect } from 'react'
import { watchCustomers } from '../../lib/customers'
import AddressMapView from '../shared/AddressMapView'

const formatTimestamp = (value) => {
  if (!value) return null
  const date = typeof value?.toDate === 'function' ? value.toDate() : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function CustomerList() {
  const [customers, setCustomers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const itemsPerPage = 10

  useEffect(() => {
    const unsubscribe = watchCustomers(
      (list) => {
        setCustomers(list)
        setIsLoading(false)
      },
      (error) => {
        console.error('Error fetching customers:', error)
        setIsLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const handleViewCustomer = (customer) => {
    setSelectedCustomer(customer)
    setShowViewModal(true)
  }

  const filteredCustomers = customers.filter(customer =>
    customer.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.contactNumber?.includes(searchTerm)
  )

  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage)

  if (isLoading && customers.length === 0) {
    return (
      <div className="p-5 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5">

      <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#c6c6cd]">
          <div className="relative max-w-sm">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
            <input
              className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none"
              placeholder="Search customers by name, email or contact..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {customers.length === 0 ? (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-5xl text-gray-400">people</span>
            <p className="text-gray-500 mt-2">No customers yet.</p>
            <p className="text-xs text-gray-400 mt-1">Click "Register Customer" from the sidebar menu to register a new customer.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Name</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Contact</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Email</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Registered Date</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c6cd]">
                  {paginatedCustomers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[#f8f9ff] transition-colors">
                      <td className="px-4 py-3 font-medium text-sm">{customer.fullName}</td>
                      <td className="px-4 py-3 text-sm">{customer.contactNumber}</td>
                      <td className="px-4 py-3 text-sm">{customer.email}</td>
                      <td className="px-4 py-3 text-sm">{formatTimestamp(customer.createdAt)?.toLocaleDateString() || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleViewCustomer(customer)}
                          className="p-1 hover:text-blue-600 transition-colors"
                          title="View Details"
                        >
                          <span className="material-symbols-outlined text-base">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
               </table>
            </div>

            {totalPages > 1 && (
              <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8f9ff] border-t border-[#c6c6cd]">
                <span className="text-sm text-[#45464d]">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredCustomers.length)} of {filteredCustomers.length} customers
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-[#dde3eb] disabled:opacity-30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">chevron_left</span>
                  </button>
                  {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    return (
                      <button
                        key={i}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors ${
                          currentPage === pageNum
                            ? 'bg-black text-white'
                            : 'hover:bg-[#dde3eb]'
                        }`}
                      >
                        {pageNum}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-[#dde3eb] disabled:opacity-30 transition-colors"
                  >
                    <span className="material-symbols-outlined text-base">chevron_right</span>
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* View Customer Modal */}
      {showViewModal && selectedCustomer && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#131b2e]/40 backdrop-blur-sm" onClick={() => setShowViewModal(false)}></div>
          <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 opacity-100 max-h-[90vh] overflow-y-auto">
            <div className="bg-black text-white p-4 flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-semibold">Customer Details</h3>
              <button onClick={() => setShowViewModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-6">
              {/* Personal Information Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#c6c6cd]">
                  <span className="material-symbols-outlined text-black">person</span>
                  <h4 className="text-base font-semibold text-[#0b1c30]">Personal Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#45464d]">Full Name</label>
                    <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.fullName || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#45464d]">Contact Number</label>
                    <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.contactNumber || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#45464d]">Email Address</label>
                    <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.email || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#45464d]">Birth Date</label>
                    <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.birthDate || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#45464d]">Civil Status</label>
                    <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.civilStatus || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#45464d]">Occupation</label>
                    <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.occupation || '—'}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#45464d]">Monthly Income</label>
                    <p className="text-sm text-[#0b1c30] mt-1">
                      {selectedCustomer.monthlyIncome ? `₱${parseFloat(selectedCustomer.monthlyIncome).toLocaleString()}` : '—'}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-[#45464d]">Home Address</label>
                    <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.homeAddress || '—'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-[#45464d] mb-1 block">Map Location</label>
                    <AddressMapView
                      lat={selectedCustomer.homeLat}
                      lng={selectedCustomer.homeLng}
                      label={selectedCustomer.fullName}
                    />
                  </div>
                </div>
              </div>

              {/* Documents Section - Read only for cashier */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#c6c6cd]">
                  <span className="material-symbols-outlined text-black">description</span>
                  <h4 className="text-base font-semibold text-[#0b1c30]">Required Documents</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    ['Valid ID', 'Passport/UMID/License', selectedCustomer.documents?.validIdUrl],
                    ['Barangay Clearance', 'Issued within 6 months', selectedCustomer.documents?.barangayClearanceUrl],
                    ['Utility Receipt', 'Meralco/Water/Internet', selectedCustomer.documents?.utilityReceiptUrl],
                    ['Proof of Income', 'Payslip/COE', selectedCustomer.documents?.proofOfIncomeUrl],
                  ].map(([title, subtitle, url]) => (
                    <div key={title} className="flex items-center justify-between p-3 bg-[#f8f9ff] rounded-lg border border-[#c6c6cd]">
                      <div>
                        <p className="text-xs font-semibold text-[#0b1c30]">{title}</p>
                        <p className="text-[10px] text-[#45464d]">{subtitle}</p>
                      </div>
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs font-semibold hover:underline">
                          View Document
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">Not uploaded</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Co-Maker Section */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#c6c6cd]">
                  <span className="material-symbols-outlined text-black">handshake</span>
                  <h4 className="text-base font-semibold text-[#0b1c30]">Co-Maker Information</h4>
                </div>
                {selectedCustomer.coMaker?.name ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-[#45464d]">Co-Maker Name</label>
                      <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.coMaker.name}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#45464d]">Co-Maker Contact</label>
                      <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.coMaker.contact || '—'}</p>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-[#45464d]">Relationship</label>
                      <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.coMaker.relationship || '—'}</p>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-xs font-semibold text-[#45464d]">Co-Maker Address</label>
                      <p className="text-sm text-[#0b1c30] mt-1">{selectedCustomer.coMaker.address || '—'}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-[#f8f9ff] rounded-lg border border-[#c6c6cd]">
                      <div>
                        <p className="text-xs font-semibold text-[#0b1c30]">Co-Maker Valid ID</p>
                        <p className="text-[10px] text-[#45464d]">Passport/UMID/Driver's License</p>
                      </div>
                      {selectedCustomer.coMaker.idUrl ? (
                        <a href={selectedCustomer.coMaker.idUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs font-semibold hover:underline">
                          View Document
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">Not uploaded</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[#45464d]">No co-maker information provided.</p>
                )}
              </div>

              {/* Registration Info */}
              <div>
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-[#c6c6cd]">
                  <span className="material-symbols-outlined text-black">event</span>
                  <h4 className="text-base font-semibold text-[#0b1c30]">Registration Information</h4>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-[#45464d]">Date Registered</label>
                    <p className="text-sm text-[#0b1c30] mt-1">
                      {formatTimestamp(selectedCustomer.createdAt)?.toLocaleString() || '—'}
                    </p>
                  </div>
                  {formatTimestamp(selectedCustomer.updatedAt) && (
                    <div>
                      <label className="text-xs font-semibold text-[#45464d]">Last Updated</label>
                      <p className="text-sm text-[#0b1c30] mt-1">
                        {formatTimestamp(selectedCustomer.updatedAt).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 bg-[#f8f9ff] border-t border-[#c6c6cd] flex justify-end gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="px-4 py-2 text-xs font-semibold tracking-wide bg-black text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CustomerList
