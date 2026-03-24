import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMeetings, createMeeting, deleteMeeting,
  selectMeetings, selectLoading
} from './performanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function MeetingsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const meetings = useSelector(selectMeetings)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchMeetings()) }, [dispatch])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this meeting?')) return
    try { await dispatch(deleteMeeting(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(createMeeting({
        title: formData.title,
        date: formData.date,
        response: formData.response,
        manager: formData.managerId ? { id: Number(formData.managerId) } : null,
        company: { id: user?.companyId },
      })).unwrap()
      toast.success('Meeting created')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'date', header: 'Date/Time', cell: ({ getValue }) => getValue() ? new Date(getValue()).toLocaleString() : '—' },
    { id: 'manager', header: 'Manager', cell: ({ row }) => {
      const m = row.original.manager
      return m ? `${m.firstName || ''} ${m.lastName || ''}`.trim() || '—' : '—'
    }},
    { id: 'participants', header: 'Participants', cell: ({ row }) => row.original.participants?.length ?? 0 },
    { accessorKey: 'response', header: 'Response', cell: ({ getValue }) => <span className="max-w-xs truncate block">{getValue() || '—'}</span> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Meetings" subtitle="Schedule and track team meetings"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ New Meeting</Button>} />
      <DataTable columns={columns} data={meetings} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Meeting"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Input label="Date & Time" type="datetime-local" {...register('date')} />
          <Input label="Manager ID (optional)" {...register('managerId')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Response / Notes</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('response')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
