import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, selectLoading, selectPagination } from './recruitmentSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import { formatDate } from '../../utils/formatters'

export default function RecruitmentPostsPage() {
  const dispatch = useDispatch()
  const posts = useSelector(s => s.recruitment.posts)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); reset(row); setModalOpen(true) }

  const onSubmit = async (formData) => {
    try {
      if (editing) { await dispatch(update({ id: editing.id, data: formData })).unwrap(); toast.success('Post updated') }
      else { await dispatch(create(formData)).unwrap(); toast.success('Job post created') }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'title', header: 'Job Title' },
    { accessorKey: 'department', header: 'Department' },
    { accessorKey: 'location', header: 'Location' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'deadline', header: 'Deadline', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Open'} variant={getValue() === 'CLOSED' ? 'danger' : 'success'} /> },
    { accessorKey: 'applicantCount', header: 'Applicants' },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button> },
  ]

  return (
    <div>
      <PageHeader title="Job Posts" subtitle="Manage open positions and recruitment" actions={<Button onClick={openCreate}>+ New Post</Button>} />
      <DataTable columns={columns} data={posts} loading={loading} />
      <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Job Post' : 'New Job Post'} size="lg"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Publish'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Job Title" error={errors.title?.message} {...register('title', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Department" {...register('department')} />
            <Input label="Location" {...register('location')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Employment Type" options={['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERN']} {...register('type')} />
            <Input label="Application Deadline" type="date" {...register('deadline')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={4} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
