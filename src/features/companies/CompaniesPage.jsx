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
import PageHeader from '../../components/common/PageHeader'
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
      className={`${sizeMap[size]} rounded-xl bg-white border border-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm relative ${canUpload ? 'cursor-pointer group' : ''} ${className}`}
      onClick={() => canUpload && inputRef.current?.click()}
    >
      {url
        ? <img src={url} alt="logo" className="w-full h-full object-cover" />
        : <Icon className={`${iconSizeMap[size]} text-indigo-400`} />
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
    <div className="aspect-square flex flex-col rounded-2xl border border-gray-100 overflow-hidden hover:border-violet-200 hover:shadow-md transition-all group">
      <div className="flex-1 flex flex-col items-center justify-center p-4 bg-gradient-to-br from-violet-50 to-purple-50 group-hover:from-violet-100 group-hover:to-purple-100 transition-colors">
        <LogoAvatar
          logoPath={branch.logoPath}
          icon={BuildingStorefrontIcon}
          size="md"
          canUpload={canEdit}
          onUpload={(file) => onLogoUpload(branch.id, file)}
          className="mb-3"
        />
        <p className="font-bold text-gray-800 text-sm text-center leading-tight">{branch.name}</p>
        <span className="mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-700">Branch</span>
      </div>
      <div className="bg-white px-3 py-2.5 border-t border-gray-100 space-y-1">
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
    <div className="flex gap-6 items-start">

      {/* ── LEFT: Company profile sidebar ── */}
      <div className="w-72 flex-shrink-0 space-y-4">
        {/* Identity block */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="h-20 bg-gradient-to-br from-indigo-500 to-violet-600" />
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
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 mb-2 inline-block">
              Head Office
            </span>
            <h2 className="text-base font-bold text-gray-900 leading-snug">{headOffice.name}</h2>
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {headOffice.email && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                <EnvelopeIcon className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Email</p>
                <p className="text-xs font-medium text-gray-700 truncate">{headOffice.email}</p>
              </div>
            </div>
          )}
          {headOffice.phone && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                <PhoneIcon className="h-3.5 w-3.5 text-green-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Phone</p>
                <p className="text-xs font-medium text-gray-700">{headOffice.phone}</p>
              </div>
            </div>
          )}
          {headOffice.website && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
                <GlobeAltIcon className="h-3.5 w-3.5 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Website</p>
                <p className="text-xs font-medium text-gray-700 truncate">{headOffice.website}</p>
              </div>
            </div>
          )}
          {headOffice.address && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                <MapPinIcon className="h-3.5 w-3.5 text-rose-400" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400">Address</p>
                <p className="text-xs font-medium text-gray-700 truncate">{headOffice.address}</p>
              </div>
            </div>
          )}
        </div>

        {/* Branch usage */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-gray-600">Branch Usage</p>
            <span className={`text-xs font-bold ${atLimit ? 'text-amber-600' : 'text-indigo-600'}`}>
              {branchList.length} / 5
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${atLimit ? 'bg-amber-400' : 'bg-indigo-500'}`}
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
          <div className="grid grid-cols-2 gap-4">
            {branchList.map(branch => {
              const branchLocation = [branch.city, branch.state, branch.country].filter(Boolean).join(', ')
              return (
                <div
                  key={branch.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-violet-200 transition-all group overflow-hidden"
                >
                  <div className="px-5 pt-5 pb-4">
                    <div className="flex items-start justify-between mb-3">
                      <LogoAvatar
                        logoPath={branch.logoPath}
                        icon={BuildingStorefrontIcon}
                        size="sm"
                        canUpload={canAddBranch}
                        onUpload={(file) => onLogoUpload(branch.id, file)}
                        className="rounded-xl border-violet-100"
                      />
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700">
                        Branch
                      </span>
                    </div>
                    <h4 className="font-bold text-gray-800 text-sm leading-snug mb-3">{branch.name}</h4>
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
                    <div className="border-t border-gray-50 px-4 py-2.5 flex justify-end gap-3">
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
    <div className="space-y-6">
      {headOffices.length > 0 && (
        <div className="flex gap-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <BuildingOffice2Icon className="h-4 w-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{headOffices.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Head Office{headOffices.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-violet-50 flex items-center justify-center flex-shrink-0">
              <BuildingStorefrontIcon className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-none">{totalBranches}</p>
              <p className="text-xs text-gray-500 mt-0.5">Total Branch{totalBranches !== 1 ? 'es' : ''}</p>
            </div>
          </div>
        </div>
      )}

      {headOffices.length > 0 ? (
        <div className="grid grid-cols-3 gap-4">
          {headOffices.map(company => {
            const branchCount = (branches[company.id] || []).length
            const atLimit = branchCount >= 5

            return (
              <div
                key={company.id}
                onClick={() => handleOpenCompanyDashboard(company.id)}
                className="relative cursor-pointer aspect-square flex flex-col rounded-2xl border-2 border-gray-100 overflow-hidden transition-all duration-200 shadow-sm hover:shadow-md hover:border-indigo-200 group"
              >
                <div className="flex-1 flex flex-col items-center justify-center p-5 bg-gradient-to-br from-indigo-50 to-violet-50 group-hover:from-indigo-100 group-hover:to-violet-100 transition-colors">
                  <div onClick={e => e.stopPropagation()} className="mb-3">
                    <LogoAvatar
                      logoPath={company.logoPath}
                      icon={BuildingOffice2Icon}
                      size="sm"
                      canUpload={canAddBranch}
                      onUpload={(file) => onLogoUpload(company.id, file)}
                    />
                  </div>
                  <p className="font-bold text-base text-center leading-tight text-gray-800">{company.name}</p>
                  <span className="mt-2 text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    Head Office
                  </span>
                </div>
                <div className="bg-white px-4 py-3 border-t border-gray-100 space-y-1">
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
                      className={`text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${atLimit ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-gray-100 text-gray-500 hover:bg-indigo-100 hover:text-indigo-600'}`}
                    >
                      {branchCount}/5 branches ↓
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); onEditHeadOffice(company) }}
                        className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
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
        <div className="bg-white border border-dashed border-gray-200 rounded-2xl px-6 py-16 flex flex-col items-center text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
            <BuildingOffice2Icon className="h-8 w-8 text-indigo-400" />
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
    <div className="space-y-6">
      <PageHeader
        title="Companies"
        subtitle={
          isEnterpriseAdmin()
            ? 'Your company and branch offices'
            : 'Manage all head offices and their branches'
        }
      />

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
