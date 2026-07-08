import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react'
import {
  BuildingOffice2Icon, ChevronDownIcon, MagnifyingGlassIcon,
  CheckIcon, Squares2X2Icon,
} from '@heroicons/react/24/outline'
import toast from 'react-hot-toast'
import {
  fetchAllCompaniesForScope, validateCompanyScope,
  selectPlatformCompanies, selectScopeValidating,
} from '../../features/platform/platformSlice'
import { setSelectedCompany } from '../../features/auth/authSlice'

// Company-type → badge styling
const TYPE_META = {
  HEAD_OFFICE: { label: 'Head Office', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-200' },
  BRANCH:      { label: 'Branch',      chip: 'bg-violet-50 text-violet-700 ring-violet-200' },
  UNKNOWN:     { label: 'Company',     chip: 'bg-gray-100 text-gray-600 ring-gray-200' },
}

// First letter of a name, used as a fallback avatar glyph
function initials(name = '') {
  return name.trim().charAt(0).toUpperCase() || '?'
}

export default function CompanySwitcher() {
  const dispatch = useDispatch()
  const companies = useSelector(selectPlatformCompanies)
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const scopeValidating = useSelector(selectScopeValidating)
  const [search, setSearch] = useState('')
  const [selectedLogoLoadError, setSelectedLogoLoadError] = useState(false)

  useEffect(() => {
    dispatch(fetchAllCompaniesForScope())
  }, [dispatch])

  const selectedCompany = companies.find(c => String(c.id) === String(selectedCompanyId))
  useEffect(() => { setSelectedLogoLoadError(false) }, [selectedCompany?.logoUrl])

  // Group + filter the list for the dropdown panel
  const { headOffices, branches } = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = (c) => !q || (c.name?.toLowerCase().includes(q))
    const filtered = companies.filter(matches)
    return {
      headOffices: filtered.filter(c => c.type !== 'BRANCH'),
      branches:    filtered.filter(c => c.type === 'BRANCH'),
    }
  }, [companies, search])

  const hasAny = headOffices.length > 0 || branches.length > 0

  const handleSelect = async (companyId, close) => {
    if (companyId) {
      try {
        const result = await dispatch(validateCompanyScope(companyId)).unwrap()
        if (!result.valid) {
          toast.error(`Access denied for ${result.companyName || 'this company'}`)
          close()
          return
        }
      } catch {
        toast.error('Could not validate company access. Try again.')
        close()
        return
      }
    }
    dispatch(setSelectedCompany(companyId))
    close()
    setSearch('')
    toast.success(companyId
      ? `Switched to ${companies.find(c => String(c.id) === String(companyId))?.name || 'company'}`
      : 'Showing all companies')
    // Full reload guarantees every module re-fetches with the new company context
    window.location.reload()
  }

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          <MenuButton
            disabled={scopeValidating}
            className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
          >
            {scopeValidating
              ? <svg className="h-4 w-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              : (selectedCompany?.logoUrl && !selectedLogoLoadError
                  ? <img src={selectedCompany.logoUrl} alt="" className="h-4 w-4 rounded object-cover" onError={() => setSelectedLogoLoadError(true)} />
                  : <BuildingOffice2Icon className="h-4 w-4 text-gray-500" />)
            }
            <span className="max-w-[8.5rem] truncate">
              {selectedCompany?.name || 'All Companies'}
            </span>
            <ChevronDownIcon className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          </MenuButton>

          <MenuItems
            anchor="bottom end"
            className="w-72 origin-top-right rounded-xl border border-gray-200 bg-white shadow-lg ring-1 ring-black/5 focus:outline-none [--anchor-gap:6px]"
          >
            {/* Search box (non-closeable on type) */}
            <div className="p-2 border-b border-gray-100">
              <div className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-50 rounded-lg">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search companies..."
                  className="text-sm bg-transparent outline-none flex-1 text-gray-700 placeholder:text-gray-400"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="text-gray-300 hover:text-gray-500 text-xs"
                    aria-label="Clear search"
                  >✕</button>
                )}
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto py-1">
              {/* All Companies */}
              <MenuItem>
                {({ active, close }) => (
                  <button
                    onClick={() => handleSelect(null, close)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${active ? 'bg-indigo-50' : ''} ${!selectedCompanyId ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-indigo-500 to-violet-500 text-white">
                      <Squares2X2Icon className="h-4 w-4" />
                    </span>
                    <span className="flex-1 text-left">All Companies</span>
                    {!selectedCompanyId && <CheckIcon className="h-4 w-4 text-indigo-600" />}
                  </button>
                )}
              </MenuItem>

              {!hasAny && (
                <p className="px-3 py-6 text-center text-sm text-gray-400">
                  {companies.length === 0 ? 'No companies available' : 'No companies match your search'}
                </p>
              )}

              {/* Head Offices */}
              {headOffices.length > 0 && (
                <Group label="Head Offices" />
              )}
              {headOffices.map(c => (
                <CompanyRow key={`ho-${c.id}`} company={c} selected={String(selectedCompanyId) === String(c.id)} onSelect={handleSelect} />
              ))}

              {/* Branches */}
              {branches.length > 0 && (
                <Group label="Branches" />
              )}
              {branches.map(c => (
                <CompanyRow key={`br-${c.id}`} company={c} selected={String(selectedCompanyId) === String(c.id)} onSelect={handleSelect} />
              ))}
            </div>
          </MenuItems>
        </>
      )}
    </Menu>
  )
}

function Group({ label }) {
  return (
    <div className="px-3 pt-2.5 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
      {label}
    </div>
  )
}

function CompanyRow({ company, selected, onSelect }) {
  const meta = TYPE_META[company.type] || TYPE_META.UNKNOWN
  const [logoLoadError, setLogoLoadError] = useState(false)
  return (
    <MenuItem>
      {({ active, close }) => (
        <button
          onClick={() => onSelect(company.id, close)}
          className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${active ? 'bg-indigo-50' : ''} ${selected ? 'text-indigo-700 font-medium' : 'text-gray-700'}`}
        >
          {company.logoUrl && !logoLoadError
            ? <img src={company.logoUrl} alt="" className="h-7 w-7 rounded-md object-cover flex-shrink-0" onError={() => setLogoLoadError(true)} />
            : <span className="flex h-7 w-7 items-center justify-center rounded-md bg-gray-100 text-gray-500 font-semibold text-xs flex-shrink-0">{initials(company.name)}</span>
          }
          <span className="flex-1 min-w-0 text-left">
            <span className="block truncate">{company.name}</span>
            <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium ring-1 ring-inset ${meta.chip}`}>{meta.label}</span>
          </span>
          {selected && <CheckIcon className="h-4 w-4 text-indigo-600 flex-shrink-0" />}
        </button>
      )}
    </MenuItem>
  )
}
