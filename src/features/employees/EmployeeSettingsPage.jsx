import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchEmployeeTags, createEmployeeTag, updateEmployeeTag, deleteEmployeeTag,
  fetchActionTypes, createActionType, updateActionType, deleteActionType,
  fetchEmployeeSettings, upsertEmployeeSettings,
  fetchProfileFeatures, upsertProfileFeature,
  selectEmployeeTags, selectActionTypes, selectEmployeeSettings, selectProfileFeatures, selectLoading,
} from './employeeExtrasSlice'
import {
  fetchEmployeeTypes, createEmployeeType, updateEmployeeType, deleteEmployeeType,
  selectEmployeeTypes,
} from '../base/baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

const TABS = ['General', 'Employee Types', 'Tags', 'Action Types', 'Profile Features']

const PROFILE_FIELDS = ['phone', 'address', 'profile_image', 'bank_details', 'emergency_contact', 'date_of_birth']

export default function EmployeeSettingsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const loading = useSelector(selectLoading)
  const employeeTypes = useSelector(selectEmployeeTypes)
  const tags = useSelector(selectEmployeeTags)
  const actionTypes = useSelector(selectActionTypes)
  const employeeSettings = useSelector(selectEmployeeSettings)
  const profileFeatures = useSelector(selectProfileFeatures)

  const [tab, setTab] = useState('General')
  const [typeModal, setTypeModal] = useState(false)
  const [editingType, setEditingType] = useState(null)
  const [tagModal, setTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState(null)
  const [actionModal, setActionModal] = useState(false)
  const [editingAction, setEditingAction] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })

  const { register: regSettings, handleSubmit: handleSettings, reset: resetSettings } = useForm()
  const { register: regType, handleSubmit: handleType, reset: resetType, formState: { errors: errType } } = useForm()
  const { register: regTag, handleSubmit: handleTag, reset: resetTag, formState: { errors: errTag } } = useForm()
  const { register: regAction, handleSubmit: handleAction, reset: resetAction, formState: { errors: errAction } } = useForm()

  useEffect(() => {
    if (!companyId) return
    dispatch(fetchEmployeeTypes())
    dispatch(fetchEmployeeTags(companyId))
    dispatch(fetchActionTypes(companyId))
    dispatch(fetchEmployeeSettings(companyId))
    dispatch(fetchProfileFeatures(companyId))
  }, [dispatch, companyId])

  useEffect(() => {
    if (employeeSettings) resetSettings({
      showBadgeId: employeeSettings.showBadgeId,
      allowProfileView: employeeSettings.allowProfileView,
      contractWarningDays: employeeSettings.contractWarningDays,
    })
  }, [employeeSettings, resetSettings])

  const onSaveSettings = async (data) => {
    try {
      await dispatch(upsertEmployeeSettings({ companyId, data })).unwrap()
      toast.success('Settings saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  const openCreateType = () => { setEditingType(null); resetType({}); setTypeModal(true) }
  const openEditType = (t) => { setEditingType(t); resetType({ name: t.name, description: t.description }); setTypeModal(true) }
  const onSubmitType = async (data) => {
    try {
      if (editingType) {
        await dispatch(updateEmployeeType({ id: editingType.id, data })).unwrap()
        toast.success('Employee type updated')
      } else {
        await dispatch(createEmployeeType({ ...data, company: { id: companyId } })).unwrap()
        toast.success('Employee type created')
      }
      setTypeModal(false)
    } catch (e) { toast.error(e || 'Error') }
  }
  const handleDeleteType = (id) => {
    setConfirmModal({ open: true, id, action: 'deleteType' })
  }

  const openCreateTag = () => { setEditingTag(null); resetTag({}); setTagModal(true) }
  const openEditTag = (t) => { setEditingTag(t); resetTag({ title: t.title, color: t.color }); setTagModal(true) }
  const onSubmitTag = async (data) => {
    try {
      if (editingTag) {
        await dispatch(updateEmployeeTag({ id: editingTag.id, data })).unwrap()
        toast.success('Tag updated')
      } else {
        await dispatch(createEmployeeTag({ ...data, company: { id: companyId } })).unwrap()
        toast.success('Tag created')
      }
      setTagModal(false)
    } catch (e) { toast.error(e || 'Error') }
  }
  const handleDeleteTag = (id) => {
    setConfirmModal({ open: true, id, action: 'deleteTag' })
  }

  const openCreateAction = () => { setEditingAction(null); resetAction({}); setActionModal(true) }
  const openEditAction = (a) => { setEditingAction(a); resetAction({ title: a.title, description: a.description }); setActionModal(true) }
  const onSubmitAction = async (data) => {
    try {
      if (editingAction) {
        await dispatch(updateActionType({ id: editingAction.id, data })).unwrap()
        toast.success('Action type updated')
      } else {
        await dispatch(createActionType({ ...data, company: { id: companyId } })).unwrap()
        toast.success('Action type created')
      }
      setActionModal(false)
    } catch (e) { toast.error(e || 'Error') }
  }
  const handleDeleteAction = (id) => {
    setConfirmModal({ open: true, id, action: 'deleteAction' })
  }

  const onConfirmDelete = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'deleteType') await dispatch(deleteEmployeeType(id)).unwrap()
      else if (action === 'deleteTag') await dispatch(deleteEmployeeTag(id)).unwrap()
      else if (action === 'deleteAction') await dispatch(deleteActionType(id)).unwrap()
      toast.success('Deleted')
      setConfirmModal({ open: false, id: null, action: null })
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleToggleFeature = async (featureName, current) => {
    try {
      await dispatch(upsertProfileFeature({ companyId, data: { featureName, isEditable: !current } })).unwrap()
      dispatch(fetchProfileFeatures(companyId))
      toast.success('Feature updated')
    } catch (e) { toast.error(e || 'Error') }
  }

  const typeColumns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditType(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteType(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const tagColumns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'color', header: 'Color', cell: ({ getValue }) => getValue() ? <span className="inline-block w-4 h-4 rounded" style={{ backgroundColor: getValue() }} /> : '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditTag(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteTag(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const actionColumns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditAction(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteAction(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Employee Settings" subtitle="General settings, tags, action types, and profile features" />

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'General' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg space-y-4">
          <h3 className="text-base font-semibold text-gray-800">General Settings</h3>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="showBadgeId" {...regSettings('showBadgeId')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="showBadgeId" className="text-sm text-gray-700">Show Badge ID on profiles</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="allowProfileView" {...regSettings('allowProfileView')} className="h-4 w-4 text-indigo-600 rounded" />
            <label htmlFor="allowProfileView" className="text-sm text-gray-700">Allow employees to view each other's profiles</label>
          </div>
          <Input label="Contract Warning Days" type="number" {...regSettings('contractWarningDays', { valueAsNumber: true })} />
          <div className="flex justify-end">
            <Button onClick={handleSettings(onSaveSettings)} disabled={loading}>Save</Button>
          </div>
        </div>
      )}

      {tab === 'Employee Types' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateType}>+ Add Employee Type</Button>
          </div>
          <DataTable columns={typeColumns} data={employeeTypes} loading={loading} />
          <Modal open={typeModal} onClose={() => setTypeModal(false)} title={editingType ? 'Edit Employee Type' : 'Add Employee Type'}
            footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setTypeModal(false)}>Cancel</Button><Button onClick={handleType(onSubmitType)}>{editingType ? 'Update' : 'Create'}</Button></div>}>
            <div className="space-y-4">
              <Input label="Name" error={errType.name?.message} {...regType('name', { required: 'Required' })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} {...regType('description')} />
              </div>
            </div>
          </Modal>
        </div>
      )}

      {tab === 'Tags' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateTag}>+ Add Tag</Button>
          </div>
          <DataTable columns={tagColumns} data={tags} loading={loading} />
          <Modal open={tagModal} onClose={() => setTagModal(false)} title={editingTag ? 'Edit Tag' : 'Add Tag'}
            footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setTagModal(false)}>Cancel</Button><Button onClick={handleTag(onSubmitTag)}>{editingTag ? 'Update' : 'Create'}</Button></div>}>
            <div className="space-y-4">
              <Input label="Title" error={errTag.title?.message} {...regTag('title', { required: 'Required' })} />
              <Input label="Color (hex)" placeholder="#4f46e5" {...regTag('color')} />
            </div>
          </Modal>
        </div>
      )}

      {tab === 'Action Types' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={openCreateAction}>+ Add Action Type</Button>
          </div>
          <DataTable columns={actionColumns} data={actionTypes} loading={loading} />
          <Modal open={actionModal} onClose={() => setActionModal(false)} title={editingAction ? 'Edit Action Type' : 'Add Action Type'}
            footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setActionModal(false)}>Cancel</Button><Button onClick={handleAction(onSubmitAction)}>{editingAction ? 'Update' : 'Create'}</Button></div>}>
            <div className="space-y-4">
              <Input label="Title" error={errAction.title?.message} {...regAction('title', { required: 'Required' })} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={3} {...regAction('description')} />
              </div>
            </div>
          </Modal>
        </div>
      )}

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, action: null })}
        onConfirm={onConfirmDelete}
        title={
          confirmModal.action === 'deleteType' ? 'Delete Employee Type' :
          confirmModal.action === 'deleteTag' ? 'Delete Tag' :
          'Delete Action Type'
        }
        message={
          confirmModal.action === 'deleteType'
            ? 'Are you sure you want to delete this employee type? This action cannot be undone.'
            : confirmModal.action === 'deleteTag'
            ? 'Are you sure you want to delete this tag? This action cannot be undone.'
            : 'Are you sure you want to delete this action type? This action cannot be undone.'
        }
        confirmLabel="Delete"
        loading={loading}
      />

      {tab === 'Profile Features' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <h3 className="text-base font-semibold text-gray-800 mb-4">Employee Self-Edit Features</h3>
          <div className="space-y-3">
            {PROFILE_FIELDS.map(field => {
              const feature = profileFeatures.find(f => f.featureName === field)
              const isEditable = feature?.isEditable ?? false
              return (
                <div key={field} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 capitalize">{field.replace(/_/g, ' ')}</span>
                  <button onClick={() => handleToggleFeature(field, isEditable)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isEditable ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isEditable ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
