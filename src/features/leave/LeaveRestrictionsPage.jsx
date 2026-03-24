import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchLeaveRestrictions, createLeaveRestriction, updateLeaveRestriction,
  deleteLeaveRestriction, fetchPastLeaveRestrict, upsertPastLeaveRestrict,
  selectLeaveRestrictions, selectLoading, selectPastLeaveRestrict
} from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

const TABS = ['Date Restrictions', 'Past Leave Restrict']

export default function LeaveRestrictionsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const restrictions = useSelector(selectLeaveRestrictions)
  const pastRestrict = useSelector(selectPastLeaveRestrict)
  const loading = useSelector(selectLoading)

  const [tab, setTab] = useState('Date Restrictions')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchLeaveRestrictions())
    if (user?.companyId) dispatch(fetchPastLeaveRestrict(user.companyId))
  }, [dispatch, user?.companyId])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({ title: row.title, startDate: row.startDate, endDate: row.endDate, description: row.description })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      if (editing) {
        await dispatch(updateLeaveRestriction({ id: editing.id, data: formData })).unwrap()
        toast.success('Restriction updated')
      } else {
        await dispatch(createLeaveRestriction(formData)).unwrap()
        toast.success('Restriction created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this restriction?')) return
    try {
      await dispatch(deleteLeaveRestriction(id)).unwrap()
      toast.success('Restriction deleted')
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleTogglePastRestrict = async (enabled) => {
    try {
      await dispatch(upsertPastLeaveRestrict({ companyId: user?.companyId, data: { enabled } })).unwrap()
      toast.success('Setting saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'startDate', header: 'Start Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'endDate', header: 'End Date', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'department', header: 'Department', cell: ({ row }) => row.original.department?.name || 'All' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Leave Restrictions" subtitle="Date restrictions and past leave controls"
        actions={tab === 'Date Restrictions' && <Button onClick={openCreate}>+ Add Restriction</Button>} />

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Date Restrictions' && (
        <DataTable columns={columns} data={restrictions} loading={loading} />
      )}

      {tab === 'Past Leave Restrict' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Employee Past Leave Restriction</h3>
          <p className="text-sm text-gray-500 mb-4">
            When enabled, employees cannot request leave for past dates.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700">
              Status: <strong>{pastRestrict?.enabled ? 'Enabled' : 'Disabled'}</strong>
            </span>
            <Button
              variant={pastRestrict?.enabled ? 'danger' : 'success'}
              onClick={() => handleTogglePastRestrict(!pastRestrict?.enabled)}
            >
              {pastRestrict?.enabled ? 'Disable' : 'Enable'}
            </Button>
          </div>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Restriction' : 'Add Restriction'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Input label="Start Date" type="date" error={errors.startDate?.message} {...register('startDate', { required: 'Required' })} />
          <Input label="End Date" type="date" error={errors.endDate?.message} {...register('endDate', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
