import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Swal from 'sweetalert2'
import mailIcon from '../assets/mail-light.svg'
import lockIcon from '../assets/lock-keyhole-light.svg'
import eyeOpenIcon from '../assets/eye-light.svg'
import eyeClosedIcon from '../assets/eye-closed-light.svg'
import logo from '../assets/euro-logo.png'

function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [step, setStep] = useState(1)
  const [otp, setOtp] = useState(['', '', '', '', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [countdown, setCountdown] = useState(0)

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  const getStepTitle = () => {
    switch(step) {
      case 1: return 'Forgot Password?'
      case 2: return 'Verify Code'
      case 3: return 'Create New Password'
      case 4: return 'Password Reset Success!'
      default: return ''
    }
  }

  const getStepDescription = () => {
    switch(step) {
      case 1: return 'Enter your email address and we\'ll send you a verification code.'
      case 2: return `Enter the 6-digit code sent to ${email}`
      case 3: return 'Your new password must be different from previously used passwords.'
      case 4: return 'You can now login with your new password.'
      default: return ''
    }
  }

  const handleSendOTP = async (e) => {
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Email',
        text: 'Please enter a valid email address!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }
    
    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('email', email)

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/send-otp.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setStep(2)
        setCountdown(60)
        
        Swal.fire({
          icon: 'success',
          title: 'Verification Code Sent!',
          text: 'Please check your email for the verification code.',
          confirmButtonColor: '#3B82F6',
          timer: 3000,
          timerProgressBar: true
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to Send Code',
          text: data.message || 'Email address not found. Please try again.',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to connect to server. Please try again.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e) => {
    e.preventDefault()
    const otpValue = otp.join('')
    
    if (otpValue.length !== 6) {
      Swal.fire({
        icon: 'error',
        title: 'Incomplete Code',
        text: 'Please enter the complete 6-digit verification code!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('otp', otpValue)

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/verify-otp.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setStep(3)
        Swal.fire({
          icon: 'success',
          title: 'Code Verified!',
          text: 'Please set your new password.',
          confirmButtonColor: '#3B82F6',
          timer: 1500
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Code',
          text: data.message || 'The verification code you entered is incorrect.',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to verify code. Please try again.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    
    if (newPassword.length < 6) {
      Swal.fire({
        icon: 'error',
        title: 'Weak Password',
        text: 'Password must be at least 6 characters long!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    if (newPassword !== confirmPassword) {
      Swal.fire({
        icon: 'error',
        title: 'Password Mismatch',
        text: 'New password and confirm password do not match!',
        confirmButtonColor: '#3B82F6'
      })
      return
    }

    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('email', email)
      formData.append('password', newPassword)

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/reset-password.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setStep(4)
        Swal.fire({
          icon: 'success',
          title: 'Password Reset Successfully!',
          text: 'You can now login with your new password.',
          confirmButtonColor: '#3B82F6',
          confirmButtonText: 'Go to Login'
        }).then(() => {
          navigate('/login')
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Reset Failed',
          text: data.message || 'Unable to reset password. Please try again.',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to reset password. Please try again.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (countdown > 0) return
    
    setIsLoading(true)
    
    try {
      const formData = new FormData()
      formData.append('email', email)

      const response = await fetch('http://localhost:8080/motor-shop/backend/api/send-otp.php', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (data.success) {
        setCountdown(60)
        setOtp(['', '', '', '', '', ''])
        
        Swal.fire({
          icon: 'success',
          title: 'New Code Sent!',
          text: 'Please check your email for the new verification code.',
          confirmButtonColor: '#3B82F6',
          timer: 3000
        })
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Failed to Send Code',
          text: data.message || 'Please try again.',
          confirmButtonColor: '#3B82F6'
        })
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire({
        icon: 'error',
        title: 'Connection Error',
        text: 'Unable to resend code. Please try again.',
        confirmButtonColor: '#3B82F6'
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOtpChange = (index, value) => {
    if (value && !/^\d*$/.test(value)) return
    
    const newOtp = [...otp]
    
    if (value === '') {
      newOtp[index] = ''
      setOtp(newOtp)
      if (index > 0) {
        const prevInput = document.getElementById(`otp-${index - 1}`)
        prevInput?.focus()
      }
    } else {
      newOtp[index] = value.slice(-1)
      setOtp(newOtp)
      if (index < 5) {
        const nextInput = document.getElementById(`otp-${index + 1}`)
        nextInput?.focus()
      }
    }
  }

  const handleOtpPaste = (e) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text')
    const pastedNumbers = pastedData.replace(/\D/g, '').slice(0, 6)
    
    if (pastedNumbers) {
      const newOtp = [...otp]
      for (let i = 0; i < pastedNumbers.length; i++) {
        newOtp[i] = pastedNumbers[i]
      }
      setOtp(newOtp)
      
      const nextIndex = Math.min(pastedNumbers.length, 5)
      const nextInput = document.getElementById(`otp-${nextIndex}`)
      nextInput?.focus()
    }
  }

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`)
      prevInput?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`)
      nextInput?.focus()
    }
  }

  const handleBack = () => {
    if (step === 1) {
      navigate('/login')
    } else {
      setStep(step - 1)
      if (step === 2) setOtp(['', '', '', '', '', ''])
    }
  }

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] font-['Inter'] overflow-hidden">
      <div className="fixed inset-0 z-0 bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="absolute inset-0 bg-white/50 backdrop-blur-sm"></div>
      </div>

      <main className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-[440px] flex flex-col items-center">
          <div className="w-full bg-white border border-gray-200 rounded-xl p-8 shadow-lg">
            
            <button
              onClick={handleBack}
              className="mb-4 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {step === 1 ? 'Back to Login' : 'Back'}
            </button>

            <div className="flex justify-center mb-6">
              <img 
                src={logo}
                alt="Euro Motor Logo" 
                className="w-[180px] h-auto object-contain"
              />
            </div>

            <div className="mb-8">
              <div className="relative flex justify-between items-center">
                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${step >= 1 ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                    {step > 1 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="font-semibold">1</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>Email</span>
                </div>

                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${step >= 2 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>

                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${step >= 2 ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                    {step > 2 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="font-semibold">2</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>Verify</span>
                </div>

                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${step >= 3 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>

                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${step >= 3 ? 'bg-blue-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                    {step > 3 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="font-semibold">3</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>Reset</span>
                </div>

                <div className={`flex-1 h-0.5 mx-2 transition-all duration-300 ${step >= 4 ? 'bg-blue-500' : 'bg-gray-200'}`}></div>

                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${step >= 4 ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-400'}`}>
                    {step >= 4 ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <span className="font-semibold">4</span>
                    )}
                  </div>
                  <span className={`text-xs mt-2 font-medium ${step >= 4 ? 'text-green-600' : 'text-gray-400'}`}>Done</span>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-[#0b1c30]">{getStepTitle()}</h2>
              <p className="text-sm text-[#595f66] mt-1">{getStepDescription()}</p>
            </div>

            {step === 1 && (
              <form onSubmit={handleSendOTP} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold tracking-wide text-[#45464d] block">EMAIL ADDRESS</label>
                  <div className="relative group">
                    <img src={mailIcon} alt="mail" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
                    <input 
                      className="w-full pl-10 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                      type="email"
                      placeholder="name@euromotor.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-lg font-semibold text-sm tracking-wide uppercase transition-all bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Sending Code...
                    </>
                  ) : (
                    'Send Verification Code'
                  )}
                </button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-center gap-2">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(index, e)}
                        onPaste={index === 0 ? handleOtpPaste : undefined}
                        className="w-12 h-12 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
                        autoFocus={index === 0}
                      />
                    ))}
                  </div>
                  
                  <div className="text-center">
                    {countdown > 0 ? (
                      <p className="text-sm text-gray-500">Resend code in <span className="font-semibold text-blue-500">{countdown}</span> seconds</p>
                    ) : (
                      <button type="button" onClick={handleResendOTP} className="text-sm text-blue-500 hover:underline">Resend Code</button>
                    )}
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-lg font-semibold text-sm tracking-wide uppercase transition-all bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Verifying...
                    </>
                  ) : (
                    'Verify Code'
                  )}
                </button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-[#45464d] block">NEW PASSWORD</label>
                    <div className="relative group">
                      <img src={lockIcon} alt="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
                      <input 
                        className="w-full pl-10 pr-12 py-2 bg-white border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <img src={showPassword ? eyeOpenIcon : eyeClosedIcon} alt="toggle" className="w-5 h-5 opacity-50 hover:opacity-100" />
                      </button>
                    </div>
                    {newPassword && newPassword.length < 6 && <p className="text-xs text-red-500">Password must be at least 6 characters</p>}
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold tracking-wide text-[#45464d] block">CONFIRM PASSWORD</label>
                    <div className="relative group">
                      <img src={lockIcon} alt="lock" className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 opacity-50" />
                      <input 
                        className="w-full pl-10 pr-12 py-2 bg-white border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all" 
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                        <img src={showConfirmPassword ? eyeOpenIcon : eyeClosedIcon} alt="toggle" className="w-5 h-5 opacity-50 hover:opacity-100" />
                      </button>
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-500">Passwords do not match</p>}
                  </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full py-2.5 rounded-lg font-semibold text-sm tracking-wide uppercase transition-all bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Resetting Password...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>
            )}

            {step === 4 && (
              <div className="text-center space-y-6">
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <button onClick={() => navigate('/login')} className="w-full py-2.5 rounded-lg font-semibold text-sm tracking-wide uppercase transition-all bg-blue-500 hover:bg-blue-600 text-white">
                  Go to Login
                </button>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col items-center gap-4">
              <p className="text-[11px] font-semibold text-[#595f66] uppercase tracking-tighter">System Intelligence Status</p>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-gray-100 rounded-full">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-[#45464d]">All Systems Operational</span>
              </div>
            </div>
          </div>

          <footer className="mt-6 text-center space-y-2">
            <p className="text-sm text-[#595f66]">© 2024 Euro Motor Sale. Precision Inventory Management.</p>
            <div className="flex justify-center gap-4">
              <a className="text-xs text-[#76777d] hover:text-[#0b1c30] transition-colors cursor-pointer" href="#">Privacy Policy</a>
              <a className="text-xs text-[#76777d] hover:text-[#0b1c30] transition-colors cursor-pointer" href="#">Security Compliance</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  )
}

export default ForgotPassword