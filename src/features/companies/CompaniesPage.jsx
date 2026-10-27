import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, fetchMyCompany, create, update, remove, uploadLogo, uploadStamp, uploadSignature,
  fetchBranches, selectAll, selectLoading, selectBranches,
} from './companiesSlice'
import { validateCompanyScope } from '../platform/platformSlice'
import { setSelectedCompany } from '../auth/authSlice'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Spinner from '../../components/common/Spinner'
import ConfirmModal from '../../components/common/ConfirmModal'
import { API_BASE_URL } from '../../config/constants'
import {
  BuildingOffice2Icon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  GlobeAltIcon,
  PlusIcon,
  PencilSquareIcon,
  BuildingStorefrontIcon,
  CameraIcon,
  TrashIcon,
  CheckBadgeIcon,
  PencilIcon,
} from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'

function getLogoUrl(logoPath) {
  if (!logoPath) return null
  if (logoPath.startsWith('http')) return logoPath
  return `${API_BASE_URL}/files/${logoPath}`
}

// ─── Logo avatar (shared) ────────────────────────────────────────────────────
function LogoAvatar({ logoPath, icon: Icon, size = 'md', canUpload = false, onUpload, className = '' }) {
  const inputRef = useRef(null)
  const url = getLogoUrl(logoPath)
  const sizeMap = { sm: 'w-11 h-11', md: 'w-14 h-14', lg: 'w-16 h-16' }
  const iconSizeMap = { sm: 'h-5 w-5', md: 'h-7 w-7', lg: 'h-8 w-8' }

  const handleChange = (e) => {
    const file = e.target.files?.[0]
    if (file && onUpload) onUpload(file)
    e.target.value = ''
  }

  return (
    <div
      className={`${sizeMap[size]} rounded-2xl bg-white border border-[#DCE7F2] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm relative ${canUpload ? 'cursor-pointer group' : ''} ${className}`}
      onClick={() => canUpload && inputRef.current?.click()}
    >
      {url
        ? <img src={url} alt="logo" className="w-full h-full object-cover" />
        : <Icon className={`${iconSizeMap[size]} text-[#4C84B8]`} />
      }
      {canUpload && (
        <>
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <CameraIcon className="h-4 w-4 text-white" />
          </div>
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={handleChange} />
        </>
      )}
    </div>
  )
}

