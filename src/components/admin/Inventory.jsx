import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

function Inventory() {
  const [viewMode, setViewMode] = useState('grid')
  const [activeTab, setActiveTab] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [priceFilter, setPriceFilter] = useState('Any Range')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [showEditUnitModal, setShowEditUnitModal] = useState(false)
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
  const [productUnits, setProductUnits] = useState([])
  const [expandedUnits, setExpandedUnits] = useState({})
  
  const itemsPerPage = 12
  const [typeOptions, setTypeOptions] = useState(['Sport', 'Scooter', 'Off-road', 'Street', 'Touring', 'Cruiser'])

  // WALA NG DESCRIPTION
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'Motorcycle',
    type: '',
    brand: '',
    price: '',
    image: ''
  })

  // WALA NG DESCRIPTION
  const [editItem, setEditItem] = useState({
    id: '',
    name: '',
    sku: '',
    category: '',
    type: '',
    brand: '',
    price: '',
    image: ''
  })

  const [newUnit, setNewUnit] = useState({
    engine_number: '',
    chassis_number: '',
    color: '',
    notes: ''
  })

  const [editUnit, setEditUnit] = useState({
    id: '',
    engine_number: '',
    chassis_number: '',
    color: '',
    unit_status: '',
    notes: ''
  })

  const colorOptions = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 
    'Purple', 'Pink', 'Gray', 'Silver', 'Gold', 'Matte Black', 
    'Matte Gray', 'Carbon Fiber', 'Racing Blue', 'Rosso Corsa'
  ]

  const unitStatusOptions = ['Available', 'Reserved', 'Sold', 'In Transit']

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:8080/motor-shop/backend/api/get-inventory.php')
      const data = await response.json()
      if (data.success) {
        setItems(data.items)
        const uniqueTypes = [...new Set(data.items.map(item => item.type).filter(type => type))]
        if (uniqueTypes.length > 0) {
          setTypeOptions(uniqueTypes)
        }
      }
    } catch (error) {
      console.error('Error fetching items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchProductUnits = async (inventoryId) => {
    try {
      const response = await fetch(`http://localhost:8080/motor-shop/backend/api/get-inventory-units.php?inventory_id=${inventoryId}`)
      const data = await response.json()
      if (data.success) {
        setProductUnits(data.units)
      }
    } catch (error) {
      console.error('Error fetching units:', error)
    }
  }

  const generateSKU = () => {
    const prefix = 'EM'
    const random = Math.floor(Math.random() * 9000) + 1000
    return `${prefix}-${random}`
  }

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

  // UPDATED - WALA NG DESCRIPTION
  const handleAddItem = async (e) => {
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
      title: 'Adding Product...',
      text: 'Please wait while we add the product.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      const sku = generateSKU()
      const formData = new FormData()
      formData.append('sku', sku)
      formData.append('name', newItem.name)
      formData.append('category', newItem.category)
      formData.append('type', newItem.type)
      formData.append('brand', newItem.brand)
      formData.append('price', newItem.price)
      // WALA NG DESCRIPTION
      
      if (selectedFile) {
        formData.append('image', selectedFile)
      } else if (newItem.image) {
        formData.append('image_url', newItem.image)
      }

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/add-inventory.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        await fetchItems()
        setShowAddModal(false)
        setNewItem({ name: '', sku: '', category: 'Motorcycle', type: '', brand: '', price: '', image: '' })
        setSelectedFile(null)
        setImagePreview(null)
        
        Swal.fire({
          icon: 'success',
          title: 'Product Added!',
          text: `${newItem.name} has been added successfully.`,
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Failed to add product.',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to connect to server.',
        confirmButtonColor: '#3B82F6'
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
      const formData = new FormData()
      formData.append('inventory_id', selectedProduct.id)
      formData.append('engine_number', newUnit.engine_number.toUpperCase())
      formData.append('chassis_number', newUnit.chassis_number.toUpperCase())
      formData.append('color', newUnit.color)
      formData.append('notes', newUnit.notes)

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/add-inventory-unit.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        await fetchItems()
        setShowUnitModal(false)
        setNewUnit({ engine_number: '', chassis_number: '', color: '', notes: '' })
        setExpandedUnits({})
        
        Swal.fire({
          icon: 'success',
          title: 'Unit Added!',
          text: `Unit with engine ${newUnit.engine_number} has been added.`,
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Failed to add unit.',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to connect to server.',
        confirmButtonColor: '#3B82F6'
      })
    }
  }

  // UPDATED - WALA NG DESCRIPTION
  const handleEditClick = (item) => {
    setEditItem({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      type: item.type,
      brand: item.brand || '',
      price: item.price,
      image: item.image || ''
    })
    setEditImagePreview(item.image || null)
    setEditSelectedFile(null)
    setShowEditModal(true)
  }

  // UPDATED - WALA NG DESCRIPTION
  const handleUpdateItem = async (e) => {
    e.preventDefault()
    
    if (!editItem.name || !editItem.category || !editItem.type || !editItem.brand || !editItem.price) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please fill in all required fields!',
        confirmButtonColor: '#3B82F6'
      })
      return
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
      const formData = new FormData()
      formData.append('id', editItem.id)
      formData.append('name', editItem.name)
      formData.append('category', editItem.category)
      formData.append('type', editItem.type)
      formData.append('brand', editItem.brand)
      formData.append('price', editItem.price)
      // WALA NG DESCRIPTION
      
      if (editSelectedFile) {
        formData.append('image', editSelectedFile)
      } else if (editItem.image && editItem.image.trim() !== '') {
        formData.append('image_url', editItem.image)
      }

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/update-inventory.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        await fetchItems()
        setShowEditModal(false)
        setEditItem({ id: '', name: '', sku: '', category: '', type: '', brand: '', price: '', image: '' })
        setEditImagePreview(null)
        setEditSelectedFile(null)
        
        Swal.fire({
          icon: 'success',
          title: 'Product Updated!',
          text: `${editItem.name} has been updated successfully.`,
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Failed to update product.',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to connect to server.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteItem = (item) => {
    Swal.fire({
      title: 'Delete Product',
      text: `Are you sure you want to delete ${item.name}? This will also delete all individual units.`,
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
          const formData = new FormData()
          formData.append('id', item.id)

          const response = await fetch('http://localhost:8080/motor-shop/backend/api/delete-inventory.php', {
            method: 'POST',
            body: formData
          })

          const data = await response.json()

          if (data.success) {
            await fetchItems()
            Swal.fire({
              icon: 'success',
              title: 'Deleted!',
              text: `${item.name} has been deleted.`,
              confirmButtonColor: '#3B82F6',
              timer: 2000,
              timerProgressBar: true
            })
          } else {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: data.message || 'Failed to delete product.',
              confirmButtonColor: '#3B82F6'
            })
          }
        } catch (error) {
          console.error('Error:', error)
          Swal.fire({
            icon: 'error',
            title: 'Connection Error',
            text: 'Unable to connect to server.',
            confirmButtonColor: '#3B82F6'
          })
        }
      }
    })
  }

  const toggleUnits = async (item) => {
    if (expandedUnits[item.id]) {
      setExpandedUnits(prev => ({ ...prev, [item.id]: false }))
    } else {
      setSelectedProduct(item)
      await fetchProductUnits(item.id)
      setExpandedUnits(prev => ({ ...prev, [item.id]: true }))
    }
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
    const available = units.filter(u => u.unit_status === 'Available').length
    const reserved = units.filter(u => u.unit_status === 'Reserved').length
    const sold = units.filter(u => u.unit_status === 'Sold').length
    return { available, reserved, sold, total: units.length }
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
          <p className="text-sm sm:text-base text-[#45464d] mt-1">Manage motorcycle models and individual units with engine/chassis numbers.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white px-3 py-2 sm:px-4 rounded-lg text-xs font-semibold tracking-wide hover:opacity-90 transition-all shadow-sm active:scale-95 w-full sm:w-auto justify-center"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add New Model
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
        {/* Filters Section */}
        <div className="p-4 border-b border-[#c6c6cd] bg-[#f8f9ff]">
          {/* Mobile Filter Toggle */}
          <div className="lg:hidden flex items-center justify-between mb-3">
            <button
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="flex items-center gap-2 text-sm font-semibold text-[#0b1c30]"
            >
              <span className="material-symbols-outlined text-base">filter_list</span>
              Filters {mobileFiltersOpen ? '▲' : '▼'}
            </button>
            <div className="text-sm text-[#45464d]">
              {filteredItems.length} of {items.length} models
            </div>
          </div>

          {/* Filters Content */}
          <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block space-y-4`}>
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
                <input 
                  className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all" 
                  placeholder="Search by model, SKU, brand..." 
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

        {/* Grid View with Units */}
        {viewMode === 'grid' && (
          <>
            <div className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {paginatedItems.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <span className="material-symbols-outlined text-5xl text-gray-400">search_off</span>
                  <p className="text-gray-500 mt-2">No models found matching your search.</p>
                </div>
              ) : (
                paginatedItems.map((item) => {
                  const units = item.units || []
                  const stockSummary = getStockSummary(units)
                  const isExpanded = expandedUnits[item.id]
                  
                  return (
                    <div key={item.id} className="flex flex-col border border-[#c6c6cd] rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                      <div className="aspect-[4/3] bg-[#e5eeff] relative overflow-hidden">
                        <img alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={item.image || 'https://via.placeholder.com/400x300?text=No+Image'} />
                      </div>
                      <div className="p-4 flex flex-col gap-3 flex-1">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex flex-col flex-1 min-w-0">
                            <h3 className="text-base font-semibold text-[#0b1c30] truncate">{item.name}</h3>
                            <div className="flex gap-1 mt-1">
                              <span className="text-[10px] text-[#45464d]">{item.brand}</span>
                              <span className="text-[10px] text-[#45464d]">•</span>
                              <span className="font-mono text-[10px] text-[#45464d]">{item.sku}</span>
                            </div>
                          </div>
                          <span className="text-lg font-semibold text-black whitespace-nowrap">₱{parseFloat(item.price).toLocaleString()}</span>
                        </div>
                        
                        <div className="flex gap-1 flex-wrap">
                          <span className="px-2 py-0.5 bg-[#dce9ff] text-[#45464d] rounded text-[11px] font-medium">{item.category}</span>
                          <span className="px-2 py-0.5 bg-[#dce9ff] text-[#45464d] rounded text-[11px] font-medium">{item.type}</span>
                        </div>

                        {/* Individual Units Section */}
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
                                      <td className="px-2 py-1.5 font-mono text-[10px]">{unit.engine_number}</td>
                                      <td className="px-2 py-1.5 font-mono text-[10px]">{unit.chassis_number}</td>
                                      <td className="px-2 py-1.5">
                                        {unit.color && (
                                          <span className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: unit.color.toLowerCase() }}></span>
                                        )}
                                        {unit.color || '—'}
                                      </td>
                                      <td className="px-2 py-1.5">
                                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-semibold ${getUnitStatusBg(unit.unit_status)} ${getUnitStatusColor(unit.unit_status)}`}>
                                          {unit.unit_status}
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

                        <div className="mt-auto flex items-center justify-between pt-2 border-t border-[#c6c6cd]">
                          <div className="flex gap-1">
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
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} models
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
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Model</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide hidden sm:table-cell">SKU</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide hidden md:table-cell">Brand</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Type</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide">Units</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide text-right">Price</th>
                    <th className="px-4 py-3 text-xs font-semibold tracking-wide text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#c6c6cd]">
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12">
                        <span className="material-symbols-outlined text-5xl text-gray-400">search_off</span>
                        <p className="text-gray-500 mt-2">No models found matching your search.</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const units = item.units || []
                      const stockSummary = getStockSummary(units)
                      
                      return (
                        <tr key={item.id} className="hover:bg-[#f8f9ff] transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-[#e5eeff] overflow-hidden flex-shrink-0">
                                <img src={item.image || 'https://via.placeholder.com/40x40?text=No+Img'} alt={item.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="font-medium text-sm">{item.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <span className="font-mono text-xs text-[#45464d]">{item.sku}</span>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-sm">{item.brand || '—'}</td>
                          <td className="px-4 py-3 text-sm">{item.type}</td>
                          <td className="px-4 py-3">
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
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-sm">₱{parseFloat(item.price).toLocaleString()}</td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => openAddUnitModal(item)} className="p-1 hover:text-green-600 transition-colors" title="Add Unit">
                                <span className="material-symbols-outlined text-base">add_box</span>
                              </button>
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
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} models
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

      {/* Add Product Modal - WALA NG DESCRIPTION */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#131b2e]/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Add New Model</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            
            {isAdding ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-black rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Adding model...</p>
                <p className="mt-1 text-gray-400 text-sm">Please wait</p>
              </div>
            ) : (
              <form onSubmit={handleAddItem} className="p-6 flex flex-col gap-4 max-h-[calc(90vh-80px)] overflow-y-auto">
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
                {/* WALA NG DESCRIPTION FIELD */}
                
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
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
                    Cancel
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

      {/* Edit Product Modal - WALA NG DESCRIPTION */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#131b2e]/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit Model</h3>
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
                <p className="mt-4 text-gray-600 font-medium">Updating model...</p>
                <p className="mt-1 text-gray-400 text-sm">Please wait</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateItem} className="p-6 flex flex-col gap-4 max-h-[calc(90vh-80px)] overflow-y-auto">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Model Name *</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none" 
                    type="text"
                    value={editItem.name}
                    onChange={(e) => setEditItem({...editItem, name: e.target.value})}
                    required
                  />
                </div>
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
                    <label className="text-xs font-semibold tracking-wide text-[#45464d]">Base Price (₱) *</label>
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
                {/* WALA NG DESCRIPTION FIELD */}
                
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Model Image</label>
                  <div className="flex flex-col items-center gap-3">
                    {editImagePreview ? (
                      <div className="relative w-full">
                        <img src={editImagePreview} alt="Preview" className="w-full h-40 object-cover rounded-lg border border-[#c6c6cd]" />
                        <button
                          type="button"
                          onClick={() => {
                            setEditSelectedFile(null)
                            setEditImagePreview(null)
                            setEditItem({...editItem, image: ''})
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
                          onChange={handleEditImageUpload}
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
                    Update Model
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