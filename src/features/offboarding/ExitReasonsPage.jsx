import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchExitReasons, createExitReason, deleteExitReason,
  selectExitReasons, selectLoading
} from './offboardingSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

export default function ExitReasonsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const exitReasons = useSelector(selectExitReasons)
  const loading = useSelector(selectLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchExitReasons()) }, [dispatch])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this exit reason?')) return
    try { await dispatch(deleteExitReason(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(createExitReason({ ...data, company: { id: user?.companyId } })).unwrap()
      toast.success('Exit reason created')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => (
      <span className="max-w-xs truncate block">{getValue() || '—'}</span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Exit Reasons" subtitle="Reasons for employee exits"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ Add Reason</Button>} />
      <DataTable columns={columns} data={exitReasons} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Exit Reason"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
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
