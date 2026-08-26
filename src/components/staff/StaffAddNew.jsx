// src/components/staff/StaffAddNew.jsx
import { useState } from 'react'
import Swal from '../../lib/swal'
import { newInventoryId, uploadInventoryImage, createInventoryItem } from '../../lib/inventory'
import {
  X,
  Upload,
  Bike,        // ✅ Instead of Motorcycle
  Wrench
} from 'lucide-react'

function StaffAddNew() {
  const [addItemType, setAddItemType] = useState(null) // 'model' or 'part'
  const [isAdding, setIsAdding] = useState(false)
  
  // For Models (full form)
  const [newItem, setNewItem] = useState({
    name: '',
    sku: '',
    category: 'Motorcycle',
    type: '',
    brand: '',
    price: '',
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

  const [imagePreview, setImagePreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [partImagePreview, setPartImagePreview] = useState(null)
  const [partSelectedFile, setPartSelectedFile] = useState(null)

  const colorOptions = [
    'Black', 'White', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 
    'Purple', 'Pink', 'Gray', 'Silver', 'Gold', 'Matte Black', 
    'Matte Gray', 'Carbon Fiber', 'Racing Blue', 'Rosso Corsa'
  ]

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
      const imageUrl = selectedFile
        ? await uploadInventoryImage(itemId, selectedFile)
        : newItem.image || ''

      await createInventoryItem({
        itemId,
        isPart: newItem.category === 'Part',
        sku: generateSKU(),
        name: newItem.name,
        brand: newItem.brand,
        category: newItem.category,
        type: newItem.type,
        price: newItem.price,
        imageUrl,
      })

      setAddItemType(null)
      setNewItem({ name: '', sku: '', category: 'Motorcycle', type: '', brand: '', price: '', image: '' })
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
      const imageUrl = partSelectedFile
        ? await uploadInventoryImage(itemId, partSelectedFile)
        : newPart.image || ''

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {!addItemType ? (
        // Step 1: Choose Model or Part
        <div className="bg-white border border-[#c6c6cd] rounded-xl p-6 shadow-sm">
          <p className="text-sm text-[#45464d] text-center mb-4">What would you like to add?</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setAddItemType('model')}
              className="flex flex-col items-center justify-center p-8 border-2 border-[#c6c6cd] rounded-xl hover:border-black hover:bg-[#f8f9ff] transition-all"
            >
              <Bike className="w-12 h-12 text-[#0b1c30]" />
              <span className="mt-3 font-semibold text-[#0b1c30]">Model</span>
              <span className="text-xs text-[#45464d] text-center mt-1">Motorcycle model with individual units</span>
            </button>
            <button
              onClick={() => setAddItemType('part')}
              className="flex flex-col items-center justify-center p-8 border-2 border-[#c6c6cd] rounded-xl hover:border-black hover:bg-[#f8f9ff] transition-all"
            >
              <Wrench className="w-12 h-12 text-[#0b1c30]" />
              <span className="mt-3 font-semibold text-[#0b1c30]">Part</span>
              <span className="text-xs text-[#45464d] text-center mt-1">Parts with name, quantity, price, and image</span>
            </button>
          </div>
        </div>
      ) : addItemType === 'model' ? (
        // Add Model Form
        <form onSubmit={handleAddModel} className="bg-white border border-[#c6c6cd] rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#0b1c30] flex items-center gap-2">
              <Bike className="w-5 h-5" />
              Add New Model
            </h3>
            <button 
              type="button" 
              onClick={() => setAddItemType(null)}
              className="p-1 hover:text-black transition-colors"
            >
              <X className="w-5 h-5 text-[#45464d]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Model Name *</label>
              <input 
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none transition-all" 
                placeholder="e.g. Yamaha R1" 
                type="text"
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Brand *</label>
              <input 
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                placeholder="e.g. Yamaha" 
                type="text"
                value={newItem.brand}
                onChange={(e) => setNewItem({...newItem, brand: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Category *</label>
              <select 
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none bg-white"
                value={newItem.category}
                onChange={(e) => setNewItem({...newItem, category: e.target.value})}
              >
                <option value="Motorcycle">Motorcycle</option>
                <option value="Part">Part</option>
              </select>
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Type *</label>
              <input 
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                placeholder="e.g. Sport" 
                type="text"
                value={newItem.type}
                onChange={(e) => setNewItem({...newItem, type: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Base Price (₱) *</label>
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
          </div>
          
          <div className="mt-4">
            <label className="text-xs font-semibold text-[#45464d] block mb-1">Model Image</label>
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
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#c6c6cd] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400" />
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
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                placeholder="Enter image URL" 
                type="text"
                value={newItem.image}
                onChange={(e) => setNewItem({...newItem, image: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#c6c6cd]">
            <button type="button" onClick={() => setAddItemType(null)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
              Back
            </button>
            <button 
              type="submit" 
              disabled={isAdding} 
              className="px-6 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add Model'}
            </button>
          </div>
        </form>
      ) : (
        // Add Part Form
        <form onSubmit={handleAddPart} className="bg-white border border-[#c6c6cd] rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-[#0b1c30] flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Add New Part
            </h3>
            <button 
              type="button" 
              onClick={() => setAddItemType(null)}
              className="p-1 hover:text-black transition-colors"
            >
              <X className="w-5 h-5 text-[#45464d]" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Part Name *</label>
              <input 
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                placeholder="e.g. Brake Pads, Oil Filter" 
                type="text"
                value={newPart.name}
                onChange={(e) => setNewPart({...newPart, name: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Quantity *</label>
              <input 
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                placeholder="0" 
                type="number"
                min="0"
                step="1"
                value={newPart.quantity}
                onChange={(e) => setNewPart({...newPart, quantity: e.target.value})}
                required
              />
            </div>
            
            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Price (₱) *</label>
              <input 
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                placeholder="0.00" 
                type="number"
                step="0.01"
                value={newPart.price}
                onChange={(e) => setNewPart({...newPart, price: e.target.value})}
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Description</label>
              <textarea
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none"
                placeholder="Part description..."
                rows="2"
                value={newPart.description}
                onChange={(e) => setNewPart({...newPart, description: e.target.value})}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Color</label>
              <select
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none bg-white"
                value={newPart.color}
                onChange={(e) => setNewPart({...newPart, color: e.target.value})}
              >
                <option value="">Select color...</option>
                {colorOptions.map(color => (
                  <option key={color} value={color}>{color}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Notes</label>
              <input
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none"
                placeholder="Additional notes..."
                type="text"
                value={newPart.notes}
                onChange={(e) => setNewPart({...newPart, notes: e.target.value})}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-semibold text-[#45464d] block mb-1">Part Image</label>
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
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="w-full flex flex-col items-center justify-center p-4 border-2 border-dashed border-[#c6c6cd] rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <Upload className="w-8 h-8 text-gray-400" />
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
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black outline-none" 
                placeholder="Enter image URL" 
                type="text"
                value={newPart.image}
                onChange={(e) => setNewPart({...newPart, image: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[#c6c6cd]">
            <button type="button" onClick={() => setAddItemType(null)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
              Back
            </button>
            <button 
              type="submit" 
              disabled={isAdding} 
              className="px-6 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {isAdding ? 'Adding...' : 'Add Part'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

export default StaffAddNew