import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMailAutomations, fetchActiveMailAutomations, createMailAutomation, updateMailAutomation,
  toggleMailAutomation, deleteMailAutomation,
  selectMailAutomations, selectMailAutomationLoading,
} from './mailAutomationSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'

const TRIGGERS = ['ON_CREATE', 'ON_UPDATE', 'ON_DELETE']
const CHANNELS = ['EMAIL', 'NOTIFICATION', 'BOTH']

export default function MailAutomationPage() {
  const dispatch = useDispatch()
  const items = useSelector(selectMailAutomations)
  const loading = useSelector(selectMailAutomationLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const [activeOnly, setActiveOnly] = useState(false)

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    if (activeOnly) {
      dispatch(fetchActiveMailAutomations())
    } else {
      dispatch(fetchMailAutomations())
    }
  }, [dispatch, activeOnly])

  const openCreate = () => {
    setEditing(null)
    reset({ trigger: 'ON_CREATE', deliveryChannel: 'EMAIL', isActive: true })
    setModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    reset({
      title: item.title,
      model: item.model,
      trigger: item.trigger,
      mailTo: item.mailTo,
      mailDetails: item.mailDetails,
      deliveryChannel: item.deliveryChannel,
      conditionQuerystring: item.conditionQuerystring,
      isActive: item.isActive,
    })
    setModalOpen(true)
  }

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      isActive: data.isActive === true || data.isActive === 'true',
    }
    try {
      if (editing) {
        await dispatch(updateMailAutomation({ id: editing.id, data: payload })).unwrap()
        toast.success('Mail automation updated')
      } else {
        await dispatch(createMailAutomation(payload)).unwrap()
        toast.success('Mail automation created')
      }
      setModalOpen(false)
      reset()
    } catch (e) {
      toast.error(e || 'Error saving mail automation')
    }
  }

  const handleToggle = async (id) => {
    try {
      await dispatch(toggleMailAutomation(id)).unwrap()
      toast.success('Status updated')
    } catch (e) {
      toast.error(e || 'Failed to toggle')
    }
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try {
      await dispatch(deleteMailAutomation(confirmModal.id)).unwrap()
      toast.success('Deleted')
    } catch (e) {
      toast.error(e || 'Failed to delete')
    } finally {
      setConfirmModal({ open: false, id: null })
    }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'model', header: 'Model', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'trigger', header: 'Trigger', cell: ({ getValue }) => (
      <span className="text-xs font-mono bg-gray-100 px-1.5 py-0.5 rounded">{getValue() || '—'}</span>
    )},
    { accessorKey: 'deliveryChannel', header: 'Channel', cell: ({ getValue }) => (
      <span className="text-xs font-mono bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">{getValue() || '—'}</span>
    )},
    { accessorKey: 'isActive', header: 'Active', cell: ({ row }) => (
      <button
        onClick={() => handleToggle(row.original.id)}
        className={`text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
          row.original.isActive
            ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
            : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'
        }`}
      >
        {row.original.isActive ? 'Active' : 'Inactive'}
      </button>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2 justify-end">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader
        title="Mail Automation"
        subtitle="Configure automated email and notification rules triggered by system events"
        actions={
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveOnly(v => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                activeOnly
                  ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${activeOnly ? 'bg-green-500' : 'bg-gray-300'}`} />
              {activeOnly ? 'Active Only' : 'All Rules'}
            </button>
            <Button onClick={openCreate}>+ New Rule</Button>
          </div>
        }
      />

      <DataTable columns={columns} data={items} loading={loading} />

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Mail Automation"
        message="Are you sure you want to delete this automation rule? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); reset() }}
        title={editing ? 'Edit Mail Automation' : 'New Mail Automation'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); reset() }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Input
            label="Title"
            error={errors.title?.message}
            {...register('title', { required: 'Title is required' })}
          />
          <Input
            label="Model / Module"
            placeholder="e.g. Leave, Attendance, Employee"
            {...register('model')}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger</label>
              <select
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('trigger')}
              >
                {TRIGGERS.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Channel</label>
              <select
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('deliveryChannel')}
              >
                {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mail To</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
              placeholder="Recipient expression or email address"
              {...register('mailTo')}
            />
          </div>
          <Input
            label="Mail Details"
            placeholder="Subject or brief description"
            {...register('mailDetails')}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Condition (querystring)</label>
            <textarea
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={2}
              placeholder="Optional filter condition"
              {...register('conditionQuerystring')}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              {...register('isActive')}
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active</label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
