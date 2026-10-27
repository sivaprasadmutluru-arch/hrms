import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMeetings, createMeeting, deleteMeeting,
  selectMeetings, selectLoading
} from './performanceSlice'
import api from '../../services/api'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function MeetingsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const meetings = useSelector(selectMeetings)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchMeetings()) }, [dispatch])

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteMeeting(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const openEdit = (meeting) => {
    setEditTarget(meeting)
    reset({
      title: meeting.title,
      date: meeting.date,
      managerId: meeting.manager?.id,
      response: meeting.response,
    })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    const payload = {
      title: formData.title,
      date: formData.date,
      response: formData.response,
      manager: formData.managerId ? { id: Number(formData.managerId) } : null,
      company: { id: user?.companyId },
    }
    try {
      if (editTarget) {
        await api.put(`/performance/meetings/${editTarget.id}`, payload)
        toast.success('Meeting updated')
        setEditTarget(null)
        dispatch(fetchMeetings())
      } else {
        await dispatch(createMeeting(payload)).unwrap()
        toast.success('Meeting created')
      }
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
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="performance-workspace">
      <PageHeader title="Meetings" subtitle="Schedule and track team meetings"
        actions={<Button onClick={() => { setEditTarget(null); reset(); setModalOpen(true) }}>+ New Meeting</Button>} />
      <div className="performance-table"><DataTable columns={columns} data={meetings} loading={loading} /></div>
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Delete Meeting"
        message="Are you sure you want to delete this meeting? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Meeting' : 'Create Meeting'} panelClassName="performance-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Create'}</Button>
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
