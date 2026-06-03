import { useState, useEffect } from 'react'

function Header() {
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')

  useEffect(() => {
    const name = localStorage.getItem('userName') || sessionStorage.getItem('userName') || 'Alex Fischer'
    const role = localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || 'Fleet Manager'
    
    setUserName(name)
    setUserRole(role)
  }, [])

  return (
    <header className="h-16 w-full bg-[#f8f9ff] border-b border-[#c6c6cd] flex justify-between items-center px-4 lg:px-6 sticky top-0 z-30">
      {/* Logo or Brand Name - optional, pwede mong palitan */}
      <div className="flex-1">
        {/* Empty div to maintain spacing, pwedeng lagyan ng logo dito */}
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 lg:gap-4">
        <div className="flex gap-2 lg:gap-3">
          <button className="text-[#45464d] hover:text-black transition-colors relative active:scale-95">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-0 right-0 w-2 h-2 bg-[#ba1a1a] rounded-full border-2 border-[#f8f9ff]"></span>
          </button>
          <button className="text-[#45464d] hover:text-black transition-colors active:scale-95 hidden sm:block">
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-2">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold tracking-wide text-[#0b1c30]">{userName}</p>
            <p className="text-[11px] font-medium text-[#45464d] hidden lg:block">
              {userRole === 'admin' ? 'Administrator' : userRole === 'staff' ? 'Staff Member' : userRole === 'cashier' ? 'Cashier' : 'Fleet Manager'}
            </p>
          </div>
          <img
            alt="User Profile"
            className="w-8 h-8 lg:w-10 lg:h-10 rounded-full border border-[#c6c6cd] object-cover"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfhQFOlaKRm_6bx82Q62ofZkq1tn-yklvv6lB20Nr2vWS9BJrRdAzAko1tclyZJWpZrb751WEiiqlzy-K4HNwNCIk4-FjNwL2b4NyS3RadDzNxWgc2xMAML_lr2P9WlvNJybt3OmZAoZA2TXCUttfKQf90psm5cygifClGn6R6f4mTDVxMIL83Leb1y5DH0hUHmlfNopdxEbociCCDZQ8YSPvNSBdAHvBWFceH_rWwUG6_0CcpFgo2fnPssDQiLZElaRUtsbLf8J4"
          />
        </div>
      </div>
    </header>
  )
}

export default Header