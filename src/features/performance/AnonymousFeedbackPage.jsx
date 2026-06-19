import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAnonymousFeedback, createAnonymousFeedback, deleteAnonymousFeedback,
  selectAnonymousFeedback, selectLoading
} from './performanceSlice'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
import { STATUS_COLORS } from '../../config/constants'
import useAuth from '../../hooks/useAuth'

const BASED_ON_OPTIONS = [
  { value: 'GENERAL', label: 'General' },
  { value: 'EMPLOYEE', label: 'Employee' },
  { value: 'DEPARTMENT', label: 'Department' },
  { value: 'JOB_POSITION', label: 'Job Position' },
]

export default function AnonymousFeedbackPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const feedbacks = useSelector(selectAnonymousFeedback)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAnonymousFeedback()) }, [dispatch])

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteAnonymousFeedback(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const openEdit = (feedback) => {
    setEditTarget(feedback)
    reset({
      feedbackSubject: feedback.feedbackSubject,
      basedOn: feedback.basedOn,
      feedbackDescription: feedback.feedbackDescription,
    })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      if (editTarget) {
        await api.put(`/performance/anonymous-feedback/${editTarget.id}`, { ...formData, company: { id: user?.companyId } })
        toast.success('Feedback updated')
        setEditTarget(null)
        dispatch(fetchAnonymousFeedback())
      } else {
        await dispatch(createAnonymousFeedback({ ...formData, company: { id: user?.companyId } })).unwrap()
        toast.success('Feedback submitted')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'feedbackSubject', header: 'Subject' },
    { accessorKey: 'basedOn', header: 'Based On' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => (
      <Badge label={getValue()} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} />
    )},
    { accessorKey: 'feedbackDescription', header: 'Description', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { accessorKey: 'archive', header: 'Archived', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Anonymous Feedback" subtitle="Submit and view anonymous feedback"
        actions={<Button onClick={() => { setEditTarget(null); reset(); setModalOpen(true) }}>+ Submit Feedback</Button>} />
      <DataTable columns={columns} data={feedbacks} loading={loading} />
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Feedback"
        message="Are you sure you want to delete this feedback? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Feedback' : 'Submit Anonymous Feedback'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Submit'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Subject" error={errors.feedbackSubject?.message} {...register('feedbackSubject', { required: 'Required' })} />
          <Select label="Based On" options={BASED_ON_OPTIONS} {...register('basedOn')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={4} {...register('feedbackDescription')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
