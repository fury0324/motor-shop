import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'

function Inventory() {
  const [viewMode, setViewMode] = useState('grid')
  const [activeTab, setActiveTab] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('Type: All Types')
  const [priceFilter, setPriceFilter] = useState('Price: Any Range')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [isAdding, setIsAdding] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [items, setItems] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [editSelectedFile, setEditSelectedFile] = useState(null)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  
  // Dynamic type options from existing items
  const [typeOptions, setTypeOptions] = useState(['Street', 'Off-road', 'Sport', 'Engine', 'Tires', 'Accessories'])

  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'Motorcycle',
    type: '',
    color: '',
    price: '',
    stock: '',
    image: ''
  })

  const [editItem, setEditItem] = useState({
    id: '',
    name: '',
    sku: '',
    category: '',
    type: '',
    color: '',
    price: '',
    stock: '',
    image: ''
  })

  const colorOptions = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 
    'Purple', 'Pink', 'Gray', 'Silver', 'Gold', 'Matte Black', 
    'Matte Gray', 'Carbon Fiber', 'Racing Blue', 'Rosso Corsa'
  ]

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
        // Extract unique types from items for filter options
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

  const generateSKU = () => {
    const prefix = newItem.category === 'Motorcycle' ? 'EM' : 'EM-PAR'
    const random = Math.floor(Math.random() * 900) + 100
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

  const getColorBadgeStyle = (color) => {
    const colorMap = {
      'Black': 'bg-gray-900 text-white',
      'White': 'bg-white text-gray-900 border border-gray-300',
      'Red': 'bg-red-600 text-white',
      'Blue': 'bg-blue-600 text-white',
      'Green': 'bg-green-600 text-white',
      'Yellow': 'bg-yellow-500 text-black',
      'Orange': 'bg-orange-500 text-white',
      'Purple': 'bg-purple-600 text-white',
      'Pink': 'bg-pink-500 text-white',
      'Gray': 'bg-gray-500 text-white',
      'Silver': 'bg-gray-300 text-gray-800',
      'Gold': 'bg-yellow-700 text-white',
      'Matte Black': 'bg-gray-800 text-white',
      'Matte Gray': 'bg-gray-600 text-white',
      'Carbon Fiber': 'bg-gray-700 text-white',
      'Racing Blue': 'bg-blue-700 text-white',
      'Rosso Corsa': 'bg-red-700 text-white'
    }
    return colorMap[color] || 'bg-gray-500 text-white'
  }

  const handleAddItem = async (e) => {
    e.preventDefault()
    
    if (!newItem.name || !newItem.category || !newItem.type || !newItem.color || !newItem.price || !newItem.stock) {
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
      title: 'Adding Item...',
      text: 'Please wait while we add the item.',
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
      formData.append('color', newItem.color)
      formData.append('price', newItem.price)
      formData.append('stock', newItem.stock)
      
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
        setNewItem({ name: '', sku: '', category: 'Motorcycle', type: '', color: '', price: '', stock: '', image: '' })
        setSelectedFile(null)
        setImagePreview(null)
        
        Swal.fire({
          icon: 'success',
          title: 'Item Added!',
          text: `${newItem.name} has been added successfully.`,
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Failed to add item.',
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

  const handleEditClick = (item) => {
    setEditItem({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      type: item.type,
      color: item.color || 'Black',
      price: item.price,
      stock: item.stock,
      image: item.image || ''
    })
    setEditImagePreview(item.image)
    setEditSelectedFile(null)
    setShowEditModal(true)
  }

  const handleUpdateItem = async (e) => {
    e.preventDefault()
    
    if (!editItem.name || !editItem.category || !editItem.type || !editItem.color || !editItem.price || !editItem.stock) {
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
      title: 'Updating Item...',
      text: 'Please wait while we update the item.',
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
      formData.append('color', editItem.color)
      formData.append('price', editItem.price)
      formData.append('stock', editItem.stock)
      
      if (editSelectedFile) {
        formData.append('image', editSelectedFile)
      } else if (editItem.image) {
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
        setEditItem({ id: '', name: '', sku: '', category: '', type: '', color: '', price: '', stock: '', image: '' })
        setEditImagePreview(null)
        setEditSelectedFile(null)
        
        Swal.fire({
          icon: 'success',
          title: 'Item Updated!',
          text: `${editItem.name} has been updated successfully.`,
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: data.message || 'Failed to update item.',
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
      title: 'Delete Item',
      text: `Are you sure you want to delete ${item.name}?`,
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
              text: data.message || 'Failed to delete item.',
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

  // Pure frontend search
  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
                          item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTab = activeTab === 'All' || item.category === activeTab
    const matchesType = typeFilter === 'Type: All Types' || item.type === typeFilter.replace('Type: ', '')
    
    let matchesPrice = true
    if (priceFilter !== 'Price: Any Range') {
      const price = parseFloat(item.price)
      if (priceFilter === 'Price: ₱0 - ₱50,000') {
        matchesPrice = price >= 0 && price <= 50000
      } else if (priceFilter === 'Price: ₱50,000 - ₱500,000') {
        matchesPrice = price >= 50000 && price <= 500000
      } else if (priceFilter === 'Price: ₱500,000+') {
        matchesPrice = price >= 500000
      }
    }
    
    return matchesSearch && matchesTab && matchesType && matchesPrice
  })

  const getStatusStyles = (status, statusColor) => {
    const styles = {
      green: 'bg-green-100 text-green-700',
      amber: 'bg-amber-100 text-amber-700',
      red: 'bg-red-100 text-red-700'
    }
    return styles[statusColor] || styles.green
  }

  if (isLoading) {
    return (
      <div className="p-5 flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-5">
      {/* Header Section - Responsive */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#0b1c30]">Inventory Management</h2>
          <p className="text-sm sm:text-base text-[#45464d] mt-1">Manage motorcycles and parts precision stock levels.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-black text-white px-3 py-2 sm:px-4 rounded-lg text-xs font-semibold tracking-wide hover:opacity-90 transition-all shadow-sm active:scale-95 w-full sm:w-auto justify-center"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Add New Item
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
        {/* Filters Section - Responsive with mobile toggle */}
        <div className="p-3 sm:p-4 border-b border-[#c6c6cd] bg-[#f8f9ff]">
          {/* Mobile Filter Toggle Button */}
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

          {/* Filters Content - Responsive */}
          <div className={`${mobileFiltersOpen ? 'block' : 'hidden'} lg:block`}>
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Type Filter */}
                <select 
                  className="bg-white border-[#c6c6cd] rounded-lg text-xs font-semibold tracking-wide py-2 px-3 w-full sm:w-auto"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option>Type: All Types</option>
                  {typeOptions.map(type => (
                    <option key={type} value={`Type: ${type}`}>Type: {type}</option>
                  ))}
                </select>
                
                {/* Price Filter */}
                <select 
                  className="bg-white border-[#c6c6cd] rounded-lg text-xs font-semibold tracking-wide py-2 px-3 w-full sm:w-auto"
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                >
                  <option>Price: Any Range</option>
                  <option>Price: ₱0 - ₱50,000</option>
                  <option>Price: ₱50,000 - ₱500,000</option>
                  <option>Price: ₱500,000+</option>
                </select>
                
                {/* Tab Buttons - Responsive */}
                <div className="flex bg-[#e5eeff] border border-[#c6c6cd] rounded-lg p-1 w-full sm:w-auto">
                  <button 
                    onClick={() => setActiveTab('All')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-1 text-xs font-semibold tracking-wide rounded-md transition-all ${
                      activeTab === 'All' 
                        ? 'bg-white text-black shadow-sm' 
                        : 'text-[#45464d] hover:text-black'
                    }`}
                  >
                    All
                  </button>
                  <button 
                    onClick={() => setActiveTab('Motorcycle')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-1 text-xs font-semibold tracking-wide rounded-md transition-all ${
                      activeTab === 'Motorcycle' 
                        ? 'bg-white text-black shadow-sm' 
                        : 'text-[#45464d] hover:text-black'
                    }`}
                  >
                    Motorcycles
                  </button>
                  <button 
                    onClick={() => setActiveTab('Part')}
                    className={`flex-1 sm:flex-none px-4 sm:px-6 py-1 text-xs font-semibold tracking-wide rounded-md transition-all ${
                      activeTab === 'Part' 
                        ? 'bg-white text-black shadow-sm' 
                        : 'text-[#45464d] hover:text-black'
                    }`}
                  >
                    Parts
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                {/* Search Field - Responsive */}
                <div className="relative w-full sm:w-64">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-sm">
                    search
                  </span>
                  <input
                    className="w-full bg-white border border-[#c6c6cd] rounded-lg pl-9 pr-8 py-2 text-sm focus:ring-2 focus:ring-black/10 focus:outline-none transition-all"
                    placeholder="Search by name or SKU..."
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#76777d] hover:text-black"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
                
                {/* Desktop Item Count & View Controls */}
                <div className="hidden lg:flex items-center gap-2 pr-3 border-r border-[#c6c6cd]">
                  <span className="text-sm text-[#45464d]">{filteredItems.length} of {items.length} items</span>
                  <div className="flex border border-[#c6c6cd] rounded-lg overflow-hidden">
                    <button className="p-1.5 hover:bg-[#e5eeff] transition-colors disabled:opacity-30" disabled>
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    <button className="p-1.5 border-l border-[#c6c6cd] hover:bg-[#e5eeff] transition-colors">
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                </div>
                
                {/* View Mode Buttons */}
                <div className="flex bg-[#e5eeff] border border-[#c6c6cd] rounded-lg p-1 w-full sm:w-auto justify-center">
                  <button 
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded-md transition-all ${
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
                    className={`p-1 rounded-md transition-all ${
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

        {/* Grid View - Responsive */}
        {viewMode === 'grid' && (
          <div className="p-3 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredItems.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <span className="material-symbols-outlined text-5xl text-gray-400">search_off</span>
                <p className="text-gray-500 mt-2">No items found matching your search.</p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="flex flex-col border border-[#c6c6cd] rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                  <div className="aspect-[4/3] bg-[#e5eeff] relative overflow-hidden">
                    <img alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" src={item.image} />
                  </div>
                  <div className="p-3 sm:p-4 flex flex-col gap-2 sm:gap-3 flex-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-col flex-1">
                        <h3 className="text-base sm:text-lg font-semibold text-[#0b1c30] truncate">{item.name}</h3>
                        <span className="font-mono text-[10px] text-[#45464d]">{item.sku}</span>
                      </div>
                      <span className="text-base sm:text-lg font-semibold text-black whitespace-nowrap">₱{parseFloat(item.price).toLocaleString()}</span>
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      <span className="px-2 py-0.5 bg-[#dce9ff] text-[#45464d] rounded text-[11px] font-medium">{item.category}</span>
                      <span className="px-2 py-0.5 bg-[#dce9ff] text-[#45464d] rounded text-[11px] font-medium">{item.type}</span>
                      {item.category === 'Motorcycle' && item.color && (
                        <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${getColorBadgeStyle(item.color)}`}>
                          {item.color}
                        </span>
                      )}
                    </div>
                    <div className="mt-auto flex items-center justify-between pt-2 sm:pt-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${getStatusStyles(item.status, item.statusColor)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${item.statusColor === 'green' ? 'bg-green-600' : item.statusColor === 'amber' ? 'bg-amber-600' : 'bg-red-600'}`}></span>
                        {item.status} ({item.stock})
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditClick(item)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors text-xs font-semibold">
                          <span className="material-symbols-outlined text-sm">edit</span>
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button onClick={() => handleDeleteItem(item)} className="flex items-center gap-1 text-red-600 hover:text-red-800 transition-colors text-xs font-semibold">
                          <span className="material-symbols-outlined text-sm">delete</span>
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Table View - Responsive with horizontal scroll */}
        {viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="bg-black text-white text-xs font-semibold tracking-wide uppercase">
                  <th className="px-3 sm:px-4 py-3">SKU</th>
                  <th className="px-3 sm:px-4 py-3">Name</th>
                  <th className="px-3 sm:px-4 py-3 hidden sm:table-cell">Category</th>
                  <th className="px-3 sm:px-4 py-3 hidden md:table-cell">Type</th>
                  <th className="px-3 sm:px-4 py-3 hidden lg:table-cell">Color</th>
                  <th className="px-3 sm:px-4 py-3">Stock</th>
                  <th className="px-3 sm:px-4 py-3 text-right">Price</th>
                  <th className="px-3 sm:px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-12">
                      <span className="material-symbols-outlined text-4xl text-gray-400">search_off</span>
                      <p className="text-gray-500 mt-2">No items found matching your search.</p>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => (
                    <tr key={item.id} className={`hover:bg-[#f8f9ff] transition-colors ${idx % 2 === 1 ? 'bg-[#f1f5f9]' : ''}`}>
                      <td className="px-3 sm:px-4 py-3 font-mono text-xs text-[#45464d]">{item.sku}</td>
                      <td className="px-3 sm:px-4 py-3 font-medium text-sm">{item.name}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm hidden sm:table-cell">{item.category}</td>
                      <td className="px-3 sm:px-4 py-3 text-sm hidden md:table-cell">{item.type}</td>
                      <td className="px-3 sm:px-4 py-3 hidden lg:table-cell">
                        {item.category === 'Motorcycle' && item.color ? (
                          <span className={`px-2 py-1 rounded-full text-[11px] font-medium ${getColorBadgeStyle(item.color)}`}>
                            {item.color}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">N/A</span>
                        )}
                      </td>
                      <td className="px-3 sm:px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${getStatusStyles(item.status, item.statusColor)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.statusColor === 'green' ? 'bg-green-600' : item.statusColor === 'amber' ? 'bg-amber-600' : 'bg-red-600'}`}></span>
                          {item.stock}
                        </span>
                      </td>
                      <td className="px-3 sm:px-4 py-3 text-right font-medium text-sm">₱{parseFloat(item.price).toLocaleString()}</td>
                      <td className="px-3 sm:px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 sm:gap-2">
                          <button onClick={() => handleEditClick(item)} className="p-1 hover:bg-blue-50 rounded-lg text-blue-600">
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button onClick={() => handleDeleteItem(item)} className="p-1 hover:bg-red-50 rounded-lg text-red-600">
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* AI Insight Footer - Responsive */}
        <div className="p-3 bg-blue-50 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-blue-100">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-blue-600 animate-pulse">auto_awesome</span>
            <p className="text-xs text-blue-800 text-center sm:text-left">
              <strong>AI Insight:</strong> Street category demand is up by 14%. Consider increasing stock for <strong>Sport</strong> types.
            </p>
          </div>
          <button className="text-blue-600 text-xs font-semibold hover:underline whitespace-nowrap">
            View Predictions
          </button>
        </div>
      </div>

      {/* Modals - already responsive */}
      {showAddModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="bg-black text-white p-4 flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-semibold">Add New Item</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            
            {isAdding ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-black rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="mt-4 text-gray-600 text-sm">Adding item...</p>
              </div>
            ) : (
              <form onSubmit={handleAddItem} className="p-5 flex flex-col gap-3">
                {/* Form fields - responsive na */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Item Name *</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                    placeholder="e.g. Yamaha R1" 
                    type="text"
                    value={newItem.name}
                    onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#45464d]">Category *</label>
                    <select 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none bg-white"
                      value={newItem.category}
                      onChange={(e) => setNewItem({...newItem, category: e.target.value})}
                    >
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Part">Part</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#45464d]">Type *</label>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                      placeholder="e.g. Sport" 
                      type="text"
                      value={newItem.type}
                      onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Color *</label>
                  <select 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none bg-white"
                    value={newItem.color}
                    onChange={(e) => setNewItem({...newItem, color: e.target.value})}
                    required
                  >
                    <option value="">Select color...</option>
                    {colorOptions.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#45464d]">Price (₱) *</label>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                      placeholder="0.00" 
                      type="number"
                      step="0.01"
                      value={newItem.price}
                      onChange={(e) => setNewItem({...newItem, price: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#45464d]">Stock *</label>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                      placeholder="0" 
                      type="number"
                      value={newItem.stock}
                      onChange={(e) => setNewItem({...newItem, stock: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Item Image</label>
                  <div className="flex flex-col items-center gap-3">
                    {imagePreview ? (
                      <div className="relative w-full">
                        <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-[#c6c6cd]" />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null)
                            setImagePreview(null)
                            setNewItem({...newItem, image: ''})
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
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
                    <span className="text-[10px] text-gray-400">or</span>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                      placeholder="Enter image URL" 
                      type="text"
                      value={newItem.image}
                      onChange={(e) => setNewItem({...newItem, image: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#c6c6cd]">
                  <button type="button" onClick={() => setShowAddModal(false)} className="px-3 py-1.5 text-xs font-semibold text-[#0b1c30] hover:bg-gray-100 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" disabled={isAdding} className="px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:opacity-90">
                    Add Item
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Edit Modal - similarly responsive */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="bg-black text-white p-4 flex justify-between items-center sticky top-0">
              <h3 className="text-lg font-semibold">Edit Item</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            
            {isEditing ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-12 h-12 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-12 h-12 border-4 border-black rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="mt-4 text-gray-600 text-sm">Updating item...</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateItem} className="p-5 flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Item Name *</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                    placeholder="e.g. Yamaha R1" 
                    type="text"
                    value={editItem.name}
                    onChange={(e) => setEditItem({...editItem, name: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#45464d]">Category *</label>
                    <select 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none bg-white"
                      value={editItem.category}
                      onChange={(e) => setEditItem({...editItem, category: e.target.value})}
                    >
                      <option value="Motorcycle">Motorcycle</option>
                      <option value="Part">Part</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#45464d]">Type *</label>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                      placeholder="e.g. Sport" 
                      type="text"
                      value={editItem.type}
                      onChange={(e) => setEditItem({...editItem, type: e.target.value})}
                      required
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Color *</label>
                  <select 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none bg-white"
                    value={editItem.color}
                    onChange={(e) => setEditItem({...editItem, color: e.target.value})}
                    required
                  >
                    {colorOptions.map(color => (
                      <option key={color} value={color}>{color}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#45464d]">Price (₱) *</label>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                      placeholder="0.00" 
                      type="number"
                      step="0.01"
                      value={editItem.price}
                      onChange={(e) => setEditItem({...editItem, price: e.target.value})}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-[#45464d]">Stock *</label>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                      placeholder="0" 
                      type="number"
                      value={editItem.stock}
                      onChange={(e) => setEditItem({...editItem, stock: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-[#45464d]">Item Image</label>
                  <div className="flex flex-col items-center gap-3">
                    {editImagePreview ? (
                      <div className="relative w-full">
                        <img src={editImagePreview} alt="Preview" className="w-full h-32 object-cover rounded-lg border border-[#c6c6cd]" />
                        <button
                          type="button"
                          onClick={() => {
                            setEditSelectedFile(null)
                            setEditImagePreview(null)
                            setEditItem({...editItem, image: ''})
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
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
                          onChange={handleEditImageUpload}
                        />
                      </label>
                    )}
                    <span className="text-[10px] text-gray-400">or</span>
                    <input 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                      placeholder="Enter image URL" 
                      type="text"
                      value={editItem.image}
                      onChange={(e) => setEditItem({...editItem, image: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-[#c6c6cd]">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-3 py-1.5 text-xs font-semibold text-[#0b1c30] hover:bg-gray-100 rounded-lg">
                    Cancel
                  </button>
                  <button type="submit" disabled={isEditing} className="px-3 py-1.5 text-xs font-semibold bg-black text-white rounded-lg hover:opacity-90">
                    Update Item
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