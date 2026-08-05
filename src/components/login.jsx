import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from '../lib/swal'
import {
  signInWithEmailAndPassword,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import AuthShell from './AuthShell'
import Button from './ui/Button'
import mailIcon from '../assets/mail-light.svg'
import lockIcon from '../assets/lock-keyhole-light.svg'
import eyeOpenIcon from '../assets/eye-light.svg'
import eyeClosedIcon from '../assets/eye-closed-light.svg'

const AUTH_ERROR_MESSAGES = {
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-disabled': 'This account has been deactivated. Contact an administrator.',
  'auth/too-many-requests': 'Too many failed attempts. Please wait a moment and try again.',
  'auth/invalid-email': 'Please enter a valid email address.',
}

function Login() {
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
      Swal.fire({ icon: 'error', title: 'Email Required', text: 'Please enter your email address!', confirmButtonColor: '#dc2626' })
      return
    }
    if (!isValidEmail(email)) {
      Swal.fire({ icon: 'error', title: 'Invalid Email', text: 'Please enter a valid email address!', confirmButtonColor: '#dc2626' })
      return
    }
    if (!password) {
      Swal.fire({ icon: 'error', title: 'Password Required', text: 'Please enter your password!', confirmButtonColor: '#dc2626' })
      return
    }

    setIsLoading(true)

    try {
      // "Keep me logged in" controls whether the session survives closing the
      // browser (local) or ends with it (session) — Firebase Auth's built-in
      // persistence modes, replacing the old localStorage/sessionStorage duplication.
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence)
      const credential = await signInWithEmailAndPassword(auth, email, password)
      const tokenResult = await credential.user.getIdTokenResult()
      const role = tokenResult.claims.role

      if (!role) {
        await signOut(auth)
        Swal.fire({
          icon: 'error',
          title: 'No Role Assigned',
          text: 'Your account has no role assigned yet. Please contact an administrator.',
          confirmButtonColor: '#dc2626'
        })
        return
      }

      const userName = credential.user.displayName || email.split('@')[0]

      // App.jsx's onAuthStateChanged listener picks up the new session and
      // redirects to the right dashboard once role state updates — no manual
      // navigate() here avoids a race between that state update and this toast.
      Swal.fire({
        icon: 'success',
        title: 'Login Successful!',
        text: `Welcome back, ${userName}!`,
        confirmButtonColor: '#dc2626',
        timer: 1500,
        timerProgressBar: true,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Login error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: AUTH_ERROR_MESSAGES[error.code] || 'Unable to sign in. Please try again.',
        confirmButtonColor: '#dc2626'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const togglePasswordVisibility = () => setShowPassword(!showPassword)
  const handleForgotPassword = () => navigate('/forgot-password')

  return (
    <AuthShell>
      <div className="mb-8">
        <h2 className="text-2xl font-black text-brand-navy tracking-tight">Sign In</h2>
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
              className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all placeholder:text-gray-400"
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
              className="text-xs font-semibold text-brand-red hover:underline cursor-pointer"
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
              className="w-full pl-10 pr-12 py-2 bg-white border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all placeholder:text-gray-400"
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
            className="w-4 h-4 rounded border-gray-300 text-brand-red focus:ring-brand-red/20"
            id="remember"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
          />
          <label className="text-sm text-[#595f66] cursor-pointer select-none" htmlFor="remember">
            Keep me logged in
          </label>
        </div>

        <Button type="submit" variant="primary" disabled={isLoading} className="w-full py-2.5 uppercase">
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
        </Button>
      </form>

      <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs text-[#45464d]">All Systems Operational</span>
        </div>
        <p className="text-xs text-[#76777d] text-center">© 2024 Euro Motor Sale. Precision Inventory Management.</p>
      </div>
    </AuthShell>
  )
}

export default Login
