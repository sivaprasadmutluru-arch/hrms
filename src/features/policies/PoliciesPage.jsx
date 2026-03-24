import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, publish, unpublish, makeOrgWide, makeBranchOnly, fetchInheritedPolicies, selectAll, selectInherited, selectLoading } from './policiesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import { formatDate } from '../../utils/formatters'
import { DocumentTextIcon, GlobeAltIcon } from '@heroicons/react/24/outline'
import useAuth from '../../hooks/useAuth'

export default function PoliciesPage() {
  const dispatch = useDispatch()
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin } = useAuth()
  const data = useSelector(selectAll)
  const inherited = useSelector(selectInherited)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, watch } = useForm()

  const canManageOrgWide = isPlatformAdmin() || isEnterpriseAdmin()
  const isBranchUser = isBranchAdmin() && !isEnterpriseAdmin() && !isPlatformAdmin()

  useEffect(() => {
    dispatch(fetchAll({ page: 0, size: 50 }))
    if (isBranchUser) {
      dispatch(fetchInheritedPolicies())
    }
  }, [dispatch, isBranchUser])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (p) => { setEditing(p); reset(p); setModalOpen(true) }

  const onSubmit = async (formData) => {
    try {
      if (editing) { await dispatch(update({ id: editing.id, data: formData })).unwrap(); toast.success('Policy updated') }
      else { await dispatch(create(formData)).unwrap(); toast.success('Policy created') }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 50 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const togglePublish = async (policy) => {
    try {
      if (policy.published) { await dispatch(unpublish(policy.id)).unwrap(); toast.success('Unpublished') }
      else { await dispatch(publish(policy.id)).unwrap(); toast.success('Published') }
      dispatch(fetchAll({ page: 0, size: 50 }))
    } catch { toast.error('Failed') }
  }

  const handleMakeOrgWide = async (policy) => {
    try {
      await dispatch(makeOrgWide({ id: policy.id, companyId: policy.company?.id })).unwrap()
      toast.success('Policy is now organization-wide')
      dispatch(fetchAll({ page: 0, size: 50 }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleMakeBranchOnly = async (policy) => {
    try {
      await dispatch(makeBranchOnly({ id: policy.id, companyId: policy.company?.id })).unwrap()
      toast.success('Policy restricted to branch')
      dispatch(fetchAll({ page: 0, size: 50 }))
    } catch (e) { toast.error(e || 'Failed') }
  }

  return (
    <div>
      <PageHeader title="HR Policies" subtitle="Company policies and guidelines" actions={<Button onClick={openCreate}>+ New Policy</Button>} />

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {data.map(policy => (
          <Card key={policy.id}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                  <DocumentTextIcon className="h-5 w-5 text-violet-600" />
                </div>
                {policy.isOrganizationWide && (
                  <span title="Organization-wide policy">
                    <GlobeAltIcon className="h-4 w-4 text-indigo-500" />
                  </span>
                )}
              </div>
              <Badge label={policy.published ? 'Published' : 'Draft'} variant={policy.published ? 'success' : 'default'} />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{policy.title}</h3>
            <p className="text-xs text-gray-500 mb-1">{policy.category}</p>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{policy.content || policy.description || 'No content'}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{formatDate(policy.updatedAt || policy.createdAt)}</span>
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="secondary" onClick={() => openEdit(policy)}>Edit</Button>
                <Button size="sm" variant={policy.published ? 'ghost' : 'primary'} onClick={() => togglePublish(policy)}>
                  {policy.published ? 'Unpublish' : 'Publish'}
                </Button>
                {canManageOrgWide && (
                  policy.isOrganizationWide
                    ? <Button size="sm" variant="ghost" onClick={() => handleMakeBranchOnly(policy)}>Branch Only</Button>
                    : <Button size="sm" variant="ghost" onClick={() => handleMakeOrgWide(policy)}>Org-Wide</Button>
                )}
              </div>
            </div>
          </Card>
        ))}
        {data.length === 0 && !loading && (
          <div className="col-span-3 text-center py-16 text-gray-400">No policies yet. Create your first policy.</div>
        )}
      </div>

      {/* Inherited Policies section — shown to Branch users */}
      {isBranchUser && inherited.length > 0 && (
        <div className="mt-10">
          <h2 className="text-base font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <GlobeAltIcon className="h-5 w-5 text-indigo-500" />
            Inherited from Head Office
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {inherited.map(policy => (
              <Card key={policy.id} className="border-indigo-100 bg-indigo-50/30">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <Badge label="Org-Wide" variant="info" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">{policy.title}</h3>
                <p className="text-xs text-gray-500 mb-1">{policy.category}</p>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{policy.content || 'No content'}</p>
                <span className="text-xs text-gray-400">{formatDate(policy.updatedAt || policy.createdAt)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Policy' : 'New Policy'} size="lg"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Policy Title" {...register('title')} />
          <Select label="Category" options={['GENERAL', 'CODE_OF_CONDUCT', 'LEAVE', 'ATTENDANCE', 'IT', 'SAFETY', 'OTHER']} {...register('category')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={6} {...register('content')} />
          </div>
          {canManageOrgWide && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" {...register('isOrganizationWide')} className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
              Make organization-wide (visible to all branches)
            </label>
          )}
        </div>
      </Modal>
    </div>
  )
}
