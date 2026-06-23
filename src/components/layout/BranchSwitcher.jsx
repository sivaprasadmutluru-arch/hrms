import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import {
  BuildingOffice2Icon, ChevronDownIcon, CheckIcon, Squares2X2Icon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import {
  fetchMyCompany, fetchBranches,
  selectAll as selectCompanies, selectBranches,
} from '../../features/companies/companiesSlice'
import { setEnterpriseBranchFilter } from '../../features/auth/authSlice'
import useAuth from '../../hooks/useAuth'

function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function BranchSwitcher() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companies = useSelector(selectCompanies)
  const allBranches = useSelector(selectBranches)
  const enterpriseBranchFilter = useSelector(s => s.auth.enterpriseBranchFilter)

  useEffect(() => {
    if (user?.companyId) {
      dispatch(fetchMyCompany(user.companyId)).then(() => {
        dispatch(fetchBranches(user.companyId))
      })
    }
  }, [dispatch, user?.companyId])

  const headOffice = companies[0] || null
  const branches = user?.companyId ? (allBranches[user.companyId] || []) : []

  const branchOptions = [
    ...(headOffice ? [{ id: headOffice.id, name: headOffice.name, type: 'HEAD_OFFICE' }] : []),
    ...branches.map(b => ({ id: b.id, name: b.name, type: 'BRANCH' })),
  ]
  if (branchOptions.length === 0) return null

  const selected = branchOptions.find(o => String(o.id) === String(enterpriseBranchFilter))
  const displayName = selected?.name || 'All Branches'

  const handleSelect = (id, close) => {
    const chosen = branchOptions.find(o => String(o.id) === String(id))
    dispatch(setEnterpriseBranchFilter(id))
    close()
    toast.success(id ? `Switched to ${chosen?.name || 'branch'}` : 'Showing all branches')
    window.location.reload()
  }

  const handleAll = (close) => {
    dispatch(setEnterpriseBranchFilter(null))
    close()
    toast.success('Showing all branches')
    window.location.reload()
  }

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <MenuButton className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1">
            <BuildingOffice2Icon className="h-4 w-4 text-gray-500" />
            <span className="max-w-[8.5rem] truncate">{displayName}</span>
            <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </MenuButton>

          <MenuItems
            anchor="bottom end"
            className="w-64 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 focus:outline-none [--anchor-gap:6px]"
          >
            <div className="max-h-80 overflow-y-auto py-1">
              <MenuItem>
                {({ active, close }) => (
                  <button
                    onClick={() => handleAll(close)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${active ? 'bg-indigo-50' : ''} ${!enterpriseBranchFilter ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                      <Squares2X2Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-left">All Branches</span>
                    {!enterpriseBranchFilter && <CheckIcon className="h-4 w-4 text-indigo-600" />}
                  </button>
                )}
              </MenuItem>

              {branchOptions.map(o => {
                const isSel = String(enterpriseBranchFilter) === String(o.id)
                const isHO = o.type === 'HEAD_OFFICE'
                return (
                  <MenuItem key={o.id}>
                    {({ active, close }) => (
                      <button
                        onClick={() => handleSelect(o.id, close)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${active ? 'bg-indigo-50' : ''} ${isSel ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}
                      >
                        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-500 font-semibold text-xs flex-shrink-0">{initials(o.name)}</span>
                        <span className="flex-1 min-w-0 text-left">
                          <span className="block truncate">{o.name}</span>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ring-1 ring-inset ${isHO ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-violet-50 text-violet-700 ring-violet-200'}`}>
                            {isHO ? 'Head Office' : 'Branch'}
                          </span>
                        </span>
                        {isSel && <CheckIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />}
                      </button>
                    )}
                  </MenuItem>
                )
              })}
            </div>
          </MenuItems>
        </>
      )}
    </Menu>
  )
}
