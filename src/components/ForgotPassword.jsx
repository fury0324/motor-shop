import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from '../lib/swal'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../lib/firebase'
import AuthShell from './AuthShell'
import Button from './ui/Button'
import mailIcon from '../assets/mail-light.svg'

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(1) // 1 = enter email, 2 = link-sent confirmation
  const [isLoading, setIsLoading] = useState(false)

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)

  const handleSendResetLink = async (e) => {
    e.preventDefault()

    if (!email || !isValidEmail(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address!',
        confirmButtonColor: '#dc2626'
      })
      return
    }

    setIsLoading(true)
    try {
      await sendPasswordResetEmail(auth, email)
    } catch (error) {
      // Firebase intentionally doesn't distinguish "no such account" from
      // success here to avoid leaking which emails have accounts, so any
      // error at this point is treated as transient — the confirmation
      // screen is shown regardless.
      console.warn('Password reset request error:', error)
    } finally {
      setIsLoading(false)
      setStep(2)
    }
  }

  const handleBack = () => {
    if (step === 1) {
      navigate('/login')
    } else {
      setStep(1)
    }
  }

  return (
    <AuthShell>
      <button
        onClick={handleBack}
        className="mb-4 text-gray-500 hover:text-brand-red transition-colors flex items-center gap-1 text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {step === 1 ? 'Back to Login' : 'Back'}
      </button>

      {step === 1 ? (
        <>
          <div className="mb-6">
            <h2 className="text-2xl font-black text-brand-navy tracking-tight">Forgot Password?</h2>
            <p className="text-sm text-[#595f66] mt-1">Enter your email and we'll send you a link to reset your password.</p>
          </div>

          <form onSubmit={handleSendResetLink} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold tracking-wide text-[#45464d] block">EMAIL ADDRESS</label>
              <div className="relative group">
                <img src={mailIcon} alt="mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
                <input
                  className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-brand-red/10 focus:border-brand-red outline-none transition-all"
                  type="email"
                  placeholder="name@euromotor.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button type="submit" variant="primary" disabled={isLoading} className="w-full py-2.5 uppercase">
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Link...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>
        </>
      ) : (
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center">
              <svg className="w-10 h-10 text-brand-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-black text-brand-navy tracking-tight">Check Your Email</h2>
            <p className="text-sm text-[#595f66] mt-2">
              If an account exists for <span className="font-medium text-brand-navy">{email}</span>, we've sent a password reset link to it.
            </p>
          </div>
          <Button onClick={() => navigate('/login')} variant="primary" className="w-full py-2.5 uppercase">
            Back to Login
          </Button>
        </div>
      )}

      <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs text-[#45464d]">All Systems Operational</span>
        </div>
      </div>
    </AuthShell>
  )
}

export default ForgotPassword
