import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, selectAll, selectLoading, selectPagination } from './helpdeskSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import SearchInput from '../../components/common/SearchInput'
import { formatDate } from '../../utils/formatters'
import { STATUS_COLORS, TICKET_PRIORITIES } from '../../config/constants'

export default function HelpdeskPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])

  const onSubmit = async (formData) => {
    try { await dispatch(create(formData)).unwrap(); toast.success('Ticket created'); setModalOpen(false); dispatch(fetchAll({ page: 0, size: 20 })) }
    catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'ticketNumber', header: '#', cell: ({ getValue }) => <span className="font-mono text-xs text-gray-500">{getValue()}</span> },
    { accessorKey: 'subject', header: 'Subject', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'priority', header: 'Priority', cell: ({ getValue }) => <Badge label={getValue() || 'MEDIUM'} variant={getValue() === 'HIGH' || getValue() === 'URGENT' ? 'danger' : 'warning'} /> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Open'} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'warning'} /> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="secondary" onClick={() => navigate(`/helpdesk/${row.original.id}`)}>View</Button> },
  ]

  return (
    <div>
      <PageHeader title="Helpdesk" subtitle="Support tickets and requests"
        actions={<><SearchInput className="w-48" /><Button onClick={() => { reset({}); setModalOpen(true) }}>+ New Ticket</Button></>} />
      <DataTable columns={columns} data={data} loading={loading} />
      <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Support Ticket" size="lg"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>Submit</Button></div>}>
        <div className="space-y-4">
          <Input label="Subject" error={errors.subject?.message} {...register('subject', { required: 'Required' })} />
          <div className="grid grid-cols-2 gap-4">
            <Select label="Priority" options={TICKET_PRIORITIES} {...register('priority')} />
            <Select label="Category" options={['IT', 'HR', 'PAYROLL', 'FACILITIES', 'OTHER']} {...register('category')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={4} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
