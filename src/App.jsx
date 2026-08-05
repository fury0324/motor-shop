import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from './lib/firebase'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword'
import AdminLayout from './components/admin/AdminLayout'
import CashierLayout from './components/cashier/CashierLayout'
import StaffLayout from './components/staff/StaffLayout'

const homeFor = (role) => {
  if (role === 'admin') return '/admin/dashboard'
  if (role === 'cashier') return '/cashier/dashboard'
  if (role === 'staff') return '/staff/dashboard'
  return '/login'
}

function App() {
  const [user, setUser] = useState(null)
  const [role, setRole] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Auth state (and the role custom claim) is the single source of truth —
    // no localStorage flags to spoof, no unauthenticated PHP session.
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult()
        setUser(firebaseUser)
        setRole(tokenResult.claims.role ?? null)
      } else {
        setUser(null)
        setRole(null)
      }
      setIsLoading(false)
    })
    return unsubscribe
  }, [])

  const handleLogout = async () => {
    await signOut(auth)
  }

  const isAdmin = role === 'admin'
  const isCashier = role === 'cashier'
  const isStaff = role === 'staff'
  const isAuthenticated = Boolean(user && role)

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={
        isAuthenticated ? <Navigate to={homeFor(role)} replace /> : <Login />
      } />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route path="/admin/*" element={
        isAuthenticated && isAdmin ? (
          <AdminLayout onLogout={handleLogout} userRole={role} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      <Route path="/cashier/*" element={
        isAuthenticated && isCashier ? (
          <CashierLayout onLogout={handleLogout} userRole={role} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      <Route path="/staff/*" element={
        isAuthenticated && isStaff ? (
          <StaffLayout onLogout={handleLogout} userRole={role} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />

      <Route path="/" element={
        isAuthenticated ? <Navigate to={homeFor(role)} replace /> : <Navigate to="/login" replace />
      } />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
