import { formatOrganizationId } from '../../utils/organizationId'
import { applyFormErrors } from '../../services/apiErrors'
import { LAUNCH_COUNTRIES as COUNTRIES } from '../../config/countries'
import SaveProgressCard from '../../components/common/SaveProgressCard'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchAll, create, update, uploadLogo, remove, selectAll, selectLoading, selectPagination } from './organizationsSlice'
import { setSelectedCompany } from '../auth/authSlice'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import ConfirmModal from '../../components/common/ConfirmModal'
import { STATUS_COLORS, API_BASE_URL } from '../../config/constants'
import { BuildingOffice2Icon, CameraIcon, CheckBadgeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'
import api from '../../services/api'

const EMPLOYEE_RANGES = [
  ['EMPLOYEES_1_20', '1–20 employees'], ['EMPLOYEES_21_50', '21–50 employees'],
  ['EMPLOYEES_51_200', '51–200 employees'], ['EMPLOYEES_201_500', '201–500 employees'],
  ['EMPLOYEES_501_1000', '501–1,000 employees'], ['EMPLOYEES_1001_5000', '1,001–5,000 employees'],
  ['EMPLOYEES_5001_PLUS', '5,001+ employees'],
].map(([value, label]) => ({ value, label }))

function getLogoUrl(logoPath) {
  if (!logoPath) return null
  if (logoPath.startsWith('http://') || logoPath.startsWith('https://')) return logoPath
  if (logoPath.startsWith('/api/files/')) return logoPath
  if (logoPath.startsWith('api/files/')) return `/${logoPath}`
  if (logoPath.startsWith('/files/')) return `/api${logoPath}`
  if (logoPath.startsWith('files/')) return `/api/${logoPath}`
  const clean = logoPath.startsWith('/') ? logoPath.slice(1) : logoPath
  return `${API_BASE_URL}/files/${clean}`
}

function OrgLogoCell({ org, url }) {
  const [error, setError] = useState(false)
  if (!url || error) {
    return (
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF5FD] ring-1 ring-inset ring-[#DCEBFA]">
        <BuildingOffice2Icon className="h-4 w-4 text-[#4C84B8]" />
      </div>
    )
  }
  return (
    <img
      src={url}
      alt={org.name || 'logo'}
      onError={() => setError(true)}
      className="h-9 w-9 rounded-xl object-cover border border-[#DCE7F2]"
    />
  )
}

export default function OrganizationsPage() {
  const {isPlatformAdmin}=useAuth()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const error = useSelector(state => state.organizations.error)
  const pagination = useSelector(selectPagination)
  const selectedCompanyId = useSelector(state => state.auth.selectedCompanyId)
  const loginCompanyId = useSelector(state => state.auth.user?.loginCompanyId)
  const companies = useSelector(state => state.platform.companies)
  const currentOrganizationId = companies.find(company => String(company.id) === String(selectedCompanyId))?.organizationId
  const loginOrganizationId = companies.find(company => String(company.id) === String(loginCompanyId))?.organizationId
  const isCurrentOrganization = org => [currentOrganizationId, loginOrganizationId]
    .some(id => id != null && String(org.id) === String(id))

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, org: null })
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const submittingRef = useRef(false)
  const [templates, setTemplates] = useState([])
  const logoInputRef = useRef(null)

  const { register, handleSubmit, reset, setValue, watch, setError, clearErrors, formState: { errors } } = useForm()
  const brandColor = watch('brandColor')

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])

  useEffect(() => { api.get('/organization-templates').then(({ data }) => setTemplates(data)).catch(() => {}) }, [])

  const openCreate = () => {
    setEditing(null)
    reset({ industryType: 'GENERAL', employeeRange: '', country: '', brandColor: '#2F73B7' })
    setLogoFile(null)
    setLogoPreview(null)
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    const logoPath = row.logoPath || companies?.find(c => String(c.organizationId) === String(row.id) && (c.companyType === 'HEAD_OFFICE' || !c.parentCompanyId))?.logoPath || companies?.find(c => String(c.organizationId) === String(row.id))?.logoPath
    reset({ ...row, employeeRange: row.employeeRange || '', brandColor: row.brandColor || '#2F73B7' })
    setLogoFile(null)
    setLogoPreview(getLogoUrl(logoPath))
    setModalOpen(true)
  }

  const onLogoFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    e.target.value = ''
  }

  const onSubmit = async (formData) => {
    if (submittingRef.current) return
    clearErrors()
    submittingRef.current = true
    setSaveMessage(editing ? 'Saving organization details…' : 'Saving your organization and administrator details…')
    setSaving(true)
    try {
      let savedOrg
      if (editing) {
        savedOrg = await dispatch(update({ id: editing.id, data: formData })).unwrap()
        toast.success('Organization updated')
      } else {
        // Creation returns before workspace DDL completes.  Do not select a company
        // whose tenant schema is still being provisioned: that would send subsequent
        // requests to a workspace that is deliberately not ready yet.
        const result = await dispatch(create(formData)).unwrap()
        savedOrg = result.organization
        if (isPlatformAdmin() && result.headOfficeCompanyId && result.headOfficeSchemaReady) {
          dispatch(setSelectedCompany(result.headOfficeCompanyId))
          toast.success(`Organization ${formatOrganizationId(savedOrg.id)} created — switched to it`)
        } else {
          toast.success(`Organization ${formatOrganizationId(savedOrg.id)} created — preparing its workspace. Refresh in a few moments to open it.`)
        }
      }
      if (logoFile && savedOrg?.id) {
        setSaveMessage('Uploading the organization logo…')
        try {
          await dispatch(uploadLogo({ id: savedOrg.id, file: logoFile })).unwrap()
        } catch {
          toast.error('Saved, but logo upload failed')
        }
      }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) {
      toast.error(applyFormErrors(e, setError))
    } finally {
      submittingRef.current = false
      setSaving(false)
    }
  }

  const toggleStatus = async (org) => {
    try {
      const action = org.status === 'ACTIVE' ? 'suspend' : 'activate'
      await api.post(`/organizations/${org.id}/${action}`)
      toast.success(`Organization ${action}d`)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch { toast.error('Action failed') }
  }

  const deleteOrg = (org) => {
    if (isCurrentOrganization(org)) {
      toast.error('Cannot delete the organization of your login company or currently selected company.')
      return
    }
    setConfirmModal({ open: true, org })
  }
  const onConfirmDelete = async () => {
    if (isCurrentOrganization(confirmModal.org)) {
      toast.error('Cannot delete the organization of your login company or currently selected company.')
      setConfirmModal({ open: false, org: null })
      return
    }
    const orgId = confirmModal.org.id
    console.log('[Delete Org] Starting delete for org:', orgId)
    try {
      const result = await dispatch(remove(orgId)).unwrap()
      console.log('[Delete Org] Success:', result)
      toast.success('Organization deleted')
    } catch (e) {
      console.error('[Delete Org] Error:', e)
      toast.error(e || 'Delete failed')
    } finally {
      console.log('[Delete Org] Finally — closing modal')
      setConfirmModal({ open: false, org: null })
    }
  }

  const columns = [
    {
      id: 'logo',
      header: 'Logo',
      cell: ({ row }) => {
        const org = row.original
        const logoPath = org.logoPath || companies?.find(c => String(c.organizationId) === String(org.id) && (c.companyType === 'HEAD_OFFICE' || !c.parentCompanyId))?.logoPath || companies?.find(c => String(c.organizationId) === String(org.id))?.logoPath
        const url = getLogoUrl(logoPath)
        return <OrgLogoCell org={org} url={url} />
      },
    },
    { accessorKey: 'id', header: 'Organization ID', cell: ({ getValue }) => <span className="whitespace-nowrap font-mono text-xs font-semibold text-[#315B80]">{formatOrganizationId(getValue())}</span> },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'employeeRange', header: 'Size', cell: ({ getValue }) => EMPLOYEE_RANGES.find(range => range.value === getValue())?.label || 'Not provided' },
    { accessorKey: 'contactEmail', header: 'Email' },
    { accessorKey: 'contactPhone', header: 'Phone' },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => (
        <Badge label={getValue() || 'Active'} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'success'} />
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          {isPlatformAdmin() && <Button size="sm" variant="ghost" onClick={() => navigate(`/organizations/${row.original.id}/subscription`)}>Subscription</Button>}
          {isPlatformAdmin() && <><Button size="sm" variant={row.original.status === 'ACTIVE' ? 'danger' : 'success'} onClick={() => toggleStatus(row.original)}>
            {row.original.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
          </Button>
          <Button size="sm" variant="danger" disabled={isCurrentOrganization(row.original)} title={isCurrentOrganization(row.original) ? 'The organization of your login company or currently selected company cannot be deleted.' : undefined} onClick={() => deleteOrg(row.original)}>{isCurrentOrganization(row.original) ? 'Current organization' : 'Delete'}</Button></>}
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-5 pb-6">
      <div className="relative overflow-hidden rounded-2xl border border-[#DCE7F2] bg-gradient-to-r from-white via-white to-[#F0F6FC] px-5 py-5 shadow-[0_8px_24px_rgba(30,65,96,0.045)] sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-16 h-48 w-48 rounded-full bg-[#E8F1FB]/70" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#EAF2FC] text-[#2D6FB4] ring-1 ring-inset ring-[#D7E6F7]">
              <BuildingOffice2Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8A6B19]">Platform · Directory</p>
              <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-[#17324F]">Organizations</h1>
              <p className="mt-1 text-sm text-slate-500">Manage platform organizations and their access.</p>
            </div>
          </div>
          <Button onClick={openCreate}>+ New Organization</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white px-5 py-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)]">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-[#4D8FD1]" />
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#EDF5FD] text-[#3479BC] ring-1 ring-inset ring-[#DCEBFA]"><BuildingOffice2Icon className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold leading-tight tracking-tight text-[#17324F]">{pagination.total ?? data.length}</p><p className="text-xs font-medium text-slate-500">Total organizations</p></div>
        </div>
        <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white px-5 py-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)]">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-[#3E9B79]" />
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ECF8F3] text-[#318367] ring-1 ring-inset ring-[#D8EFE5]"><CheckBadgeIcon className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold leading-tight tracking-tight text-[#17324F]">{data.filter(org => org.status === 'ACTIVE').length}</p><p className="text-xs font-medium text-slate-500">Active on this page</p></div>
        </div>
        <div className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white px-5 py-4 shadow-[0_7px_22px_rgba(30,65,96,0.045)]">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-[#E7C65B]" />
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#FFF8DF] text-[#98751D] ring-1 ring-inset ring-[#F4E7B8]"><ExclamationCircleIcon className="h-5 w-5" /></div>
          <div><p className="text-2xl font-bold leading-tight tracking-tight text-[#17324F]">{data.filter(org => org.status && org.status !== 'ACTIVE').length}</p><p className="text-xs font-medium text-slate-500">Needs review</p></div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[#DCE7F2] bg-white shadow-[0_8px_26px_rgba(30,65,96,0.055)]">
        <div className="flex items-center justify-between border-b border-[#E7EEF5] bg-[#F8FAFD] px-5 py-4">
          <div><h2 className="text-sm font-bold text-[#17324F]">Organization directory</h2><p className="mt-0.5 text-xs text-slate-500">Review and manage registered organizations</p></div>
          <span className="rounded-full border border-[#DCE7F2] bg-white px-3 py-1 text-xs font-semibold text-[#46627D]">{pagination.total ?? data.length} total</span>
        </div>
        {error ? (
          <div role="alert" className="flex items-center justify-between gap-4 p-5 text-sm text-red-700">
            <p>Could not load organizations: {error}</p>
            <Button variant="secondary" onClick={() => dispatch(fetchAll({ page: 0, size: 20 }))}>Retry</Button>
          </div>
        ) : <DataTable columns={columns} data={data} loading={loading} />}
      </div>
      <Pagination
        page={pagination.page}
        totalPages={Math.ceil(pagination.total / pagination.size)}
        onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))}
      />

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, org: null })}
        onConfirm={onConfirmDelete}
        title="Delete Organization"
        message={`Delete "${confirmModal.org?.name}"? This will permanently delete all companies, employees, and associated data under this organization. This cannot be undone.`}
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal
        open={modalOpen}
        onClose={() => { if (!submittingRef.current) setModalOpen(false) }}
        busy={saving}
        title={editing ? 'Edit Organization' : 'New Organization'}
        footer={
          <div className="flex justify-end gap-2">
            {!saving && <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>}
            <Button onClick={handleSubmit(onSubmit)} disabled={saving} loading={saving}>
              {saving ? (editing ? 'Saving…' : 'Creating…') : editing ? 'Update' : 'Create'}
            </Button>
          </div>
        }
      >
        {saving && <SaveProgressCard title={editing ? 'Saving organization…' : 'Creating organization…'} message={saveMessage} />}
        <fieldset disabled={saving} hidden={saving} className="min-w-0 space-y-4">
          {/* Logo upload */}
          <div className="flex flex-col items-center gap-2 pb-2">
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
            <p className="text-xs text-gray-400">Click to upload logo</p>
            <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={onLogoFileChange} />
          </div>

          {/* Organization Details */}
          {editing ? <Input label="Organization ID" value={formatOrganizationId(editing.id)} readOnly helperText="Unique reference for billing and support." /> : <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">A unique organization ID is assigned automatically when you create this organization.</p>}
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Organization Details</p>
          <Input label="Organization Name" error={errors.name?.message} {...register('name', { required: 'Enter the organization name', setValueAs: value => value?.trim(), maxLength: { value: 255, message: 'Organization name must be at most 255 characters' } })} />
          <div>
            <label htmlFor="organization-brand-color" className="mb-1.5 block text-sm font-medium text-[#38536E]">Brand color</label>
            <div className="flex items-center gap-3">
              <input type="color" aria-label="Choose organization brand color" value={/^#[0-9a-fA-F]{6}$/.test(brandColor || '') ? brandColor : '#2F73B7'} onChange={event => setValue('brandColor', event.target.value.toUpperCase(), { shouldDirty: true, shouldValidate: true })} className="h-11 w-14 cursor-pointer rounded-lg border border-[#D7E3EF] bg-white p-1" />
              <input id="organization-brand-color" placeholder="#2F73B7" maxLength={7} className="h-11 min-w-0 flex-1 rounded-lg border border-[#D7E3EF] px-3 text-sm text-[#294762]" {...register('brandColor', { pattern: { value: /^#[0-9a-fA-F]{6}$/, message: 'Use a six-digit hex color, for example #2F73B7' } })} />
            </div>
            <p className="mt-1 text-xs text-slate-500">Used in this organization’s email templates. Button text adjusts automatically for contrast.</p>
            {errors.brandColor && <p className="mt-1 text-xs text-red-600">{errors.brandColor.message}</p>}
          </div>
          {!editing && <Select label="Organization type" options={templates.length ? templates.map(item => ({ value: item.id, label: item.label })) : [{ value: 'GENERAL', label: 'General business' }]} {...register('industryType')} />}
          {editing && <p className="text-xs text-slate-500">Organization type and standard templates can be managed under Setup → Job positions.</p>}
          <Select label="Organization size *" aria-label="Organization size" placeholder="Select employee range" options={EMPLOYEE_RANGES} error={errors.employeeRange?.message} {...register('employeeRange', { required: 'Select an employee range' })} />
          <p className="text-xs text-slate-500">Expected employee count. This does not select a subscription or change its user limit.</p>
          <Input label="Contact Email *" type="email" error={errors.contactEmail?.message} {...register('contactEmail', {
            required: 'Contact email is required',
            setValueAs: value => value?.trim(),
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' },
          })} />
          <Input label="Contact Phone *" error={errors.contactPhone?.message} {...register('contactPhone', {
            required: 'Contact phone is required',
          })} />
          <p className="text-sm text-slate-500">{editing ? 'Choose or renew a plan on the Subscription page.' : 'Starts with legacy access. After signing in, the organization admin can choose one month of Free access (up to 20 active employees) or a monthly or yearly paid plan on the Subscription page. Access dates begin when the plan is activated.'}</p>

          {/* Head Office Details — only for creation */}
          {!editing && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Head Office Details</p>
              <Input label="Head Office Name" placeholder="Defaults to organization name if blank" error={errors.headOfficeName?.message} {...register('headOfficeName')} />
              <Input label="Address" error={errors.address?.message} {...register('address')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="City" error={errors.city?.message} {...register('city')} />
                <Input label="State" error={errors.state?.message} {...register('state')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select label="Country *" aria-required="true" placeholder="Select country" options={COUNTRIES} error={errors.country?.message} {...register('country', { required: 'Select a country' })} />
                <Input label="ZIP" error={errors.zip?.message} {...register('zip')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" error={errors.phone?.message} {...register('phone')} />
                <Input label="Email" type="email" error={errors.email?.message} {...register('email', { setValueAs: value => value?.trim(), pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email address' } })} />
              </div>
              <Input label="Website" error={errors.website?.message} {...register('website')} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Tax ID" error={errors.taxId?.message} {...register('taxId')} />
                <Input label="Registration Number" error={errors.registrationNumber?.message} {...register('registrationNumber')} />
              </div>

              {/* Enterprise Admin Credentials */}
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide pt-2">Enterprise Admin Credentials</p>
              <p className="text-xs text-gray-500 -mt-2">Username, email, and password are required to create the organization’s administrator. First and last names are optional.</p>
              <div className="grid grid-cols-2 gap-3">
                <Input label="First Name" error={errors.adminFirstName?.message} {...register('adminFirstName')} />
                <Input label="Last Name" error={errors.adminLastName?.message} {...register('adminLastName')} />
              </div>
              <Input label="Username / Login Email *" aria-label="Admin username" aria-required="true" aria-invalid={!!errors.adminUsername} autoComplete="off" error={errors.adminUsername?.message} {...register('adminUsername', {
                required: 'Admin username is required',
                setValueAs: value => value?.trim(),
              })} />
              <Input label="Admin Email *" aria-label="Admin email" aria-required="true" aria-invalid={!!errors.adminEmail} type="email" autoComplete="off" error={errors.adminEmail?.message} {...register('adminEmail', {
                required: 'Admin email is required',
                setValueAs: value => value?.trim(),
                pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid admin email address' },
              })} />
              <Input label="Password *" aria-label="Admin password" aria-required="true" aria-invalid={!!errors.adminPassword} type="password" autoComplete="new-password" error={errors.adminPassword?.message} {...register('adminPassword', {
                required: 'Admin password is required',
                minLength: { value: 6, message: 'Administrator password must contain at least 6 characters' },
                maxLength: { value: 100, message: 'Administrator password must be at most 100 characters' },
                validate: value => !!value?.trim() || 'Admin password is required',
              })} />

              <div className="pt-2">
                <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-600">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#286CB2] focus:ring-[#286CB2]"
                    {...register('agreeTerms', {
                      required: 'You must acknowledge and accept the Terms & Conditions and Privacy Policy to create an organization',
                    })}
                  />
                  <span>
                    I confirm that this organization and its administrators agree to the{' '}
                    <a
                      href="/terms-and-conditions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#286CB2] underline hover:text-[#173858]"
                    >
                      Terms and Conditions
                    </a>{' '}
                    and{' '}
                    <a
                      href="/privacy-policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-[#286CB2] underline hover:text-[#173858]"
                    >
                      Privacy Policy
                    </a>.
                  </span>
                </label>
                {errors.agreeTerms && (
                  <p className="mt-1 text-xs text-red-600">{errors.agreeTerms.message}</p>
                )}
              </div>
            </>
          )}
        </fieldset>
      </Modal>
    </div>
  )
}
