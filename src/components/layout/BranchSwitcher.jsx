import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BuildingOffice2Icon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { fetchMyCompany, fetchBranches, selectAll as selectCompanies, selectBranches } from '../../features/companies/companiesSlice'
import { setEnterpriseBranchFilter } from '../../features/auth/authSlice'
import useAuth from '../../hooks/useAuth'

export default function BranchSwitcher() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companies = useSelector(selectCompanies)
  const allBranches = useSelector(selectBranches)
  const enterpriseBranchFilter = useSelector(s => s.auth.enterpriseBranchFilter)
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    if (user?.companyId) {
      dispatch(fetchMyCompany(user.companyId)).then(() => {
        dispatch(fetchBranches(user.companyId))
      })
    }
  }, [dispatch, user?.companyId])

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const headOffice = companies[0] || null
  const branches = user?.companyId ? (allBranches[user.companyId] || []) : []

  const branchOptions = [
    ...(headOffice ? [{ id: headOffice.id, name: headOffice.name, label: `${headOffice.name} [Head Office]` }] : []),
    ...branches.map(b => ({ id: b.id, name: b.name, label: `${b.name} [Branch]` })),
  ]

  if (branchOptions.length === 0) return null

  const selected = branchOptions.find(o => String(o.id) === String(enterpriseBranchFilter))
  const displayName = selected?.name || 'All Branches'

  const handleSelect = (id) => {
    dispatch(setEnterpriseBranchFilter(id))
    setOpen(false)
    window.location.reload()
  }

  const handleAll = () => {
    dispatch(setEnterpriseBranchFilter(null))
    setOpen(false)
    window.location.reload()
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
      >
        <BuildingOffice2Icon className="h-4 w-4 text-gray-500" />
        <span className="max-w-32 truncate">{displayName}</span>
        <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="max-h-60 overflow-y-auto py-1">
            <button
              onClick={handleAll}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${!enterpriseBranchFilter ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}
            >
              All Branches
            </button>
            {branchOptions.map(o => (
              <button
                key={o.id}
                onClick={() => handleSelect(o.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${String(enterpriseBranchFilter) === String(o.id) ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
