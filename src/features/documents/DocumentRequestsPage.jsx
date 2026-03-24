import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDocumentRequests, createDocumentRequest, deleteDocumentRequest,
  selectDocumentRequests, selectDocumentsLoading
} from './documentsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import useAuth from '../../hooks/useAuth'

const FORMAT_OPTIONS = [
  { value: 'ANY', label: 'Any' },
  { value: 'PDF', label: 'PDF' },
  { value: 'DOCX', label: 'DOCX' },
  { value: 'XLSX', label: 'XLSX' },
  { value: 'JPG', label: 'JPG' },
  { value: 'PNG', label: 'PNG' },
]

export default function DocumentRequestsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const requests = useSelector(selectDocumentRequests)
  const loading = useSelector(selectDocumentsLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchDocumentRequests()) }, [dispatch])

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document request?')) return
    try { await dispatch(deleteDocumentRequest(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (data) => {
    try {
      await dispatch(createDocumentRequest({ ...data, company: { id: user?.companyId } })).unwrap()
      toast.success('Document request created')
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Title' },
    { accessorKey: 'documentFormat', header: 'Format', cell: ({ getValue }) => getValue() || 'ANY' },
    { accessorKey: 'maxSizeMb', header: 'Max Size (MB)', cell: ({ getValue }) => getValue() ? `${getValue()} MB` : '—' },
    { accessorKey: 'description', header: 'Description', cell: ({ getValue }) => (
      <span className="max-w-xs truncate block">{getValue() || '—'}</span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Document Requests" subtitle="Manage employee document requests"
        actions={<Button onClick={() => { reset(); setModalOpen(true) }}>+ New Request</Button>} />
      <DataTable columns={columns} data={requests} loading={loading} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Document Request"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Create</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <Select label="Format" options={FORMAT_OPTIONS} {...register('documentFormat')} />
          <Input label="Max Size (MB)" type="number" {...register('maxSizeMb')} />
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
