// src/components/cashier/CheckInventory.jsx
import { useState, useEffect } from 'react'
import { watchInventory, watchInventoryUnits } from '../../lib/inventory'

function CheckInventory() {
  const [inventory, setInventory] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [units, setUnits] = useState([])
  const [activeTab, setActiveTab] = useState('all') // 'all', 'models', 'parts'

  useEffect(() => {
    const unsubscribe = watchInventory(
      (items) => {
        setInventory(items)
        setIsLoading(false)
      },
      (error) => {
        console.error('Error fetching inventory:', error)
        setIsLoading(false)
      }
    )
    return unsubscribe
  }, [])

  useEffect(() => {
    if (!selectedProduct || selectedProduct.isPart) {
      return undefined
    }
    const unsubscribe = watchInventoryUnits(
      selectedProduct.id,
      (list) => setUnits(list),
      () => setUnits([])
    )
    return unsubscribe
  }, [selectedProduct])

  const handleViewDetails = (product) => {
    setSelectedProduct(product)
    if (product.isPart) setUnits([])
  }

  const handleCloseModal = () => {
    setSelectedProduct(null)
    setUnits([])
  }

  const getFilteredItems = () => {
    let items = inventory

    if (searchTerm) {
      items = items.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (activeTab === 'models') {
      items = items.filter(item => !item.isPart)
    } else if (activeTab === 'parts') {
      items = items.filter(item => item.isPart)
    }

    return items
  }

  const getStatusBadge = (item) => {
    if (item.isPart) {
      const stock = parseInt(item.quantity) || 0
      if (stock === 0) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Out of Stock</span>
      if (stock < 5) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Low Stock</span>
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">{stock} in Stock</span>
    }

    const stock = parseInt(item.stock) || 0
    if (stock === 0) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Out of Stock</span>
    if (stock < 5) return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">Low Stock</span>
    return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">In Stock</span>
  }

  const getTypeBadge = (item) => (
    item.isPart
      ? <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-red text-white">PART</span>
      : <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-brand-navy text-white">MODEL</span>
  )

  const filteredInventory = getFilteredItems()

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-[#0b1c30]">Inventory List</h3>
        <p className="text-sm text-[#45464d] mt-1">View all available motorcycle models and parts.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 border-b border-[#c6c6cd]">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === 'all'
              ? 'border-black text-black'
              : 'border-transparent text-[#45464d] hover:text-black'
          }`}
        >
          All Items
        </button>
        <button
          onClick={() => setActiveTab('models')}
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
          onClick={() => setActiveTab('parts')}
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
          {filteredInventory.length} item(s)
        </span>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
          <input
            type="text"
            placeholder={activeTab === 'parts' ? "Search parts..." : "Search by model name or brand..."}
            className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Inventory Grid */}
      {filteredInventory.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-[#c6c6cd]">
          <span className="material-symbols-outlined text-4xl text-[#45464d] mb-2 block">inventory</span>
          <p className="text-[#45464d]">No {activeTab === 'parts' ? 'parts' : activeTab === 'models' ? 'models' : 'inventory items'} found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-[#c6c6cd] rounded-xl p-4 shadow-sm hover:shadow-md hover:border-black transition-all"
            >
              <div className="flex items-start gap-3">
                <div className="w-16 h-16 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                  <img
                    src={item.imageUrl || 'https://via.placeholder.com/64x64'}
                    className="w-full h-full object-cover"
                    alt={item.name}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800 truncate">{item.name}</h3>
                    {getTypeBadge(item)}
                  </div>
                  <p className="text-xs text-[#45464d]">
                    {item.isPart ? `Stock: ${item.quantity || 0}` : `${item.brand} • ${item.type}`}
                  </p>
                  <div className="mt-2 flex items-center justify-between flex-wrap gap-1">
                    <p className="text-lg font-bold text-black">₱{parseFloat(item.price).toLocaleString()}</p>
                    {getStatusBadge(item)}
                  </div>
                  <button
                    onClick={() => handleViewDetails(item)}
                    className="mt-3 w-full py-1.5 text-xs font-semibold text-black border border-[#c6c6cd] rounded-lg hover:bg-black hover:text-white transition-all"
                  >
                    {item.isPart ? 'View Details' : 'View Units'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details/Units Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleCloseModal}>
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-[#c6c6cd] p-4 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-[#0b1c30]">{selectedProduct.name}</h3>
                  {getTypeBadge(selectedProduct)}
                </div>
                <p className="text-xs text-[#45464d]">
                  {selectedProduct.isPart
                    ? `Stock: ${selectedProduct.quantity || 0} units`
                    : `${selectedProduct.brand} • ${selectedProduct.type}`}
                </p>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined text-[#45464d]">close</span>
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
              {selectedProduct.isPart ? (
                // Parts Details
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-[#f8f9ff] p-4 rounded-lg border border-[#c6c6cd]">
                      <p className="text-xs text-[#45464d] uppercase">Quantity</p>
                      <p className="text-2xl font-bold text-black">{selectedProduct.quantity || 0}</p>
                    </div>
                    <div className="bg-[#f8f9ff] p-4 rounded-lg border border-[#c6c6cd]">
                      <p className="text-xs text-[#45464d] uppercase">Price per Unit</p>
                      <p className="text-2xl font-bold text-black">₱{parseFloat(selectedProduct.price).toLocaleString()}</p>
                    </div>
                    <div className="bg-[#f8f9ff] p-4 rounded-lg border border-[#c6c6cd]">
                      <p className="text-xs text-[#45464d] uppercase">SKU</p>
                      <p className="text-sm font-mono text-black">{selectedProduct.sku || 'N/A'}</p>
                    </div>
                    <div className="bg-[#f8f9ff] p-4 rounded-lg border border-[#c6c6cd]">
                      <p className="text-xs text-[#45464d] uppercase">Status</p>
                      <p className="text-sm font-semibold">
                        {selectedProduct.quantity > 0 ? (
                          <span className="text-green-600">In Stock</span>
                        ) : (
                          <span className="text-red-600">Out of Stock</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {selectedProduct.description && (
                    <div className="bg-[#f8f9ff] p-4 rounded-lg border border-[#c6c6cd]">
                      <p className="text-xs text-[#45464d] uppercase">Description</p>
                      <p className="text-sm text-black mt-1">{selectedProduct.description}</p>
                    </div>
                  )}
                  {selectedProduct.notes && (
                    <div className="bg-[#f8f9ff] p-4 rounded-lg border border-[#c6c6cd]">
                      <p className="text-xs text-[#45464d] uppercase">Notes</p>
                      <p className="text-sm text-black mt-1">{selectedProduct.notes}</p>
                    </div>
                  )}
                </div>
              ) : (
                // Models Units
                units.length === 0 ? (
                  <div className="text-center py-8 text-[#45464d]">
                    <span className="material-symbols-outlined text-3xl mb-2 block">inventory</span>
                    <p>No units found for this model.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-black text-white">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-semibold">#</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Engine #</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Chassis #</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Color</th>
                          <th className="px-4 py-2 text-left text-xs font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#c6c6cd]">
                        {units.map((unit, index) => (
                          <tr key={unit.id} className="hover:bg-[#f8f9ff] transition-colors">
                            <td className="px-4 py-2 text-xs text-[#76777d]">{index + 1}</td>
                            <td className="px-4 py-2 text-xs font-mono text-[#76777d]">{unit.engineNumber}</td>
                            <td className="px-4 py-2 text-xs font-mono text-[#76777d]">{unit.chassisNumber}</td>
                            <td className="px-4 py-2 text-xs">
                              <div className="flex items-center gap-1">
                                <div className={`w-3 h-3 rounded-full ${
                                  unit.color?.toLowerCase() === 'black' ? 'bg-black' :
                                  unit.color?.toLowerCase() === 'red' ? 'bg-red-600' :
                                  unit.color?.toLowerCase() === 'blue' ? 'bg-blue-600' :
                                  'bg-gray-400'
                                }`}></div>
                                {unit.color || '—'}
                              </div>
                            </td>
                            <td className="px-4 py-2 text-xs">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                                unit.status === 'Available' ? 'bg-green-100 text-green-800' :
                                unit.status === 'Sold' ? 'bg-gray-100 text-gray-800' :
                                'bg-yellow-100 text-yellow-800'
                              }`}>
                                {unit.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-[#f8f9ff] border-t border-[#c6c6cd]">
                        <tr>
                          <td colSpan="5" className="px-4 py-2 text-xs text-[#45464d]">
                            Total Units: {units.length}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )
              )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-[#c6c6cd] p-4 flex justify-between items-center">
              <div className="text-xs text-[#45464d]">
                {selectedProduct.isPart ? (
                  <span>Part ID: #{selectedProduct.id}</span>
                ) : (
                  <span>{units.length} unit(s) available</span>
                )}
              </div>
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 bg-black text-white text-xs font-semibold rounded-lg hover:bg-gray-800 transition-colors"
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

export default CheckInventory
