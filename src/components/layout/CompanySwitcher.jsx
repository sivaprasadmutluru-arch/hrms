import { useEffect, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BuildingOffice2Icon, ChevronDownIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { fetchAllCompaniesForScope, selectPlatformCompanies } from '../../features/platform/platformSlice'
import { setSelectedCompany } from '../../features/auth/authSlice'

export default function CompanySwitcher() {
  const dispatch = useDispatch()
  const companies = useSelector(selectPlatformCompanies)
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef()

  useEffect(() => {
    dispatch(fetchAllCompaniesForScope())
  }, [dispatch])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedCompany = companies.find(c => String(c.id) === String(selectedCompanyId))
  const filtered = companies.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))

  const handleSelect = (companyId) => {
    dispatch(setSelectedCompany(companyId))
    setOpen(false)
    setSearch('')
    // Reload to refresh data with new company context
    window.location.reload()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <BuildingOffice2Icon className="h-4 w-4 text-gray-500" />
        <span className="max-w-32 truncate">{selectedCompany?.name || 'All Companies'}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-gray-50 rounded-lg">
              <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="text-sm bg-transparent outline-none flex-1 text-gray-700"
              />
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!selectedCompanyId ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}
            >
              All Companies
            </button>
            {filtered.map(c => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${String(selectedCompanyId) === String(c.id) ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}
              >
                {c.name}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">No companies found</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
