import { useState, useEffect } from 'react'
import Swal from '../../lib/swal'
import { getSettings, updateSettings } from '../../lib/settings'

function AdminSettings() {
  const [installmentMarkupPercent, setInstallmentMarkupPercent] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const result = await getSettings()
        setInstallmentMarkupPercent(String(result.installmentMarkupPercent ?? 0))
      } catch (error) {
        console.error('Failed to load settings:', error)
        Swal.fire({ icon: 'error', title: 'Could not load settings', text: error.message })
      } finally {
        setIsLoading(false)
      }
    })()
  }, [])

  const handleSave = async (e) => {
    e.preventDefault()
    const percent = Number(installmentMarkupPercent)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      Swal.fire({ icon: 'warning', title: 'Invalid value', text: 'Enter a percentage between 0 and 100.' })
      return
    }

    setIsSaving(true)
    try {
      await updateSettings(percent)
      Swal.fire({ icon: 'success', title: 'Settings saved', timer: 1500, showConfirmButton: false })
    } catch (error) {
      console.error('Failed to save settings:', error)
      Swal.fire({ icon: 'error', title: 'Could not save settings', text: error.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-5">

      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md shadow-sm">
        <h3 className="text-base font-semibold text-[#0b1c30] mb-1">Installment Pricing</h3>
        <p className="text-sm text-[#45464d] mb-4">
          Motorcycle inventory prices are treated as the real cash price. This is the default
          markup applied on top when a sale is Installment instead of Cash — individual
          motorcycles can override it in Inventory for special cases.
        </p>

        {isLoading ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-[#45464d] mb-1 block">
                Default Installment Markup (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={installmentMarkupPercent}
                  onChange={(e) => setInstallmentMarkupPercent(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy/40"
                  required
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">%</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="self-start bg-brand-navy text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-brand-navy-deep transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default AdminSettings
