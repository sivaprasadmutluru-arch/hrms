import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAccessibilities, createAccessibility, updateAccessibility, deleteAccessibility,
  selectAccessibilities, selectAccessibilityLoading
} from './accessibilitySlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'

export default function AccessibilityPage() {
  const dispatch = useDispatch()
  const items = useSelector(selectAccessibilities)
  const loading = useSelector(selectAccessibilityLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAccessibilities()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({
      feature: row.feature,
      filter: row.filter,
      excludeAll: row.excludeAll,
      enabled: row.enabled,
    })
    setModalOpen(true)
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteAccessibility(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      excludeAll: data.excludeAll === true || data.excludeAll === 'true',
      enabled: data.enabled === true || data.enabled === 'true',
    }
    try {
      if (editing) {
        await dispatch(updateAccessibility({ id: editing.id, data: payload })).unwrap()
        toast.success('Updated')
      } else {
        await dispatch(createAccessibility(payload)).unwrap()
        toast.success('Created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'feature', header: 'Feature' },
    { accessorKey: 'filter', header: 'Filter', cell: ({ getValue }) => (
      <span className="max-w-xs truncate block text-xs text-gray-500">{getValue() || '—'}</span>
    )},
    { accessorKey: 'excludeAll', header: 'Exclude All', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { accessorKey: 'enabled', header: 'Enabled', cell: ({ getValue }) => (
      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getValue() ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
        {getValue() ? 'Enabled' : 'Disabled'}
      </span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Default Accessibility" subtitle="Configure feature access and visibility rules"
        actions={<Button onClick={openCreate}>+ Add Rule</Button>} />
      <DataTable columns={columns} data={items} loading={loading} />
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Accessibility Rule"
        message="Are you sure you want to delete this accessibility rule? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Accessibility Rule' : 'New Accessibility Rule'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Feature" error={errors.feature?.message}
            placeholder="e.g. attendance, leave, payroll"
            {...register('feature', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Filter (JSON)</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3}
              placeholder='{"department": "HR"}'
              {...register('filter')}
            />
          </div>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('excludeAll')} className="rounded" />
              Exclude All
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('enabled')} className="rounded" />
              Enabled
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
