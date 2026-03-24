import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, fetchMyCompany, create, update, fetchBranches, selectAll, selectLoading, selectBranches } from './companiesSlice'
import { fetchWithoutHeadOffice, selectAvailable as selectOrganizations } from '../organizations/organizationsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import { BuildingOffice2Icon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'

export default function CompaniesPage() {
  const dispatch = useDispatch()
  const { isPlatformAdmin, isEnterpriseAdmin, user } = useAuth()
  const companies = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const branches = useSelector(selectBranches)
  const organizations = useSelector(selectOrganizations)
  const [expanded, setExpanded] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalType, setModalType] = useState('headoffice')
  const [parentId, setParentId] = useState(null)
  const [editTarget, setEditTarget] = useState(null)   // branch being edited
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  // Only super admin can create head offices; enterprise admin can add branches
  const canCreateHeadOffice = isPlatformAdmin()
  const canAddBranch = isPlatformAdmin() || isEnterpriseAdmin()

  useEffect(() => {
    if (isPlatformAdmin()) {
      dispatch(fetchAll({ page: 0, size: 50 }))
      dispatch(fetchWithoutHeadOffice())
    } else if (isEnterpriseAdmin()) {
      // Enterprise admin cannot call GET /companies — fetch their own company by ID
      const companyId = user?.companyId || user?.company?.id
      if (companyId) dispatch(fetchMyCompany(companyId))
    }
  }, [dispatch])

  // Auto-expand and load branches for enterprise admin (they only manage their own head office)
  useEffect(() => {
    if (isEnterpriseAdmin() && companies.length > 0) {
      const headOffice = companies.find(c => (c.companyType || c.type) === 'HEAD_OFFICE')
      if (headOffice && expanded === null) {
        setExpanded(headOffice.id)
        dispatch(fetchBranches(headOffice.id))
      }
    }
  }, [companies])

  const toggleExpand = (id) => {
    if (expanded === id) { setExpanded(null); return }
    setExpanded(id)
    if (!branches[id]) dispatch(fetchBranches(id))
  }

  const openHeadOffice = () => { setModalType('headoffice'); setParentId(null); setEditTarget(null); reset({}); setModalOpen(true) }
  const openBranch = (id) => { setModalType('branch'); setParentId(id); setEditTarget(null); reset({}); setModalOpen(true) }
  const openEditBranch = (branch, headOfficeId) => {
    setModalType('branch')
    setParentId(headOfficeId)
    setEditTarget(branch)
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

  const onSubmit = async (data) => {
    try {
      if (editTarget) {
        await dispatch(update({ id: editTarget.id, data })).unwrap()
        toast.success('Branch updated')
        if (parentId) dispatch(fetchBranches(parentId))
      } else {
        const payload = modalType === 'branch'
          ? { ...data, parentId, type: 'BRANCH' }
          : { ...data, type: 'HEAD_OFFICE', organizationId: Number(data.organizationId) }
        await dispatch(create(payload)).unwrap()
        toast.success(`${modalType === 'branch' ? 'Branch' : 'Head office'} created`)
        if (parentId) dispatch(fetchBranches(parentId))
        else if (isPlatformAdmin()) dispatch(fetchAll({ page: 0, size: 50 }))
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  // Handle both `companyType` and `type` field names depending on backend response shape
  const headOffices = companies.filter(c => (c.companyType || c.type) === 'HEAD_OFFICE')

  const subtitle = isEnterpriseAdmin()
    ? 'Your head office and branch companies (max 5 branches)'
    : 'All head offices and branch management'

  return (
    <div>
      <PageHeader
        title="Companies"
        subtitle={subtitle}
        actions={canCreateHeadOffice ? <Button onClick={openHeadOffice}>+ New Head Office</Button> : null}
      />
      {loading && <Spinner className="py-8" />}
      <div className="space-y-4">
        {!loading && headOffices.map(company => (
          <Card key={company.id} padding={false}>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors rounded-xl" onClick={() => toggleExpand(company.id)}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <BuildingOffice2Icon className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{company.name}</p>
                  <p className="text-xs text-gray-500">{company.email} · {company.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge label="Head Office" variant="primary" />
                {(branches[company.id] || []).length > 0 && (
                  <span className="text-xs text-gray-400">{(branches[company.id] || []).length}/5 branches</span>
                )}
                {canAddBranch && (branches[company.id] || []).length < 5 && (
                  <Button size="sm" variant="secondary" onClick={e => { e.stopPropagation(); openBranch(company.id) }}>+ Branch</Button>
                )}
                {canAddBranch && (branches[company.id] || []).length >= 5 && (
                  <span className="text-xs text-amber-500 font-medium">Branch limit reached</span>
                )}
                {expanded === company.id ? <ChevronUpIcon className="h-4 w-4 text-gray-400" /> : <ChevronDownIcon className="h-4 w-4 text-gray-400" />}
              </div>
            </div>
            {expanded === company.id && (
              <div className="border-t border-gray-100 px-4 pb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-3 mb-2">Branches</p>
                {(branches[company.id] || []).length === 0 ? (
                  <p className="text-sm text-gray-400 py-2">No branches yet</p>
                ) : (
                  <div className="space-y-2">
                    {(branches[company.id] || []).map(branch => (
                      <div key={branch.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-800">{branch.name}</p>
                          <p className="text-xs text-gray-500">{branch.email} · {branch.city || branch.address || '—'}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge label="Branch" variant="accent" />
                          {canAddBranch && (
                            <Button size="sm" variant="secondary" onClick={() => openEditBranch(branch, company.id)}>Edit</Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </Card>
        ))}
        {!loading && headOffices.length === 0 && (
          <Card>
            <div className="text-center py-8">
              <BuildingOffice2Icon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {canCreateHeadOffice ? 'No companies yet. Create your first head office.' : 'No companies found.'}
              </p>
            </div>
          </Card>
        )}
      </div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editTarget ? `Edit Branch — ${editTarget.name}` : modalType === 'branch' ? 'New Branch' : 'New Head Office'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>Create</Button></div>}>
        <div className="space-y-4">
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
          {modalType === 'headoffice' && !editTarget && (
            <Select
              label="Organization"
              placeholder="Select organization"
              options={organizations.map(org => ({ value: org.id, label: org.name }))}
              error={errors.organizationId?.message}
              {...register('organizationId', { required: 'Organization is required' })}
            />
          )}
        </div>
      </Modal>
    </div>
  )
}
