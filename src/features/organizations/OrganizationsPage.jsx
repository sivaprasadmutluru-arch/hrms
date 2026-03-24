import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchAll, create, update, selectAll, selectLoading, selectPagination } from './organizationsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import { STATUS_COLORS } from '../../config/constants'
import api from '../../services/api'

export default function OrganizationsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const data = useSelector(selectAll)
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
      if (editing) { await dispatch(update({ id: editing.id, data: formData })).unwrap(); toast.success('Organization updated') }
      else { await dispatch(create(formData)).unwrap(); toast.success('Organization created') }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const toggleStatus = async (org) => {
    try {
      const action = org.status === 'ACTIVE' ? 'suspend' : 'activate'
      await api.post(`/organizations/${org.id}/${action}`)
      toast.success(`Organization ${action}d`)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch { toast.error('Action failed') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'contactEmail', header: 'Email' },
    { accessorKey: 'contactPhone', header: 'Phone' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Active'} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'success'} /> },
    { id: 'actions', header: 'Actions', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="ghost" onClick={() => navigate(`/organizations/${row.original.id}/subscription`)}>Subscription</Button>
        <Button size="sm" variant={row.original.status === 'ACTIVE' ? 'danger' : 'success'} onClick={() => toggleStatus(row.original)}>
          {row.original.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
        </Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Organizations" subtitle="Manage all platform organizations" actions={<Button onClick={openCreate}>+ New Organization</Button>} />
      <DataTable columns={columns} data={data} loading={loading} />
      <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Organization' : 'New Organization'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Input label="Contact Email" type="email" {...register('contactEmail')} />
          <Input label="Contact Phone" {...register('contactPhone')} />
          <Select label="Subscription Plan" options={['BASIC', 'STANDARD', 'ENTERPRISE']} {...register('subscriptionPlan')} />
        </div>
      </Modal>
    </div>
  )
}
