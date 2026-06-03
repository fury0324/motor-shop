import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import mailIcon from '../assets/mail-light.svg'
import lockIcon from '../assets/lock-keyhole-light.svg'
import eyeOpenIcon from '../assets/eye-light.svg'       
import eyeClosedIcon from '../assets/eye-closed-light.svg'
import logo from '../assets/euro-logo.png'

function Login({ onLogin }) {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!email) {
      Swal.fire({
        icon: 'error',
        title: 'Email Required',
        text: 'Please enter your email address!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    if (!isValidEmail(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    if (!password) {
      Swal.fire({
        icon: 'error',
        title: 'Password Required',
        text: 'Please enter your password!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', password)

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/login.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        if (rememberMe) {
          localStorage.setItem('userEmail', email)
          localStorage.setItem('isLoggedIn', 'true')
          localStorage.setItem('userRole', data.user.role)
        }
        
        sessionStorage.setItem('userEmail', email)
        sessionStorage.setItem('userRole', data.user.role)
        
        Swal.fire({
          icon: 'success',
          title: 'Login Successful!',
          text: `Welcome back, ${data.user.name || email}!`,
          confirmButtonColor: '#3B82F6',
          timer: 2000,
          timerProgressBar: true,
          showConfirmButton: false
        }).then(() => {
          if (onLogin) {
            onLogin(data.user.role)
          }
          navigate('/admin')
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Login Failed',
          text: data.message || 'Invalid email or password!',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Login error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to connect to server. Please check if backend is running.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword)
  }

  const handleForgotPassword = () => {
    navigate('/forgot-password')
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-['Inter'] overflow-hidden">
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm"></div>
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          <div className="w-full bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
            <div className="flex justify-center mb-6">
              <img 
                src={logo}
                alt="Euro Motor Logo" 
                className="w-[180px] h-auto object-contain"
              />
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#0b1c30]">Sign In</h2>
              <p className="text-sm text-[#595f66] mt-1">Access the management portal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold tracking-wide text-[#45464d] block" htmlFor="email">
                  EMAIL ADDRESS
                </label>
                <div className="relative group">
                  <img 
                    src={mailIcon} 
                    alt="mail" 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 group-focus-within:opacity-100 transition-opacity"
                  />
                  <input 
                    className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400" 
                    id="email" 
                    name="email" 
                    placeholder="name@euromotor.com" 
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d] block" htmlFor="password">
                    PASSWORD
                  </label>
                  <a 
                    onClick={handleForgotPassword}
                    className="text-xs font-semibold text-blue-500 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </a>
                </div>
                <div className="relative group">
                  <img 
                    src={lockIcon} 
                    alt="lock" 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50 group-focus-within:opacity-100 transition-opacity"
                  />
                  <input 
                    className="w-full pl-10 pr-12 py-2 bg-white border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-gray-400" 
                    id="password" 
                    name="password" 
                    placeholder="••••••••" 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none hover:opacity-70 transition-opacity"
                  >
                    <img 
                      src={showPassword ? eyeOpenIcon : eyeClosedIcon} 
                      alt={showPassword ? "Hide" : "Show"} 
                      className="w-5 h-5 opacity-50 hover:opacity-100 transition-opacity"
                    />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500/20" 
                  id="remember" 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="text-sm text-[#595f66] cursor-pointer select-none" htmlFor="remember">
                  Keep me logged in
                </label>
              </div>

              <button 
                className={`w-full py-2.5 rounded-lg font-semibold text-sm tracking-wide uppercase transition-all flex items-center justify-center gap-2 ${
                  isLoading ? 'bg-blue-400' : 'bg-blue-500 hover:bg-blue-600'
                } text-white active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed`}
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Authenticating...
                  </>
                ) : (
                  <>
                    Secure Login
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </>
                )}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col items-center gap-4">
              <p className="text-[11px] font-semibold text-[#595f66] uppercase tracking-tighter">System Intelligence Status</p>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-[#45464d]">All Systems Operational</span>
              </div>
            </div>
          </div>

          <footer className="mt-6 text-center space-y-2">
            <p className="text-sm text-[#595f66]">
              © 2024 Euro Motor Sale. Precision Inventory Management.
            </p>
            <div className="flex justify-center gap-4">
              <a className="text-xs text-[#76777d] hover:text-[#0b1c30] transition-colors cursor-pointer" href="#">
                Privacy Policy
              </a>
              <a className="text-xs text-[#76777d] hover:text-[#0b1c30] transition-colors cursor-pointer" href="#">
                Security Compliance
              </a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default Login