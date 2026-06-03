import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './components/Login'
import ForgotPassword from './components/ForgotPassword'
import AdminLayout from './components/admin/AdminLayout'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    const loggedIn = localStorage.getItem('isLoggedIn')
    const role = localStorage.getItem('userRole')
    if (loggedIn === 'true') {
      setIsAuthenticated(true)
      setUserRole(role)
    }
  }, [])

  const handleLogin = (role) => {
    setIsAuthenticated(true)
    setUserRole(role)
  }

  const handleLogout = () => {
    localStorage.removeItem('userEmail')
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('userRole')
    sessionStorage.clear()
    setIsAuthenticated(false)
    setUserRole(null)
  }

  // Check if user has admin role
  const isAdmin = userRole === 'admin'

  return (
    <Routes>
      <Route path="/login" element={
        <Login onLogin={handleLogin} />
      } />
      <Route path="/forgot-password" element={
        <ForgotPassword onBackToLogin={() => window.location.href = '/login'} />
      } />
      <Route path="/admin/*" element={
        isAuthenticated && isAdmin ? (
          <AdminLayout onLogout={handleLogout} userRole={userRole} />
        ) : (
          <Navigate to="/login" replace />
        )
      } />
      <Route path="/" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App