import { useState, useEffect } from 'react'
import Swal from '../../lib/swal'
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { callApi } from '../../lib/api'
import eyeOpenIcon from '../../assets/eye-light.svg'
import eyeClosedIcon from '../../assets/eye-closed-light.svg'

const createStaffUser = (payload) => callApi('createStaffUser', payload)
const updateStaffUser = (payload) => callApi('updateStaffUser', payload)
const deleteStaffUser = (payload) => callApi('deleteStaffUser', payload)

function UserManagement() {
  const [showModal, setShowModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('All Roles')
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [currentPage, setCurrentPage] = useState(1)
  const [users, setUsers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    sendInvite: false
  })

  const [editUser, setEditUser] = useState({
    id: '',
    name: '',
    email: '',
    role: '',
    status: ''
  })

  const itemsPerPage = 10

  useEffect(() => {
    const usersQuery = query(collection(db, 'users'), orderBy('name'))
    const unsubscribe = onSnapshot(
      usersQuery,
      (snapshot) => {
        setUsers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })))
        setIsLoading(false)
      },
      (error) => {
        console.error('Error fetching users:', error)
        setIsLoading(false)
      }
    )
    return unsubscribe
  }, [])

  const getInitials = (name) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const getRoleColor = (role) => {
    switch(role?.toLowerCase()) {
      case 'admin': return 'bg-[#dae2fd] text-black'
      case 'cashier': return 'bg-[#dde3eb] text-[#5f656c]'
      default: return 'bg-[#dde3eb] text-[#5f656c]'
    }
  }

  const getStatusColor = (status) => {
    return status === 'active' ? 'text-emerald-600' : 'text-outline'
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'All Roles' || user.role === roleFilter.toLowerCase()
    const matchesStatus = statusFilter === 'All Status' || user.status === statusFilter.toLowerCase()
    return matchesSearch && matchesRole && matchesStatus
  })

  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    if (!newUser.name || !newUser.email || !newUser.password || !newUser.role) {
      Swal.fire({
        icon: 'error',
        title: 'Missing Fields',
        text: 'Please fill in all required fields!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsCreating(true)

    Swal.fire({
      title: 'Creating User...',
      text: 'Please wait while we create the account.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      await createStaffUser({
        name: newUser.name,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role.toLowerCase(),
        sendInvite: newUser.sendInvite,
      })

      // Firestore listener above picks up the new user automatically.
      setShowModal(false)
      setNewUser({ name: '', email: '', password: '', role: '', sendInvite: false })

      Swal.fire({
        icon: 'success',
        title: 'User Created!',
        text: `${newUser.name} has been added successfully.${newUser.sendInvite ? ' An invitation email has been queued.' : ''}`,
        confirmButtonColor: '#3B82F6',
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to create user.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditUser = (user) => {
    setEditUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status
    })
    setShowEditModal(true)
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    
    if (!editUser.name || !editUser.email || !editUser.role) {
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
      title: 'Updating User...',
      text: 'Please wait while we update the account.',
      allowOutsideClick: false,
      allowEscapeKey: false,
      allowEnterKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      await updateStaffUser({
        uid: editUser.id,
        name: editUser.name,
        email: editUser.email,
        role: editUser.role.toLowerCase(),
        status: editUser.status,
      })

      setShowEditModal(false)
      setEditUser({ id: '', name: '', email: '', role: '', status: '' })

      Swal.fire({
        icon: 'success',
        title: 'User Updated!',
        text: `${editUser.name} has been updated successfully.`,
        confirmButtonColor: '#3B82F6',
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update user.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsEditing(false)
    }
  }

  const handleDeleteUser = (user) => {
    Swal.fire({
      title: 'Delete User',
      text: `Are you sure you want to delete ${user.name}?`,
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
          await deleteStaffUser({ uid: user.id })

          Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `${user.name} has been deleted.`,
            confirmButtonColor: '#3B82F6',
            timer: 2000,
            timerProgressBar: true
          })
        } catch (error) {
          console.error('Error:', error)
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to delete user.',
            confirmButtonColor: '#3B82F6'
          })
        }
      }
    })
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
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowModal(true)}
          disabled={isCreating}
          className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-xs font-semibold tracking-wide hover:opacity-90 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Create User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-[#c6c6cd] shadow-sm overflow-hidden">
        <div className="p-4 border-b border-[#c6c6cd] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#f8f9ff]">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[280px]">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#76777d] text-base">search</span>
              <input 
                className="w-full pl-10 pr-4 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:ring-2 focus:ring-black/10 focus:border-black outline-none transition-all" 
                placeholder="Filter by name or email..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select 
              className="px-3 py-2 border border-[#c6c6cd] rounded-lg text-xs font-semibold tracking-wide text-[#45464d] bg-white focus:outline-none"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option>All Roles</option>
              <option>Admin</option>
              <option>Cashier</option>
              <option>Staff</option>
            </select>
            <select 
              className="px-3 py-2 border border-[#c6c6cd] rounded-lg text-xs font-semibold tracking-wide text-[#45464d] bg-white focus:outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-2">

          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-black text-white">
                <th className="px-4 py-3 text-xs font-semibold tracking-wide">Name</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide">Email</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide">Role</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide">Status</th>
                <th className="px-4 py-3 text-xs font-semibold tracking-wide text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#c6c6cd]">
              {paginatedUsers.map((user) => (
                <tr key={user.id} className="hover:bg-[#f8f9ff] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#dde3eb] flex items-center justify-center font-bold text-[#595f66] text-sm uppercase">
                        {getInitials(user.name)}
                      </div>
                      <span className="font-medium text-sm">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-[#45464d]">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${getRoleColor(user.role)}`}>
                      {user.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Staff'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1 font-medium text-sm ${getStatusColor(user.status)}`}>
                      <div className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-emerald-600' : 'bg-[#76777d]'}`}></div>
                      {user.status === 'active' ? 'Active' : 'Inactive'}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEditUser(user)} className="p-1 hover:text-black transition-colors">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                      <button onClick={() => handleDeleteUser(user)} className="p-1 hover:text-red-600 transition-colors">
                        <span className="material-symbols-outlined text-base">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#f8f9ff] border-t border-[#c6c6cd]">
          <span className="text-sm text-[#45464d]">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} users
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
      </div>

      {/* Modal: Add New User */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#131b2e]/40 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Create New User</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            
            {isCreating ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-gray-200 rounded-full"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-black rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="mt-4 text-gray-600 font-medium">Creating user account...</p>
                <p className="mt-1 text-gray-400 text-sm">Please wait</p>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Full Name</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                    placeholder="e.g. Jean Dupont" 
                    type="text"
                    value={newUser.name}
                    onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Email Address</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                    placeholder="j.dupont@euromotor.com" 
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold tracking-wide text-[#45464d]">Password</label>
                    <div className="relative">
                      <input 
                        className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all pr-10 focus:ring-2 focus:ring-black/10" 
                        placeholder="••••••••" 
                        type={showPassword ? "text" : "password"}
                        value={newUser.password}
                        onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        <img 
                          src={showPassword ? eyeOpenIcon : eyeClosedIcon} 
                          alt="toggle" 
                          className="w-5 h-5 opacity-50 hover:opacity-100"
                        />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold tracking-wide text-[#45464d]">Role</label>
                    <select 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none bg-white focus:ring-2 focus:ring-black/10"
                      value={newUser.role}
                      onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                      required
                    >
                      <option value="">Select role...</option>
                      <option>Admin</option>
                      <option>Cashier</option>
                      <option>Staff</option>
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    className="w-4 h-4 border-[#c6c6cd] rounded text-black focus:ring-black/20" 
                    id="sendInvite" 
                    type="checkbox"
                    checked={newUser.sendInvite}
                    onChange={(e) => setNewUser({...newUser, sendInvite: e.target.checked})}
                  />
                  <label className="text-sm text-[#45464d]" htmlFor="sendInvite">Send an invitation email to this user</label>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#c6c6cd]">
                  <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isCreating} 
                    className="px-4 py-2 text-xs font-semibold tracking-wide bg-black text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Create User
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Edit User */}
      {showEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#131b2e]/40 backdrop-blur-sm" onClick={() => setShowEditModal(false)}></div>
          <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 scale-100 opacity-100">
            <div className="bg-black text-white p-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Edit User</h3>
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
                <p className="mt-4 text-gray-600 font-medium">Updating user...</p>
                <p className="mt-1 text-gray-400 text-sm">Please wait</p>
              </div>
            ) : (
              <form onSubmit={handleUpdateUser} className="p-6 flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Full Name</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                    placeholder="e.g. Jean Dupont" 
                    type="text"
                    value={editUser.name}
                    onChange={(e) => setEditUser({...editUser, name: e.target.value})}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d]">Email Address</label>
                  <input 
                    className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none transition-all focus:ring-2 focus:ring-black/10" 
                    placeholder="j.dupont@euromotor.com" 
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser({...editUser, email: e.target.value})}
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold tracking-wide text-[#45464d]">Role</label>
                    <select 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none bg-white focus:ring-2 focus:ring-black/10"
                      value={editUser.role}
                      onChange={(e) => setEditUser({...editUser, role: e.target.value})}
                      required
                    >
                      <option value="">Select role...</option>
                      <option>admin</option>
                      <option>cashier</option>
                      <option>staff</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-semibold tracking-wide text-[#45464d]">Status</label>
                    <select 
                      className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-base focus:border-black outline-none bg-white focus:ring-2 focus:ring-black/10"
                      value={editUser.status}
                      onChange={(e) => setEditUser({...editUser, status: e.target.value})}
                      required
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#c6c6cd]">
                  <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 text-xs font-semibold tracking-wide text-[#0b1c30] hover:bg-[#eff4ff] rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    disabled={isEditing} 
                    className="px-4 py-2 text-xs font-semibold tracking-wide bg-black text-white rounded-lg shadow-sm hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    Update User
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

export default UserManagement