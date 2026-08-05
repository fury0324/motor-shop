// src/components/staff/StaffHeader.jsx
import { useState, useEffect } from 'react'

function StaffHeader() {
  const [userName, setUserName] = useState('Staff')

  useEffect(() => {
    const name = localStorage.getItem('userName') || 'Staff'
    setUserName(name)
  }, [])

  return (
    <header className="bg-white flex justify-between items-center px-6 py-3 w-full sticky top-0 z-40 border-b border-[#c6c6cd]">
      <div className="flex items-center gap-4">
        <div className="w-8 h-8 rounded-full bg-[#dce9ff] flex items-center justify-center overflow-hidden">
          <span className="material-symbols-outlined text-black">person</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-[#0b1c30]">Euro Motor</h1>
          <p className="text-[10px] text-[#45464d]">Welcome back, {userName}</p>
        </div>
        <span className="bg-[#dce9ff] text-[#0b1c30] text-[10px] font-semibold px-2.5 py-0.5 rounded-full tracking-wide">
          STAFF
        </span>
      </div>
      <button className="text-black hover:bg-[#e5eeff] transition-colors p-2 rounded-full relative">
        <span className="material-symbols-outlined">notifications</span>
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
      </button>
    </header>
  )
}

export default StaffHeader