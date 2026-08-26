// src/components/staff/StaffSettings.jsx
import { useState } from 'react'
import Swal from '../../lib/swal'

function StaffSettings() {
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    language: 'English'
  })

  const handleToggle = (setting) => {
    setSettings(prev => ({
      ...prev,
      [setting]: !prev[setting]
    }))
  }

  const handleSave = () => {
    Swal.fire({
      icon: 'success',
      title: 'Settings Saved!',
      text: 'Your preferences have been updated.',
      confirmButtonColor: '#3B82F6',
      timer: 2000
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white border border-[#c6c6cd] rounded-xl p-6 shadow-sm space-y-6">
        {/* Profile Section */}
        <div>
          <h3 className="text-sm font-semibold text-[#0b1c30] mb-4">Profile</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Full Name</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                placeholder="Enter your name"
                defaultValue="Staff User"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none"
                placeholder="staff@euromotor.com"
                defaultValue="staff@euromotor.com"
              />
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="pt-4 border-t border-[#c6c6cd]">
          <h3 className="text-sm font-semibold text-[#0b1c30] mb-4">Preferences</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0b1c30]">Email Notifications</p>
                <p className="text-xs text-[#45464d]">Receive updates about inventory and stock</p>
              </div>
              <button
                onClick={() => handleToggle('notifications')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.notifications ? 'bg-black' : 'bg-[#c6c6cd]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                  settings.notifications ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#0b1c30]">Dark Mode</p>
                <p className="text-xs text-[#45464d]">Switch between light and dark theme</p>
              </div>
              <button
                onClick={() => handleToggle('darkMode')}
                className={`w-12 h-6 rounded-full transition-colors ${
                  settings.darkMode ? 'bg-black' : 'bg-[#c6c6cd]'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white transform transition-transform ${
                  settings.darkMode ? 'translate-x-6' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            <div>
              <label className="text-xs font-semibold text-[#45464d] block mb-1">Language</label>
              <select
                value={settings.language}
                onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
                className="w-full px-3 py-2 border border-[#c6c6cd] rounded-lg text-sm focus:border-black focus:ring-2 focus:ring-black/10 outline-none bg-white"
              >
                <option value="English">English</option>
                <option value="Tagalog">Tagalog</option>
                <option value="Cebuano">Cebuano</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="pt-4 border-t border-[#c6c6cd] flex justify-end gap-3">
          <button
            onClick={() => {
              setSettings({
                notifications: true,
                darkMode: false,
                language: 'English'
              })
              Swal.fire({
                icon: 'info',
                title: 'Reset',
                text: 'Settings have been reset to default.',
                confirmButtonColor: '#3B82F6',
                timer: 1500
              })
            }}
            className="px-4 py-2 border border-[#c6c6cd] rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-black text-white rounded-lg text-sm font-semibold hover:bg-gray-800 transition"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}

export default StaffSettings