// ─── Branch card ─────────────────────────────────────────────────────────────
function BranchCard({ branch, headOfficeId, canEdit, onEdit, onDelete, onLogoUpload }) {
  return (
    <div className="flex min-h-[250px] flex-col overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition-all hover:-translate-y-0.5 hover:border-[#C9D9E8] hover:shadow-md group">
      <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#F4F8FC] to-[#FFFDF6] p-4 transition-colors group-hover:from-[#EDF5FD] group-hover:to-[#FFFAE9]">
        <LogoAvatar
          logoPath={branch.logoPath}
          icon={BuildingStorefrontIcon}
          size="md"
          canUpload={canEdit}
          onUpload={(file) => onLogoUpload(branch.id, file)}
          className="mb-3"
        />
        <p className="text-center text-sm font-bold leading-tight text-[#17324F]">{branch.name}</p>
        <span className="mt-2 rounded-full border border-[#DCE7F2] bg-white px-2.5 py-1 text-xs font-semibold text-[#49627C]">Branch</span>
      </div>
      <div className="space-y-1 border-t border-[#E7EEF5] bg-white px-3 py-2.5">
        {branch.email && (
          <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
            <EnvelopeIcon className="h-3 w-3 flex-shrink-0 text-gray-400" />
            {branch.email}
          </p>
        )}
        {(branch.city || branch.address) && (
          <p className="flex items-center gap-1 text-xs text-gray-500 truncate">
            <MapPinIcon className="h-3 w-3 flex-shrink-0 text-gray-400" />
            {branch.city || branch.address}
          </p>
        )}
        {canEdit && (
          <div className="mt-1 flex gap-1">
            <button
              onClick={() => onEdit(branch, headOfficeId)}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
            >
              <PencilSquareIcon className="h-3 w-3" />
              Edit
            </button>
            <button
              onClick={() => onDelete(branch)}
              className="flex-1 flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            >
              <TrashIcon className="h-3 w-3" />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Enterprise Admin View ───────────────────────────────────────────────────
function EnterpriseView({ headOffice, branches, canAddBranch, onAddBranch, onEditBranch, onDeleteBranch, onLogoUpload }) {
  const branchList = branches[headOffice?.id] || []
  const atLimit = branchList.length >= 5

  if (!headOffice) return null

  const location = [headOffice.city, headOffice.state, headOffice.country].filter(Boolean).join(', ')

  return (
    <div className="flex flex-col items-start gap-5 lg:flex-row lg:gap-6">

      {/* ── LEFT: Company profile sidebar ── */}
      <div className="w-full flex-shrink-0 space-y-4 lg:w-72">
        {/* Identity block */}
        <div className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
          <div className="h-20 bg-gradient-to-r from-[#17324F] via-[#28669C] to-[#91BBDD]" />
          <div className="px-5 pb-5">
            <div className="-mt-8 mb-4">
              <LogoAvatar
                logoPath={headOffice.logoPath}
                icon={BuildingOffice2Icon}
                size="md"
                canUpload={canAddBranch}
                onUpload={(file) => onLogoUpload(headOffice.id, file)}
              className="border-2 border-white shadow-md"
              />
            </div>
            <span className="mb-2 inline-block rounded-full border border-[#D5E5F4] bg-[#EDF5FD] px-2.5 py-1 text-xs font-semibold text-[#2D6FB4]">
              Head Office
            </span>
            <h2 className="text-base font-bold leading-snug text-[#17324F]">{headOffice.name}</h2>
            {location && (
              <p className="flex items-center gap-1 text-xs text-gray-400 mt-1">
                <MapPinIcon className="h-3.5 w-3.5 flex-shrink-0" />
                {location}
              </p>
            )}
            {canAddBranch && (
              <p className="text-xs text-gray-400 mt-2">Click logo to change</p>
            )}
          </div>
        </div>

        {/* Contact details */}
        <div className="divide-y divide-[#E7EEF5] overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
          {headOffice.email && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#EDF5FD]">
                <EnvelopeIcon className="h-4 w-4 text-[#3479BC]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-xs font-medium text-gray-700 truncate">{headOffice.email}</p>
              </div>
            </div>
          )}
          {headOffice.phone && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#ECF8F3]">
                <PhoneIcon className="h-4 w-4 text-[#318367]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-xs font-medium text-gray-700">{headOffice.phone}</p>
              </div>
            </div>
          )}
          {headOffice.website && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFF8DF]">
                <GlobeAltIcon className="h-4 w-4 text-[#98751D]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Website</p>
                <p className="text-xs font-medium text-gray-700 truncate">{headOffice.website}</p>
              </div>
            </div>
          )}
          {headOffice.address && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-[#F1F5F8]">
                <MapPinIcon className="h-4 w-4 text-[#698096]" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Address</p>
                <p className="text-xs font-medium text-gray-700 truncate">{headOffice.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Branch usage */}
        <div className="rounded-2xl border border-[#DCE7F2] bg-white px-4 py-4 shadow-[0_8px_26px_rgba(30,65,96,0.05)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">Branch Usage</p>
            <span className={`text-xs font-bold ${atLimit ? 'text-amber-600' : 'text-indigo-600'}`}>
              {branchList.length} / 5
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#EAF0F6]">
            <div
              className={`h-full rounded-full transition-all ${atLimit ? 'bg-[#E2BE54]' : 'bg-gradient-to-r from-[#4D8FD1] to-[#2F70B3]'}`}
              style={{ width: `${(branchList.length / 5) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            {atLimit ? 'Branch limit reached' : `${5 - branchList.length} slot${5 - branchList.length !== 1 ? 's' : ''} remaining`}
          </p>
        </div>
      </div>

      {/* ── RIGHT: Branches panel ── */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-800">Branches</h3>
            <p className="text-xs text-gray-400 mt-0.5">Offices operating under {headOffice.name}</p>
          </div>
          {canAddBranch && !atLimit && (
            <button
              onClick={() => onAddBranch(headOffice.id)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Branch
            </button>
          )}
        </div>

        {branchList.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl py-16 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
              <BuildingStorefrontIcon className="h-8 w-8 text-violet-300" />
            </div>
            <p className="text-gray-700 font-semibold text-sm mb-1">No branches yet</p>
            <p className="text-xs text-gray-400 mb-5 max-w-xs">
              Add your first branch office to start expanding your company's footprint.
            </p>
            {canAddBranch && (
              <button
                onClick={() => onAddBranch(headOffice.id)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <PlusIcon className="h-4 w-4" />
                Add Branch
              </button>
            )}
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {branchList.map(branch => {
              const branchLocation = [branch.city, branch.state, branch.country].filter(Boolean).join(', ')
              return (
                <div
                  key={branch.id}
                  className="group overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition-all hover:-translate-y-0.5 hover:border-[#C9D9E8] hover:shadow-md"
                >
                  <div className="px-5 pb-4 pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <LogoAvatar
                        logoPath={branch.logoPath}
                        icon={BuildingStorefrontIcon}
                        size="sm"
                        canUpload={canAddBranch}
                        onUpload={(file) => onLogoUpload(branch.id, file)}
                        className="rounded-xl border-[#DCE7F2]"
                      />
                      <span className="rounded-full border border-[#DCE7F2] bg-[#F4F8FC] px-2.5 py-1 text-xs font-semibold text-[#49627C]">
                        Branch
                      </span>
                    </div>
                    <h4 className="mb-3 text-sm font-bold leading-snug text-[#17324F]">{branch.name}</h4>
                    <div className="space-y-1.5">
                      {branch.email && (
                        <p className="flex items-center gap-2 text-xs text-gray-500">
                          <EnvelopeIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{branch.email}</span>
                        </p>
                      )}
                      {branch.phone && (
                        <p className="flex items-center gap-2 text-xs text-gray-500">
                          <PhoneIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          {branch.phone}
                        </p>
                      )}
                      {(branchLocation || branch.address) && (
                        <p className="flex items-center gap-2 text-xs text-gray-500">
                          <MapPinIcon className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{branchLocation || branch.address}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  {canAddBranch && (
                    <div className="flex justify-end gap-3 border-t border-[#E7EEF5] px-4 py-2.5">
                      <button
                        onClick={() => onEditBranch(branch, headOffice.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => onDeleteBranch(branch)}
                        className="flex items-center gap-1.5 text-xs font-medium text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Branches Modal (Super Admin) ─────────────────────────────────────────────
function BranchesModal({ company, branches, open, onClose, canAddBranch, onAddBranch, onEditBranch, onDeleteBranch, onLogoUpload }) {
  const branchList = branches[company?.id] || []

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
            <BuildingStorefrontIcon className="h-4 w-4 text-violet-500" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              Branches — <span className="text-indigo-600">{company?.name}</span>
            </p>
            <p className="text-xs text-gray-400 font-normal">{branchList.length} of 5 branches used</p>
          </div>
        </div>
      }
      footer={
        canAddBranch && branchList.length < 5 ? (
          <div className="flex justify-end">
            <button
              onClick={() => { onClose(); onAddBranch(company?.id) }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Branch
            </button>
          </div>
        ) : branchList.length >= 5 ? (
          <div className="flex justify-end">
            <span className="text-xs font-medium px-3 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
              Branch limit reached (5/5)
            </span>
          </div>
        ) : null
      }
    >
      {branchList.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center mb-4">
            <BuildingStorefrontIcon className="h-7 w-7 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-600">No branches yet</p>
          <p className="text-xs text-gray-400 mt-1">Add up to 5 branches to this head office</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {branchList.map(branch => (
            <BranchCard
              key={branch.id}
              branch={branch}
              headOfficeId={company?.id}
              canEdit={canAddBranch}
              onEdit={(b, hid) => { onClose(); onEditBranch(b, hid) }}
              onDelete={(b) => onDeleteBranch(b)}
              onLogoUpload={onLogoUpload}
            />
          ))}
        </div>
      )}
    </Modal>
  )
}

// ─── Super Admin View ──────────────────────────────────────────────────────────
function SuperAdminView({ headOffices, branches, canAddBranch, onAddBranch, onEditBranch, onEditHeadOffice, onDeleteHeadOffice, onDeleteBranch, onLogoUpload }) {
  const [selected, setSelected] = useState(null)
  const [branchModalOpen, setBranchModalOpen] = useState(false)
  const dispatch = useDispatch()

  const totalBranches = headOffices.reduce((sum, c) => sum + (branches[c.id]?.length || 0), 0)
  const selectedCompany = headOffices.find(c => c.id === selected)

  const openBranchModal = (id) => {
    setSelected(id)
    if (!branches[id]) dispatch(fetchBranches(id))
    setBranchModalOpen(true)
  }

  const handleOpenCompanyDashboard = async (companyId) => {
    try {
      const result = await dispatch(validateCompanyScope(companyId)).unwrap()
      if (!result.valid) {
        toast.error(`Access denied for ${result.companyName || 'this company'}`)
        return
      }
    } catch {
      toast.error('Could not validate company access. Try again.')
      return
    }
    dispatch(setSelectedCompany(companyId))
    window.location.href = '/dashboard'
  }

  return (
    <div className="space-y-5">
      {headOffices.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-[#DCE7F2] bg-white p-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)]">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#EDF5FD] text-[#3479BC] ring-1 ring-inset ring-[#DCEBFA]">
              <BuildingOffice2Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none text-[#17324F]">{headOffices.length}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Head Office{headOffices.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-[#DCE7F2] bg-white p-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)]">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#FFF8DF] text-[#98751D] ring-1 ring-inset ring-[#F4E7B8]">
              <BuildingStorefrontIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none text-[#17324F]">{totalBranches}</p>
              <p className="mt-1 text-xs font-medium text-slate-500">Total Branch{totalBranches !== 1 ? 'es' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {headOffices.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {headOffices.map(company => {
            const branchCount = (branches[company.id] || []).length
            const atLimit = branchCount >= 5

            return (
              <div
                key={company.id}
                onClick={() => handleOpenCompanyDashboard(company.id)}
                className="group relative flex min-h-[280px] cursor-pointer flex-col overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_7px_22px_rgba(30,65,96,0.045)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#BFD3E7] hover:shadow-[0_14px_30px_rgba(30,65,96,0.09)]"
              >
                <div className="flex flex-1 flex-col items-center justify-center bg-gradient-to-br from-[#F3F8FD] via-white to-[#FFFCF1] p-5 transition-colors">
                  <div onClick={e => e.stopPropagation()} className="mb-3">
                    <LogoAvatar
                      logoPath={company.logoPath}
                      icon={BuildingOffice2Icon}
                      size="sm"
                      canUpload={canAddBranch}
                      onUpload={(file) => onLogoUpload(company.id, file)}
                    />
                  </div>
                  <p className="text-center text-base font-bold leading-tight text-[#17324F]">{company.name}</p>
                  <span className="mt-2 rounded-full border border-[#D5E5F4] bg-[#EDF5FD] px-2.5 py-1 text-xs font-semibold text-[#2D6FB4]">
                    Head Office
                  </span>
                </div>
                <div className="space-y-1 border-t border-[#E7EEF5] bg-white px-4 py-3">
                  {company.email && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                      <EnvelopeIcon className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      {company.email}
                    </p>
                  )}
                  {company.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-gray-500 truncate">
                      <PhoneIcon className="h-3 w-3 flex-shrink-0 text-gray-400" />
                      {company.phone}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); openBranchModal(company.id) }}
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors ${atLimit ? 'border-[#F0E2B7] bg-[#FFF8E3] text-[#98751D] hover:bg-[#FFF2C8]' : 'border-[#DCE7F2] bg-[#F6F9FC] text-[#49627C] hover:bg-[#EDF5FD] hover:text-[#2D6FB4]'}`}
                    >
                      {branchCount}/5 branches ↓
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditHeadOffice(company) }}
                        className="flex items-center gap-1 text-xs font-semibold text-[#3479BC] transition-colors hover:text-[#1F5F9D]"
                        title="Edit company branding"
                      >
                        <PencilSquareIcon className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteHeadOffice(company) }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-xs text-indigo-400 font-medium">Open →</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
          <div className="flex flex-col items-center rounded-2xl border border-dashed border-[#C9D9E8] bg-white px-6 py-16 text-center shadow-[0_7px_22px_rgba(30,65,96,0.035)]">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#EDF5FD] text-[#4C84B8]">
            <BuildingOffice2Icon className="h-8 w-8" />
          </div>
          <p className="text-gray-700 font-semibold text-base mb-1">No companies yet</p>
          <p className="text-sm text-gray-400 max-w-xs">Head offices are created automatically when you add a new organization.</p>
        </div>
      )}

      {selectedCompany && (
        <BranchesModal
          company={selectedCompany}
          branches={branches}
          open={branchModalOpen}
          onClose={() => setBranchModalOpen(false)}
          canAddBranch={canAddBranch}
          onAddBranch={onAddBranch}
          onEditBranch={onEditBranch}
          onDeleteBranch={onDeleteBranch}
          onLogoUpload={onLogoUpload}
        />
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function CompaniesPage() {
  const dispatch = useDispatch()
  const { isPlatformAdmin, isEnterpriseAdmin, user } = useAuth()
  const companies = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const branches = useSelector(selectBranches)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('headoffice')
  const [parentId, setParentId] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [stampFile, setStampFile] = useState(null)
  const [stampPreview, setStampPreview] = useState(null)
  const [signatureFile, setSignatureFile] = useState(null)
  const [signaturePreview, setSignaturePreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, company: null, action: null })
  const logoInputRef = useRef(null)
  const stampInputRef = useRef(null)
  const signatureInputRef = useRef(null)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const canAddBranch = isPlatformAdmin() || isEnterpriseAdmin()

  useEffect(() => {
    if (isPlatformAdmin()) {
      dispatch(fetchAll({ page: 0, size: 50 }))
    } else if (isEnterpriseAdmin()) {
      const companyId = user?.companyId || user?.company?.id
      if (companyId) dispatch(fetchMyCompany(companyId))
    }
  }, [dispatch])

  useEffect(() => {
    if (isPlatformAdmin() && companies.length > 0) {
      const headOfficeList = companies.filter(c => (c.companyType || c.type) === 'HEAD_OFFICE')
      headOfficeList.forEach(ho => {
        if (!branches[ho.id]) dispatch(fetchBranches(ho.id))
      })
    }
    if (isEnterpriseAdmin() && companies.length > 0) {
      const headOffice = companies.find(c => (c.companyType || c.type) === 'HEAD_OFFICE')
      if (headOffice) dispatch(fetchBranches(headOffice.id))
    }
  }, [companies])

  const handleDeleteHeadOffice = (company) => setConfirmModal({ open: true, company, action: 'headoffice' })
  const handleDeleteBranch = (branch) => setConfirmModal({ open: true, company: branch, action: 'branch' })

  const onConfirmDelete = async () => {
    const { company, action } = confirmModal
    try {
      await dispatch(remove(company.id)).unwrap()
      toast.success(action === 'headoffice' ? 'Head office deleted' : 'Branch deleted')
    } catch (e) {
      toast.error(e || 'Delete failed')
    } finally {
      setConfirmModal({ open: false, company: null, action: null })
    }
  }

  const handleLogoUpload = async (companyId, file) => {
    try {
      await dispatch(uploadLogo({ id: companyId, file })).unwrap()
      toast.success('Logo updated')
    } catch {
      toast.error('Failed to upload logo')
    }
  }

  const openBranch = (id) => {
    setModalType('branch')
    setParentId(id)
    setEditTarget(null)
    setLogoFile(null)
    setLogoPreview(null)
    setStampFile(null)
    setStampPreview(null)
    setSignatureFile(null)
    setSignaturePreview(null)
    reset({})
    setModalOpen(true)
  }

  const openEditBranch = (branch, headOfficeId) => {
    setModalType('branch')
    setParentId(headOfficeId)
    setEditTarget(branch)
    setLogoFile(null)
    setLogoPreview(getLogoUrl(branch.logoPath))
    setStampFile(null)
    setStampPreview(getLogoUrl(branch.stampPath))
    setSignatureFile(null)
    setSignaturePreview(getLogoUrl(branch.signaturePath))
    reset({
      name: branch.name,
      email: branch.email,
      phone: branch.phone,
      address: branch.address,
      city: branch.city,
      state: branch.state,
      country: branch.country,
      zip: branch.zip,
      website: branch.website,
    })
    setModalOpen(true)
  }

  const openEditHeadOffice = (company) => {
    setModalType('headoffice')
    setParentId(null)
    setEditTarget(company)
    setLogoFile(null)
    setLogoPreview(getLogoUrl(company.logoPath))
    setStampFile(null)
    setStampPreview(getLogoUrl(company.stampPath))
    setSignatureFile(null)
    setSignaturePreview(getLogoUrl(company.signaturePath))
    reset({
      name: company.name,
      email: company.email,
      phone: company.phone,
      address: company.address,
      city: company.city,
      state: company.state,
      country: company.country,
      zip: company.zip,
      website: company.website,
    })
    setModalOpen(true)
  }

  const onLogoFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const onStampFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setStampFile(file)
    setStampPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const onSignatureFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setSignatureFile(file)
    setSignaturePreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      let savedCompany
      if (editTarget) {
        savedCompany = await dispatch(update({ id: editTarget.id, data })).unwrap()
        toast.success('Updated')
        if (parentId) dispatch(fetchBranches(parentId))
      } else {
        savedCompany = await dispatch(create({ ...data, parentId, type: 'BRANCH' })).unwrap()
        toast.success('Branch created')
        if (parentId) dispatch(fetchBranches(parentId))
      }
      if (logoFile && savedCompany?.id) {
        try {
          await dispatch(uploadLogo({ id: savedCompany.id, file: logoFile })).unwrap()
        } catch {
          toast.error('Saved, but logo upload failed')
        }
      }
      if (stampFile && savedCompany?.id) {
        try {
          await dispatch(uploadStamp({ id: savedCompany.id, file: stampFile })).unwrap()
        } catch {
          toast.error('Saved, but stamp upload failed')
        }
      }
      if (signatureFile && savedCompany?.id) {
        try {
          await dispatch(uploadSignature({ id: savedCompany.id, file: signatureFile })).unwrap()
        } catch {
          toast.error('Saved, but signature upload failed')
        }
      }
      setModalOpen(false)
    } catch (e) {
      toast.error(e || 'Error')
    } finally {
      setSaving(false)
    }
  }

  const headOffices = companies.filter(c => (c.companyType || c.type) === 'HEAD_OFFICE')
  const enterpriseHeadOffice = isEnterpriseAdmin() ? headOffices[0] || companies[0] : null

  return (
    <div className="space-y-5 pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-[#DCE7F2] bg-gradient-to-r from-white via-white to-[#F0F6FC] px-5 py-5 shadow-[0_8px_24px_rgba(30,65,96,0.045)] sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full bg-[#E8F1FB]/70" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FC] text-[#2D6FB4] ring-1 ring-inset ring-[#D7E6F7"><BuildingOffice2Icon className="h-6 w-6" /></div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6B19]">Organization · Directory</p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#17324F]">Companies</h1>
            <p className="mt-1 text-sm text-slate-500">{isEnterpriseAdmin() ? 'Your company and branch offices' : 'Manage all head offices and their branches'}</p>
          </div>
        </div>
      </div>

      {loading && <Spinner className="py-12" />}

      {!loading && isPlatformAdmin() && (
        <SuperAdminView
          headOffices={headOffices}
          branches={branches}
          canAddBranch={canAddBranch}
          onAddBranch={openBranch}
          onEditBranch={openEditBranch}
          onEditHeadOffice={openEditHeadOffice}
          onDeleteHeadOffice={handleDeleteHeadOffice}
          onDeleteBranch={handleDeleteBranch}
          onLogoUpload={handleLogoUpload}
        />
      )}

      {!loading && isEnterpriseAdmin() && (
        <EnterpriseView
          headOffice={enterpriseHeadOffice}
          branches={branches}
          canAddBranch={canAddBranch}
          onAddBranch={openBranch}
          onEditBranch={openEditBranch}
          onDeleteBranch={handleDeleteBranch}
          onLogoUpload={handleLogoUpload}
        />
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? `Edit — ${editTarget.name}` : 'New Branch'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} disabled={saving}>
              {saving ? 'Saving…' : editTarget ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Branding: logo, company stamp, authorized signature — all three are stamped onto generated payslips */}
          <div className="flex items-start justify-center gap-6 pb-2">
            <div className="flex flex-col items-center gap-2">
              <div
                className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors group overflow-hidden bg-gray-50"
                onClick={() => logoInputRef.current?.click()}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="logo preview" className="w-full h-full object-cover" />
                  : <BuildingOffice2Icon className="h-8 w-8 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                }
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <CameraIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Logo</p>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={onLogoFileChange} />
            </div>

            <div className="flex flex-col items-center gap-2">
              <div
                className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors group overflow-hidden bg-gray-50"
                onClick={() => stampInputRef.current?.click()}
              >
                {stampPreview
                  ? <img src={stampPreview} alt="stamp preview" className="w-full h-full object-contain p-1" />
                  : <CheckBadgeIcon className="h-8 w-8 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                }
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <CameraIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Company Stamp</p>
              <input ref={stampInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={onStampFileChange} />
            </div>

            <div className="flex flex-col items-center gap-2">
              <div
                className="relative w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center cursor-pointer hover:border-indigo-400 transition-colors group overflow-hidden bg-gray-50"
                onClick={() => signatureInputRef.current?.click()}
              >
                {signaturePreview
                  ? <img src={signaturePreview} alt="signature preview" className="w-full h-full object-contain p-1" />
                  : <PencilIcon className="h-8 w-8 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                }
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <CameraIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <p className="text-xs text-gray-400">Signature</p>
              <input ref={signatureInputRef} type="file" accept="image/png,image/jpeg,image/jpg" className="hidden" onChange={onSignatureFileChange} />
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center -mt-2">Use PNG/JPG. Logo, stamp and signature are printed on generated payslips.</p>

          <Input label="Company Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" {...register('email')} />
            <Input label="Phone" {...register('phone')} />
          </div>
          <Input label="Address" {...register('address')} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" {...register('city')} />
            <Input label="State" {...register('state')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Country" {...register('country')} />
            <Input label="ZIP" {...register('zip')} />
          </div>
          <Input label="Website" {...register('website')} />

        </div>
      </Modal>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, company: null, action: null })}
        onConfirm={onConfirmDelete}
        title={confirmModal.action === 'headoffice' ? 'Delete Head Office' : 'Delete Branch'}
        message={`Delete "${confirmModal.company?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={loading}
      />
    </div>
  )
}
