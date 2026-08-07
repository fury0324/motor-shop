import { useState, useEffect } from 'react'
import Swal from '../../lib/swal'
import {
  watchInventoryWithUnits,
  newInventoryId,
  uploadInventoryImage,
  createInventoryItem,
  updateInventoryItem,
  addInventoryUnit,
  deleteInventoryItem,
} from '../../lib/inventory'
import { getSettings } from '../../lib/settings'

function Inventory() {
  const [viewMode, setViewMode] = useState('grid')
  const [activeTab, setActiveTab] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [priceFilter, setPriceFilter] = useState('Any Range')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [editSelectedFile, setEditSelectedFile] = useState(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [expandedUnits, setExpandedUnits] = useState({})
  const [addItemType, setAddItemType] = useState(null) // 'model' or 'part'
  
  // New state for part image preview
  const [partImagePreview, setPartImagePreview] = useState(null)
  const [partSelectedFile, setPartSelectedFile] = useState(null)
  const [editPartImagePreview, setEditPartImagePreview] = useState(null)
  const [editPartSelectedFile, setEditPartSelectedFile] = useState(null)
  
  // New state for editing parts - additional fields
  const [editPartDetails, setEditPartDetails] = useState({
    description: '',
    color: '',
    notes: ''
  })
  
  const itemsPerPage = 12
  const [typeOptions, setTypeOptions] = useState(['Sport', 'Scooter', 'Off-road', 'Street', 'Touring', 'Cruiser'])
  const [defaultMarkupPercent, setDefaultMarkupPercent] = useState(0)

  // For Models (full form)
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'Motorcycle',
    type: '',
    brand: '',
    price: '',
    installmentMarkupPercent: '',
    image: ''
  })

  // For Parts (simplified with image)
  const [newPart, setNewPart] = useState({
    name: '',
    quantity: '',
    price: '',
    image: '',
    description: '',
    color: '',
    notes: ''
  })

  const [editItem, setEditItem] = useState({
    id: '',
    name: '',
    sku: '',
    category: '',
    type: '',
    brand: '',
    price: '',
    installmentMarkupPercent: '',
    image: '',
    quantity: '', // For parts
    description: '',
    color: '',
    notes: ''
  })

  const [newUnit, setNewUnit] = useState({
    engine_number: '',
    chassis_number: '',
    color: '',
    notes: ''
  })

  const colorOptions = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 
    'Purple', 'Pink', 'Gray', 'Silver', 'Gold', 'Matte Black', 
    'Matte Gray', 'Carbon Fiber', 'Racing Blue', 'Rosso Corsa'
  ]

  useEffect(() => {
    const unsubscribe = watchInventoryWithUnits(
      (list) => {
        setItems(list)
        const uniqueTypes = [...new Set(list.map(item => item.type).filter(type => type))]
        if (uniqueTypes.length > 0) {
          setTypeOptions(uniqueTypes)
        }
        setIsLoading(false)
      },
      (error) => {
        console.error('Error fetching items:', error)
        setIsLoading(false)
      }
    )
    return unsubscribe
  }, [])

  useEffect(() => {
    getSettings()
      .then((result) => setDefaultMarkupPercent(Number(result.installmentMarkupPercent) || 0))
      .catch((error) => console.error('Failed to load settings:', error))
  }, [])

  const generateSKU = () => {
    const prefix = 'EM'
    const random = Math.floor(Math.random() * 9000) + 1000
    return `${prefix}-${random}`
  }

  // Handle Model Image Upload
  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Part Image Upload
  const handlePartImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPartSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPartImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleEditImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  // Handle Edit Part Image Upload
  const handleEditPartImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setEditPartSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setEditPartImagePreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const getUnitStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'text-green-600'
      case 'Reserved': return 'text-amber-600'
      case 'Sold': return 'text-blue-600'
      case 'In Transit': return 'text-purple-600'
      default: return 'text-gray-600'
    }
  }

  const getUnitStatusBg = (status) => {
    switch(status) {
      case 'Available': return 'bg-green-100'
      case 'Reserved': return 'bg-amber-100'
      case 'Sold': return 'bg-blue-100'
      case 'In Transit': return 'bg-purple-100'
      default: return 'bg-gray-100'
    }
  }

  // Handle Add Model
  const handleAddModel = async (e) => {
    e.preventDefault()
    
    if (!newItem.name || !newItem.category || !newItem.type || !newItem.brand || !newItem.price) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please fill in all required fields!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsAdding(true)

    Swal.fire({
      title: 'Adding Model...',
      text: 'Please wait while we add the model.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      const itemId = newInventoryId()
      const imageUrl = selectedFile ? await uploadInventoryImage(itemId, selectedFile) : newItem.image || ''

      await createInventoryItem({
        itemId,
        isPart: newItem.category === 'Part',
        sku: generateSKU(),
        name: newItem.name,
        brand: newItem.brand,
        category: newItem.category,
        type: newItem.type,
        price: newItem.price,
        installmentMarkupPercent: newItem.installmentMarkupPercent,
        imageUrl,
      })

      setShowAddModal(false)
      setAddItemType(null)
      setNewItem({ name: '', sku: '', category: 'Motorcycle', type: '', brand: '', price: '', installmentMarkupPercent: '', image: '' })
      setSelectedFile(null)
      setImagePreview(null)

      Swal.fire({
        icon: 'success',
        title: 'Model Added!',
        text: `${newItem.name} has been added successfully.`,
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add model.'
      })
    } finally {
      setIsAdding(false)
    }
  }

  // Handle Add Part (with image and additional fields)
  const handleAddPart = async (e) => {
    e.preventDefault()
    
    if (!newPart.name || !newPart.quantity || !newPart.price) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please fill in all required fields!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsAdding(true)

    Swal.fire({
      title: 'Adding Part...',
      text: 'Please wait while we add the part.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      const itemId = newInventoryId()
      const imageUrl = partSelectedFile ? await uploadInventoryImage(itemId, partSelectedFile) : newPart.image || ''

      await createInventoryItem({
        itemId,
        isPart: true,
        sku: generateSKU(),
        name: newPart.name,
        price: newPart.price,
        quantity: newPart.quantity,
        description: newPart.description,
        color: newPart.color,
        imageUrl,
      })

      setShowAddModal(false)
      setAddItemType(null)
      setNewPart({ name: '', quantity: '', price: '', image: '', description: '', color: '', notes: '' })
      setPartSelectedFile(null)
      setPartImagePreview(null)

      Swal.fire({
        icon: 'success',
        title: 'Part Added!',
        text: `${newPart.name} has been added successfully with ${newPart.quantity} units.`,
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add part.'
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleAddUnit = async (e) => {
    e.preventDefault()
    
    if (!newUnit.engine_number || !newUnit.chassis_number) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Engine number and Chassis number are required!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    try {
      await addInventoryUnit({
        inventoryId: selectedProduct.id,
        engineNumber: newUnit.engine_number.toUpperCase(),
        chassisNumber: newUnit.chassis_number.toUpperCase(),
        color: newUnit.color,
        notes: newUnit.notes,
      })

      setShowUnitModal(false)
      setNewUnit({ engine_number: '', chassis_number: '', color: '', notes: '' })
      setExpandedUnits({})

      Swal.fire({
        icon: 'success',
        title: 'Unit Added!',
        text: `Unit with engine ${newUnit.engine_number} has been added.`,
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add unit.'
      })
    }
  }

  const handleEditClick = (item) => {
    setEditItem({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      type: item.type,
      brand: item.brand || '',
      price: item.price,
      installmentMarkupPercent: item.installmentMarkupPercent ?? '',
      image: item.imageUrl || '',
      quantity: item.quantity || '',
      description: item.description || '',
      color: item.color || '',
      notes: item.notes || ''
    })
    setEditImagePreview(item.imageUrl || null)
    setEditSelectedFile(null)
    setEditPartImagePreview(item.imageUrl || null)
    setEditPartSelectedFile(null)
    setShowEditModal(true)
  }

  const handleUpdateItem = async (e) => {
    e.preventDefault()
    
    // Validation based on type
    if (editItem.category === 'Part') {
      if (!editItem.name || !editItem.price || !editItem.quantity) {
        Swal.fire({
          icon: 'error',
          title: 'Missing Fields',
          text: 'Please fill in all required fields for part!',
          confirmButtonColor: '#3B82F6'
        })
        return
      }
    } else {
      if (!editItem.name || !editItem.category || !editItem.type || !editItem.brand || !editItem.price) {
        Swal.fire({
          icon: 'error',
          title: 'Missing Fields',
          text: 'Please fill in all required fields!',
          confirmButtonColor: '#3B82F6'
        })
        return
      }
    }

    setIsEditing(true)

    Swal.fire({
      title: 'Updating Product...',
      text: 'Please wait while we update the product.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      const isPart = editItem.category === 'Part'
      const newFile = isPart ? editPartSelectedFile : editSelectedFile
      const imageUrl = newFile
        ? await uploadInventoryImage(editItem.id, newFile)
        : (editItem.image && editItem.image.trim() !== '' ? editItem.image : '')

      await updateInventoryItem({
        itemId: editItem.id,
        isPart,
        name: editItem.name,
        brand: editItem.brand,
        category: editItem.category,
        type: editItem.type,
        price: editItem.price,
        installmentMarkupPercent: editItem.installmentMarkupPercent,
        description: editItem.description,
        color: editItem.color,
        quantity: editItem.quantity,
        imageUrl,
      })

      setShowEditModal(false)
      setEditItem({ id: '', name: '', sku: '', category: '', type: '', brand: '', price: '', installmentMarkupPercent: '', image: '', quantity: '', description: '', color: '', notes: '' })
      setEditImagePreview(null)
      setEditSelectedFile(null)
      setEditPartImagePreview(null)
      setEditPartSelectedFile(null)

      Swal.fire({
        icon: 'success',
        title: 'Product Updated!',
        text: `${editItem.name} has been updated successfully.`,
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update product.'
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteItem = (item) => {
    Swal.fire({
      title: 'Delete Product',
      text: `Are you sure you want to delete ${item.name}? This will also delete all associated data.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    }).then(async (result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Deleting...',
          text: 'Please wait.',
          allowOutsideClick: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading()
          }
        })

        try {
          await deleteInventoryItem(item.id)
          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `${item.name} has been deleted.`,
            timer: 2000,
            timerProgressBar: true
          })
        } catch (error) {
          console.error('Error:', error)
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to delete product.'
          })
        }
      }
    })
  }

  const toggleUnits = (item) => {
    setExpandedUnits(prev => ({ ...prev, [item.id]: !prev[item.id] }))
  }

  const openAddUnitModal = (item) => {
    setSelectedProduct(item)
    setNewUnit({ 
      engine_number: '', 
      chassis_number: '', 
      color: '', 
      notes: '' 
    })
    setShowUnitModal(true)
  }

  const getStockSummary = (units) => {
    const available = units.filter(u => u.status === 'Available').length
    const reserved = units.filter(u => u.status === 'Reserved').length
    const sold = units.filter(u => u.status === 'Sold').length
    return { available, reserved, sold, total: units.length }
  }

  // Reset and open add modal
  const openAddModal = () => {
    setAddItemType(null)
    setNewItem({ name: '', sku: '', category: 'Motorcycle', type: '', brand: '', price: '', image: '' })
    setNewPart({ name: '', quantity: '', price: '', image: '', description: '', color: '', notes: '' })
    setSelectedFile(null)
    setImagePreview(null)
    setPartSelectedFile(null)
    setPartImagePreview(null)
    setShowAddModal(true)
  }

  // Filter items
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
                          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = activeTab === 'All' || item.category === activeTab
    const matchesType = typeFilter === 'All Types' || item.type === typeFilter
    
    let matchesPrice = true
    if (priceFilter !== 'Any Range') {
      const price = parseFloat(item.price)
      if (priceFilter === '₱0 - ₱50,000') {
        matchesPrice = price >= 0 && price <= 50000
      } else if (priceFilter === '₱50,000 - ₱500,000') {
        matchesPrice = price >= 50000 && price <= 500000
      } else if (priceFilter === '₱500,000+') {
        matchesPrice = price >= 500000
      }
    }
    
    return matchesSearch && matchesTab && matchesType && matchesPrice
  })

  // Pagination
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, activeTab, typeFilter, priceFilter])

  if (isLoading) {
    return (
      <div className="p-5 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">Inventory Management</h2>
          <p className="text-sm sm:text-base text-[#45464d] mt-1">Manage motorcycle models, parts, and individual units.</p>
        </div>
        <button 
          onClick={openAddModal}
          className="flex items-center gap-2 bg-black text-white px-3 py-2 sm:px-4 rounded-lg text-xs font-semibold tracking-wide hover:opacity-90 transition-all shadow-sm active:scale-95 w-full sm:w-auto justify-center"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add New Item
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
        {/* Filters Section */}
        <div className="p-4 border-b border-[#c6c6cd] bg-[#f8f9ff]">
          <div className="lg:hidden flex items-center justify-between mb-3">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="flex items-center gap-2 text-sm font-semibold text-[#0b1c30]"
            >
              <span className="material-symbols-outlined text-base">filter_list</span>
              Filters {mobileFiltersOpen ? '▲' : '▼'}
            </button>
            <div className="text-sm text-[#45464d]">
              {filteredItems.length} of {items.length} items
            </div>
          </div>

          <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block space-y-4`}>
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
                <input 
                  className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all" 
                  placeholder="Search by name, SKU..." 
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <select 
                className="px-3 py-2 border border-[#c6c6cd] rounded-lg text-xs font-semibold tracking-wide text-[#45464d] bg-white focus:outline-none"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option>All Types</option>
                {typeOptions.map(type => (
                  <option key={type}>{type}</option>
                ))}
              </select>
              
              <select 
                className="px-3 py-2 border border-[#c6c6cd] rounded-lg text-xs font-semibold tracking-wide text-[#45464d] bg-white focus:outline-none"
                value={priceFilter}
                onChange={(e) => setPriceFilter(e.target.value)}
              >
                <option>Any Range</option>
                <option>₱0 - ₱50,000</option>
                <option>₱50,000 - ₱500,000</option>
                <option>₱500,000+</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div className="flex bg-[#e5eeff] border border-[#c6c6cd] rounded-lg p-1">
                <button 
                  onClick={() => setActiveTab('All')}
                  className={`px-4 sm:px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all ${
                    activeTab === 'All' 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-[#45464d] hover:text-black'
                  }`}
                >
                  All
                </button>
                <button 
                  onClick={() => setActiveTab('Motorcycle')}
                  className={`px-4 sm:px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all ${
                    activeTab === 'Motorcycle' 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-[#45464d] hover:text-black'
                  }`}
                >
                  Motorcycles
                </button>
                <button 
                  onClick={() => setActiveTab('Part')}
                  className={`px-4 sm:px-6 py-1.5 text-xs font-semibold tracking-wide rounded-md transition-all ${
                    activeTab === 'Part' 
                      ? 'bg-white text-black shadow-sm' 
                      : 'text-[#45464d] hover:text-black'
                  }`}
                >
                  Parts
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex bg-[#e5eeff] border border-[#c6c6cd] rounded-lg p-1">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'grid' 
                        ? 'bg-white text-black shadow-sm' 
                        : 'text-[#45464d] hover:text-black'
                    }`}
                    title="Grid View"
                  >
                    <span className="material-symbols-outlined text-sm">grid_view</span>
                  </button>
                  <button 
                    onClick={() => setViewMode('table')}
                    className={`p-1.5 rounded-md transition-all ${
                      viewMode === 'table' 
                        ? 'bg-white text-black shadow-sm' 
                        : 'text-[#45464d] hover:text-black'
                    }`}
                    title="Table View"
                  >
                    <span className="material-symbols-outlined text-sm">view_list</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Grid View */}
        {viewMode === 'grid' && (
          <>
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {paginatedItems.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-gray-400">search_off</span>
                  <p className="text-gray-500 mt-2">No items found matching your search.</p>
                </div>
              ) : (
                paginatedItems.map((item) => {
                  const units = item.units || []
                  const stockSummary = getStockSummary(units)
                  const isExpanded = expandedUnits[item.id]
                  const isPart = item.category === 'Part'
                  
                  return (
                    <div key={item.id} className="flex flex-col border border-[#c6c6cd] rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                      <div className="aspect-[4/3] bg-[#e5eeff] relative overflow-hidden">
                        <img alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={item.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'} />
                        {isPart && (
                          <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                            Part
                          </span>
                        )}
                      </div>
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-[#0b1c30] truncate">{item.name}</h3>
                            <div className="flex gap-1 mt-1">
                              {!isPart && (
                                <>
                                  <span className="text-[10px] text-[#45464d]">{item.brand}</span>
                                  <span className="text-[10px] text-[#45464d]">•</span>
                                </>
                              )}
                              <span className="font-mono text-[10px] text-[#45464d]">{item.sku}</span>
                            </div>
                          </div>
                          <span className="text-lg font-semibold text-black whitespace-nowrap">₱{parseFloat(item.price).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex gap-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-[#dce9ff] text-[#45464d] rounded text-[11px] font-medium">{item.category}</span>
                          {!isPart && (
                            <span className="px-2 py-0.5 bg-[#dce9ff] text-[#45464d] rounded text-[11px] font-medium">{item.type}</span>
                          )}
                          {isPart && item.quantity && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[11px] font-medium">
                              Qty: {item.quantity}
                            </span>
                          )}
                        </div>

                        {/* Individual Units Section - only for motorcycles */}
                        {!isPart && (
                          <div className="mt-2 bg-[#f8f9ff] rounded-lg border border-[#c6c6cd] overflow-hidden">
                            <div className="flex justify-between items-center p-2 bg-[#e5eeff]">
                              <span className="text-[10px] font-bold text-[#45464d] uppercase tracking-wide">
                                Individual Units ({stockSummary.total})
                              </span>
                              <button 
                                onClick={() => openAddUnitModal(item)}
                                className="flex items-center gap-1 text-black hover:bg-black/10 px-2 py-1 rounded text-[10px] font-semibold transition-colors"
                              >
                                <span className="material-symbols-outlined text-sm">add</span>
                                Add Unit
                              </button>
                            </div>
                            
                            {isExpanded && units.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-[11px]">
                                  <thead className="bg-white border-b border-[#c6c6cd]">
                                    <tr>
                                      <th className="px-2 py-1.5">Engine #</th>
                                      <th className="px-2 py-1.5">Chassis #</th>
                                      <th className="px-2 py-1.5">Color</th>
                                      <th className="px-2 py-1.5">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[#c6c6cd]/50">
                                    {units.slice(0, 3).map((unit) => (
                                      <tr key={unit.id} className="hover:bg-[#e5eeff]/50">
                                        <td className="px-2 py-1.5 font-mono text-[10px]">{unit.engineNumber}</td>
                                        <td className="px-2 py-1.5 font-mono text-[10px]">{unit.chassisNumber}</td>
                                        <td className="px-2 py-1.5">
                                          {unit.color && (
                                            <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: unit.color.toLowerCase() }}></span>
                                          )}
                                          {unit.color || '—'}
                                        </td>
                                        <td className="px-2 py-1.5">
                                          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${getUnitStatusBg(unit.status)} ${getUnitStatusColor(unit.status)}`}>
                                            {unit.status}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {units.length > 3 && (
                                  <div className="text-center py-1.5 bg-white border-t border-[#c6c6cd]">
                                    <span className="text-[10px] text-[#45464d]">+{units.length - 3} more units</span>
                                  </div>
                                )}
                              </div>
                            ) : units.length > 0 ? (
                              <div className="p-2 text-center">
                                <div className="flex gap-2 justify-center text-[10px]">
                                  <span className="text-green-600">✓ {stockSummary.available} Available</span>
                                  <span className="text-amber-600">⏳ {stockSummary.reserved} Reserved</span>
                                  <span className="text-blue-600">✓ {stockSummary.sold} Sold</span>
                                </div>
                              </div>
                            ) : (
                              <div className="p-3 text-center text-[11px] text-[#45464d]">
                                No units added yet. Click "Add Unit" to add individual units.
                              </div>
                            )}
                            
                            {units.length > 0 && (
                              <button 
                                onClick={() => toggleUnits(item)}
                                className="w-full text-center py-1.5 border-t border-[#c6c6cd] bg-white text-[10px] font-semibold text-[#45464d] hover:text-black hover:bg-[#e5eeff] transition-colors"
                              >
                                {isExpanded ? '▲ Hide Units' : '▼ View All Units'}
                              </button>
                            )}
                          </div>
                        )}

                        <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#c6c6cd]">
                          <div className="flex gap-1">
                            {!isPart ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold ${
                                stockSummary.available > 0 ? 'bg-green-100 text-green-700' : 
                                stockSummary.available === 0 && stockSummary.total > 0 ? 'bg-red-100 text-red-700' : 
                                'bg-gray-100 text-gray-700'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  stockSummary.available > 0 ? 'bg-green-600' : 
                                  stockSummary.available === 0 && stockSummary.total > 0 ? 'bg-red-600' : 
                                  'bg-gray-600'
                                }`}></span>
                                {stockSummary.available > 0 ? `${stockSummary.available} In Stock` : 
                                 stockSummary.available === 0 && stockSummary.total > 0 ? 'Out of Stock' : 
                                 'No Units'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                                {item.quantity || 0} in Stock
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleEditClick(item)} className="p-1 hover:text-black transition-colors">
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button onClick={() => handleDeleteItem(item)} className="p-1 hover:text-red-600 transition-colors">
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Pagination */}
            {filteredItems.length > itemsPerPage && (
              <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8f9ff] border-t border-[#c6c6cd]">
                <span className="text-sm text-[#45464d]">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
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

        {/* Table View */}
        {viewMode === 'table' && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[800px]">
                <thead>
                  <tr className="bg-black text-white">
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Item</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide hidden sm:table-cell">SKU</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide hidden md:table-cell">Brand/Type</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Category</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Stock</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide text-right">Price</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c6cd]">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12">
                        <span className="material-symbols-outlined text-5xl text-gray-400">search_off</span>
                        <p className="text-gray-500 mt-2">No items found matching your search.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const units = item.units || []
                      const stockSummary = getStockSummary(units)
                      const isPart = item.category === 'Part'
                      
                      return (
                        <tr key={item.id} className="hover:bg-[#f8f9ff] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                                <img src={item.imageUrl || 'https://via.placeholder.com/40x40?text=No+Img'} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="font-medium text-sm">{item.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="font-mono text-xs text-[#45464d]">{item.sku}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-sm">
                            {isPart ? '—' : (item.brand || '—')}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-[10px] font-semibold ${
                              isPart ? 'bg-blue-100 text-blue-700' : 'bg-[#dce9ff] text-[#45464d]'
                            }`}>
                              {item.category}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isPart ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                {item.quantity || 0} units
                              </span>
                            ) : (
                              <div className="flex gap-1">
                                {stockSummary.available > 0 && (
                                  <span className="px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-[10px] font-medium">
                                    {stockSummary.available} Avail
                                  </span>
                                )}
                                {stockSummary.reserved > 0 && (
                                  <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">
                                    {stockSummary.reserved} Reserved
                                  </span>
                                )}
                                {stockSummary.sold > 0 && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-medium">
                                    {stockSummary.sold} Sold
                                  </span>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-sm">₱{parseFloat(item.price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {!isPart && (
                                <button onClick={() => openAddUnitModal(item)} className="p-1 hover:text-green-600 transition-colors" title="Add Unit">
                                  <span className="material-symbols-outlined text-base">add_box</span>
                                </button>
                              )}
                              <button onClick={() => handleEditClick(item)} className="p-1 hover:text-black transition-colors">
                                <span className="material-symbols-outlined text-base">edit</span>
                              </button>
                              <button onClick={() => handleDeleteItem(item)} className="p-1 hover:text-red-600 transition-colors">
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination for Table View */}
            {filteredItems.length > itemsPerPage && (
              <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8f9ff] border-t border-[#c6c6cd]">
                <span className="text-sm text-[#45464d]">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
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

        {/* AI Insight Footer */}
        <div className="p-4 bg-blue-50 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-blue-100">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-600 animate-pulse">auto_awesome</span>
            <p className="text-xs text-blue-800 text-center sm:text-left">
              <strong>AI Insight:</strong> Sport category demand is up by 14%. Consider increasing stock for popular models.
            </p>
          </div>
          <button className="text-blue-600 text-xs font-semibold hover:underline whitespace-nowrap">
            View Predictions
          </button>
        </div>
      </div>

      {/* Add Item Modal - with Type Selection */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#131b2e]/40 backdrop-blur-sm" onClick={() => {
            setShowAddModal(false)
            setAddItemType(null)
          }}></div>
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {!addItemType ? 'Add New Item' : addItemType === 'model' ? 'Add New Model' : 'Add New Part'}
              </h3>
              <button onClick={() => {
                setShowAddModal(false)
                setAddItemType(null)
              }} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            
            {isAdding ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-black rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">
                  {addItemType === 'model' ? 'Adding model...' : 'Adding part...'}
                </p>
                <p className="mt-1 text-gray-400 text-sm">Please wait</p>
              </div>
            ) : (
              <>
                {/* Step 1: Choose Model or Part */}
                {!addItemType ? (
                  <div className="p-6 flex flex-col gap-4">
                    <p className="text-sm text-[#45464d] text-center mb-2">What would you like to add?</p>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => setAddItemType('model')}
                        className="flex flex-col items-center justify-center p-6 border-2 border-[#c6c6cd] rounded-xl hover:border-black hover:bg-[#f8f9ff] transition-all"
                      >
                        <span className="material-symbols-outlined text-4xl text-[#0b1c30]">motorcycle</span>
                        <span className="mt-2 font-semibold text-[#0b1c30]">Model</span>
                        <span className="text-[10px] text-[#45464d] text-center mt-1">Motorcycle model with individual units</span>
                      </button>
                      <button
                        onClick={() => setAddItemType('part')}
                        className="flex flex-col items-center justify-center p-6 border-2 border-[#c6c6cd] rounded-xl hover:border-black hover:bg-[#f8f9ff] transition-all"
                      >
                        <span className="material-symbols-outlined text-4xl text-[#0b1c30]">build</span>
                        <span className="mt-2 font-semibold text-[#0b1c30]">Part</span>
                        <span className="text-[10px] text-[#45464d] text-center mt-1">Parts with name, quantity, price, and image</span>
                      </button>
                    </div>
                    <button 
                      onClick={() => {
                        setShowAddModal(false)
                        setAddItemType(null)
                      }}
                      className="mt-2 px-4 py-2 text-xs font-semibold tracking-wide text-[#45464d] hover:bg-[#eff4ff] rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : addItemType === 'model' ? (
                  /* Step 2a: Add Model Form */
                  <form onSubmit={handleAddModel} className="p-6 flex flex-col gap-4 max-h-[calc(90vh-80px)] overflow-y-auto">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold tracking-wide text-[#45464d]">Model Name *</label>
                      <input 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                        placeholder="e.g. Yamaha R1" 
                        type="text"
                        value={newItem.name}
                        onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Brand *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                          placeholder="e.g. Yamaha" 
                          type="text"
                          value={newItem.brand}
                          onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Category *</label>
                        <select 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none bg-white focus:ring-2 focus:ring-black/10"
                          value={newItem.category}
                          onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                        >
                          <option value="Motorcycle">Motorcycle</option>
                          <option value="Part">Part</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Type *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                          placeholder="e.g. Sport" 
                          type="text"
                          value={newItem.type}
                          onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Base Price (₱) *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                          placeholder="0.00" 
                          type="number"
                          step="0.01"
                          value={newItem.price}
                          onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    {newItem.category === 'Motorcycle' && (
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">
                          Installment Markup Override (%)
                        </label>
                        <input
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10"
                          placeholder={`Leave blank to use the shop default (${defaultMarkupPercent}%)`}
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={newItem.installmentMarkupPercent}
                          onChange={(e) => setNewItem({...newItem, installmentMarkupPercent: e.target.value})}
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold tracking-wide text-[#45464d]">Model Image</label>
                      <div className="flex flex-col items-center gap-3">
                        {imagePreview ? (
                          <div className="relative w-full">
                            <img src={imagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-[#c6c6cd]" />
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedFile(null)
                                setImagePreview(null)
                                setNewItem({...newItem, image: ''})
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#c6c6cd] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <span className="material-symbols-outlined text-3xl text-gray-400">cloud_upload</span>
                            <span className="text-xs text-gray-500 mt-1 text-center">Click to upload image</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handleImageUpload}
                            />
                          </label>
                        )}
                        <span className="text-[10px] text-gray-400">— OR —</span>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                          placeholder="Enter image URL" 
                          type="text"
                          value={newItem.image}
                          onChange={(e) => setNewItem({...newItem, image: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#c6c6cd]">
                      <button type="button" onClick={() => setAddItemType(null)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
                        Back
                      </button>
                      <button 
                        type="submit" 
                        disabled={isAdding} 
                        className="px-4 py-2 text-xs font-semibold tracking-wide bg-black text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Model
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Step 2b: Add Part Form with additional fields */
                  <form onSubmit={handleAddPart} className="p-6 flex flex-col gap-4 max-h-[calc(90vh-80px)] overflow-y-auto">
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold tracking-wide text-[#45464d]">Part Name *</label>
                      <input 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                        placeholder="e.g. Brake Pads, Oil Filter" 
                        type="text"
                        value={newPart.name}
                        onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Quantity *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                          placeholder="0" 
                          type="number"
                          min="0"
                          step="1"
                          value={newPart.quantity}
                          onChange={(e) => setNewPart({...newPart, quantity: e.target.value})}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Price (₱) *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                          placeholder="0.00" 
                          type="number"
                          step="0.01"
                          value={newPart.price}
                          onChange={(e) => setNewPart({...newPart, price: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold tracking-wide text-[#45464d]">Description</label>
                      <textarea
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10"
                        placeholder="Part description..."
                        rows="2"
                        value={newPart.description}
                        onChange={(e) => setNewPart({...newPart, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Color</label>
                        <select
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none bg-white"
                          value={newPart.color}
                          onChange={(e) => setNewPart({...newPart, color: e.target.value})}
                        >
                          <option value="">Select color...</option>
                          {colorOptions.map(color => (
                            <option key={color} value={color}>{color}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Notes</label>
                        <input
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10"
                          placeholder="Additional notes..."
                          type="text"
                          value={newPart.notes}
                          onChange={(e) => setNewPart({...newPart, notes: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold tracking-wide text-[#45464d]">Part Image</label>
                      <div className="flex flex-col items-center gap-3">
                        {partImagePreview ? (
                          <div className="relative w-full">
                            <img src={partImagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-[#c6c6cd]" />
                            <button
                              type="button"
                              onClick={() => {
                                setPartSelectedFile(null)
                                setPartImagePreview(null)
                                setNewPart({...newPart, image: ''})
                              }}
                              className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                          </div>
                        ) : (
                          <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#c6c6cd] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                            <span className="material-symbols-outlined text-3xl text-gray-400">cloud_upload</span>
                            <span className="text-xs text-gray-500 mt-1 text-center">Click to upload image</span>
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={handlePartImageUpload}
                            />
                          </label>
                        )}
                        <span className="text-[10px] text-gray-400">— OR —</span>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                          placeholder="Enter image URL" 
                          type="text"
                          value={newPart.image}
                          onChange={(e) => setNewPart({...newPart, image: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#c6c6cd]">
                      <button type="button" onClick={() => setAddItemType(null)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
                        Back
                      </button>
                      <button 
                        type="submit" 
                        disabled={isAdding} 
                        className="px-4 py-2 text-xs font-semibold tracking-wide bg-black text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add Part
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showUnitModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#131b2e]/40 backdrop-blur-sm" onClick={() => setShowUnitModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add Individual Unit</h3>
              <button onClick={() => setShowUnitModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            
            <form onSubmit={handleAddUnit} className="p-6 flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Engine Number *</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none uppercase" 
                    placeholder="e.g. LC172FMM-042B" 
                    type="text"
                    value={newUnit.engine_number}
                    onChange={(e) => setNewUnit({...newUnit, engine_number: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Chassis Number *</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none uppercase" 
                    placeholder="e.g. NB41A-1023" 
                    type="text"
                    value={newUnit.chassis_number}
                    onChange={(e) => setNewUnit({...newUnit, chassis_number: e.target.value.toUpperCase()})}
                    required
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wide text-[#45464d]">Color</label>
                <select 
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none bg-white"
                  value={newUnit.color}
                  onChange={(e) => setNewUnit({...newUnit, color: e.target.value})}
                >
                  <option value="">Select color...</option>
                  {colorOptions.map(color => (
                    <option key={color} value={color}>{color}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold tracking-wide text-[#45464d]">Notes</label>
                <textarea 
                  className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                  placeholder="Additional notes..." 
                  rows="2"
                  value={newUnit.notes}
                  onChange={(e) => setNewUnit({...newUnit, notes: e.target.value})}
                />
              </div>

              <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#c6c6cd]">
                <button type="button" onClick={() => setShowUnitModal(false)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-xs font-semibold tracking-wide bg-black text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity active:scale-95"
                >
                  Add Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#131b2e]/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                {editItem.category === 'Part' ? 'Edit Part' : 'Edit Model'}
              </h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            
            {isEditing ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-black rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Updating product...</p>
                <p className="mt-1 text-gray-400 text-sm">Please wait</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateItem} className="p-6 flex flex-col gap-4 max-h-[calc(90vh-80px)] overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">
                    {editItem.category === 'Part' ? 'Part Name' : 'Model Name'} *
                  </label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none" 
                    type="text"
                    value={editItem.name}
                    onChange={(e) => setEditItem({...editItem, name: e.target.value})}
                    required
                  />
                </div>

                {editItem.category !== 'Part' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Brand *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none" 
                          type="text"
                          value={editItem.brand}
                          onChange={(e) => setEditItem({...editItem, brand: e.target.value})}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Category *</label>
                        <select 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none bg-white"
                          value={editItem.category}
                          onChange={(e) => setEditItem({...editItem, category: e.target.value})}
                        >
                          <option value="Motorcycle">Motorcycle</option>
                          <option value="Part">Part</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Type *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none" 
                          type="text"
                          value={editItem.type}
                          onChange={(e) => setEditItem({...editItem, type: e.target.value})}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Price (₱) *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none" 
                          type="number"
                          step="0.01"
                          value={editItem.price}
                          onChange={(e) => setEditItem({...editItem, price: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold tracking-wide text-[#45464d]">
                        Installment Markup Override (%)
                      </label>
                      <input
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none"
                        placeholder={`Leave blank to use the shop default (${defaultMarkupPercent}%)`}
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={editItem.installmentMarkupPercent}
                        onChange={(e) => setEditItem({...editItem, installmentMarkupPercent: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {editItem.category === 'Part' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Quantity *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none" 
                          type="number"
                          min="0"
                          step="1"
                          value={editItem.quantity}
                          onChange={(e) => setEditItem({...editItem, quantity: e.target.value})}
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Price (₱) *</label>
                        <input 
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none" 
                          type="number"
                          step="0.01"
                          value={editItem.price}
                          onChange={(e) => setEditItem({...editItem, price: e.target.value})}
                          required
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold tracking-wide text-[#45464d]">Description</label>
                      <textarea
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none"
                        placeholder="Part description..."
                        rows="2"
                        value={editItem.description}
                        onChange={(e) => setEditItem({...editItem, description: e.target.value})}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Color</label>
                        <select
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none bg-white"
                          value={editItem.color}
                          onChange={(e) => setEditItem({...editItem, color: e.target.value})}
                        >
                          <option value="">Select color...</option>
                          {colorOptions.map(color => (
                            <option key={color} value={color}>{color}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-semibold tracking-wide text-[#45464d]">Notes</label>
                        <input
                          className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none"
                          placeholder="Additional notes..."
                          type="text"
                          value={editItem.notes}
                          onChange={(e) => setEditItem({...editItem, notes: e.target.value})}
                        />
                      </div>
                    </div>
                  </>
                )}
                
                {/* Image upload */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Product Image</label>
                  <div className="flex flex-col items-center gap-3">
                    {(editItem.category === 'Part' ? editPartImagePreview : editImagePreview) ? (
                      <div className="relative w-full">
                        <img 
                          src={editItem.category === 'Part' ? editPartImagePreview : editImagePreview} 
                          alt="Preview" 
                          className="w-full h-40 object-cover rounded-lg border border-[#c6c6cd]" 
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (editItem.category === 'Part') {
                              setEditPartSelectedFile(null)
                              setEditPartImagePreview(null)
                              setEditItem({...editItem, image: ''})
                            } else {
                              setEditSelectedFile(null)
                              setEditImagePreview(null)
                              setEditItem({...editItem, image: ''})
                            }
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        >
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </div>
                    ) : (
                      <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#c6c6cd] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                        <span className="material-symbols-outlined text-3xl text-gray-400">cloud_upload</span>
                        <span className="text-xs text-gray-500 mt-1 text-center">Click to upload new image</span>
                        <input
                          type="file"
                          className="hidden"
                          accept="image/*"
                          onChange={editItem.category === 'Part' ? handleEditPartImageUpload : handleEditImageUpload}
                        />
                      </label>
                    )}
                    <span className="text-[10px] text-gray-400">— OR —</span>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none" 
                      placeholder="Enter new image URL (leave empty to keep current)" 
                      type="text"
                      value={editItem.image}
                      onChange={(e) => setEditItem({...editItem, image: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#c6c6cd]">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isEditing} 
                    className="px-4 py-2 text-xs font-semibold tracking-wide bg-black text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Update {editItem.category === 'Part' ? 'Part' : 'Model'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Inventory