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
import useAuth from '../../hooks/useAuth'

export default function HelpdeskPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { user } = useAuth()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const [modalOpen, setModalOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])

  const onSubmit = async (formData) => {
    try {
      await dispatch(create({ ...formData, company: { id: user?.companyId } })).unwrap()
      toast.success('Ticket created')
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'id', header: '#', cell: ({ getValue }) => <span className="font-mono text-xs text-gray-500">#{getValue()}</span> },
    { accessorKey: 'title', header: 'Subject', cell: ({ getValue }) => <span className="font-medium">{getValue()}</span> },
    { accessorKey: 'priority', header: 'Priority', cell: ({ getValue }) => <Badge label={getValue() || 'MEDIUM'} variant={getValue() === 'HIGH' || getValue() === 'URGENT' ? 'danger' : 'warning'} /> },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Open'} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'warning'} /> },
    { accessorKey: 'createdAt', header: 'Created', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="secondary" onClick={() => navigate(`/helpdesk/${row.original.id}`)}>View</Button> },
  ]

  const visibleOpen = data.filter(ticket => !['RESOLVED', 'CLOSED'].includes(ticket.status)).length
  const visibleUrgent = data.filter(ticket => ['HIGH', 'URGENT'].includes(ticket.priority)).length
  const visibleResolved = data.filter(ticket => ticket.status === 'RESOLVED' || ticket.status === 'CLOSED').length

  return (
    <div className="support-workspace helpdesk-workspace">
      <PageHeader title="Helpdesk" subtitle="Support tickets and requests"
        actions={<><SearchInput className="support-search" /><Button onClick={() => { reset({}); setModalOpen(true) }}>+ New Ticket</Button></>} />
      <div className="support-metrics" aria-label="Ticket summary for this page">
        <div className="support-metric support-metric-open"><span>Open tickets <small>this page</small></span><strong>{visibleOpen}</strong></div>
        <div className="support-metric support-metric-urgent"><span>Priority attention <small>high / urgent</small></span><strong>{visibleUrgent}</strong></div>
        <div className="support-metric support-metric-done"><span>Resolved <small>this page</small></span><strong>{visibleResolved}</strong></div>
      </div>
      <div className="support-table"><DataTable columns={columns} data={data} loading={loading} /></div>
      <div className="support-pagination"><Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} /></div>
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Support Ticket" size="lg" panelClassName="support-form-modal"
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>Submit</Button></div>}>
        <div className="support-form">
          <Input label="Subject" error={errors.subject?.message} {...register('subject', { required: 'Required' })} />
          <Select label="Priority" options={TICKET_PRIORITIES} {...register('priority')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" rows={4} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
