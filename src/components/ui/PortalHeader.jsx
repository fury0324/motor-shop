import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ROLE_LABELS } from './roleLabels'

// Shared chrome for AdminLayout/CashierLayout/StaffLayout — previously each
// portal had its own Header component with different avatar treatment
// (one even had a hardcoded external placeholder photo), different default
// name/role fallbacks, and different icon sets. This is the one header used
// by all three now; per-role differences (settings icon, live clock) are
// just props. The current page's name/subtitle is passed in as `title`/
// `subtitle` (each layout derives these from the route) so it shows once,
// here, instead of every page re-rendering its own heading.
function PortalHeader({ role = 'staff', showDateTime = false, showSettings = false, title, subtitle }) {
  const navigate = useNavigate()
  // Derived directly from role + storage rather than effect-synced state —
  // both reads are synchronous and only relevant at render time.
  const userName = localStorage.getItem('userName') || sessionStorage.getItem('userName') || ROLE_LABELS[role] || 'User'
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    if (!showDateTime) return
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [showDateTime])

  return (
    <header className="h-16 bg-white border-b border-[#c6c6cd] px-4 lg:px-6 flex items-center sticky top-0 z-30">
      <div className="flex items-center justify-between gap-4 w-full">
        <div className="min-w-0">
          {title && (
            <h1 className="text-base lg:text-lg font-bold text-[#0b1c30] leading-tight truncate">{title}</h1>
          )}
          {subtitle && (
            <p className="hidden sm:block text-xs text-[#45464d] leading-tight truncate">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-3 lg:gap-6 flex-shrink-0">
          {showDateTime && (
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-[#0b1c30]">
                {now.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="text-xs text-[#45464d] mt-0.5">
                {now.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
            </div>
          )}

          <div className="flex items-center gap-1">
            <button className="text-[#45464d] hover:text-black hover:bg-[#f1f4ff] transition-colors relative active:scale-95 p-2 rounded-full">
              <span className="material-symbols-outlined">notifications</span>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ba1a1a] rounded-full border-2 border-white"></span>
            </button>
            {showSettings && (
              <button
                onClick={() => navigate(`/${role}/settings`)}
                className="text-[#45464d] hover:text-black hover:bg-[#f1f4ff] transition-colors active:scale-95 hidden sm:flex p-2 rounded-full"
              >
                <span className="material-symbols-outlined">settings</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-3">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-[#dce9ff] flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#0b1c30] text-xl">person</span>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs lg:text-sm font-semibold text-[#0b1c30] leading-tight">{userName}</p>
              <p className="text-[11px] text-[#45464d] leading-tight">{ROLE_LABELS[role] || 'User'}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default PortalHeader
