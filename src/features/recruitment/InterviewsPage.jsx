import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchInterviews, createInterview, completeInterview, deleteInterview,
  selectInterviews, selectLoading
} from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import { formatDate } from '../../utils/formatters'
import useAuth from '../../hooks/useAuth'

export default function InterviewsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const interviews = useSelector(selectInterviews)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchInterviews()) }, [dispatch])

  const handleComplete = async (id) => {
    try { await dispatch(completeInterview(id)).unwrap(); toast.success('Marked as completed') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this interview?')) return
    try { await dispatch(deleteInterview(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(createInterview({
        candidate: { id: Number(formData.candidateId) },
        interviewDate: formData.interviewDate,
        interviewTime: formData.interviewTime,
        description: formData.description,
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Interview scheduled')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { id: 'candidate', header: 'Candidate', cell: ({ row }) => row.original.candidate?.name || '—' },
    { accessorKey: 'interviewDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'interviewTime', header: 'Time', cell: ({ getValue }) => getValue() || '—' },
    { id: 'interviewers', header: 'Interviewers', cell: ({ row }) => row.original.interviewers?.length ?? 0 },
    { accessorKey: 'description', header: 'Notes', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { accessorKey: 'completed', header: 'Status', cell: ({ getValue }) => (
      <Badge label={getValue() ? 'Completed' : 'Scheduled'} variant={getValue() ? 'success' : 'warning'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        {!row.original.completed && (
          <Button size="sm" variant="success" onClick={() => handleComplete(row.original.id)}>Complete</Button>
        )}
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Interviews" subtitle="Schedule and manage candidate interviews"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ Schedule Interview</Button>} />
      <DataTable columns={columns} data={interviews} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Schedule Interview"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Schedule</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Candidate ID" error={errors.candidateId?.message} {...register('candidateId', { required: 'Required' })} />
          <Input label="Interview Date" type="date" error={errors.interviewDate?.message} {...register('interviewDate', { required: 'Required' })} />
          <Input label="Interview Time" type="time" {...register('interviewTime')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
