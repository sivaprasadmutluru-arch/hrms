import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { fetchAll, create, update, assign, returnAsset, selectAll, selectLoading, selectPagination } from './assetsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import { formatDate } from '../../utils/formatters'

export default function AssetsPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const [modalOpen, setModalOpen] = useState(false)
  const [assignModal, setAssignModal] = useState(null)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: regAssign, handleSubmit: handleAssignSubmit, reset: resetAssign } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); reset(row); setModalOpen(true) }
  const openAssign = (row) => { setAssignModal(row); resetAssign({}) }

  const onSubmit = async (formData) => {
    try {
      if (editing) { await dispatch(update({ id: editing.id, data: formData })).unwrap(); toast.success('Asset updated') }
      else { await dispatch(create(formData)).unwrap(); toast.success('Asset created') }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const onAssign = async (formData) => {
    try { await dispatch(assign({ id: assignModal.id, data: formData })).unwrap(); toast.success('Asset assigned'); setAssignModal(null); dispatch(fetchAll({ page: 0, size: 20 })) }
    catch (e) { toast.error(e || 'Error') }
  }

  const handleReturn = async (id) => {
    try { await dispatch(returnAsset(id)).unwrap(); toast.success('Asset returned'); dispatch(fetchAll({ page: 0, size: 20 })) }
    catch { toast.error('Failed') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Asset Name' },
    { accessorKey: 'assetTag', header: 'Tag' },
    { accessorKey: 'category', header: 'Category' },
    { accessorKey: 'assignedTo', header: 'Assigned To', cell: ({ getValue }) => getValue() || <span className="text-gray-400">Unassigned</span> },
    { accessorKey: 'purchaseDate', header: 'Purchased', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Available'} variant={getValue() === 'ASSIGNED' ? 'primary' : getValue() === 'MAINTENANCE' ? 'warning' : 'success'} /> },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => navigate(`/assets/${row.original.id}`)}>Details</Button>
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        {row.original.status !== 'ASSIGNED' && <Button size="sm" variant="primary" onClick={() => openAssign(row.original)}>Assign</Button>}
        {row.original.status === 'ASSIGNED' && <Button size="sm" variant="ghost" onClick={() => handleReturn(row.original.id)}>Return</Button>}
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Asset Inventory" subtitle="Track and manage company assets" actions={<Button onClick={openCreate}>+ New Asset</Button>} />
      <DataTable columns={columns} data={data} loading={loading} />
      <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Asset' : 'New Asset'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Asset Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Input label="Asset Tag" {...register('assetTag')} />
          <Select label="Category" options={['LAPTOP', 'PHONE', 'VEHICLE', 'FURNITURE', 'EQUIPMENT', 'OTHER']} {...register('category')} />
          <Input label="Purchase Date" type="date" {...register('purchaseDate')} />
          <Input label="Purchase Value" type="number" {...register('purchaseValue')} />
        </div>
      </Modal>
      <Modal open={!!assignModal} onClose={() => setAssignModal(null)} title={`Assign: ${assignModal?.name}`}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAssignModal(null)}>Cancel</Button><Button onClick={handleAssignSubmit(onAssign)}>Assign</Button></div>}>
        <div className="space-y-4">
          <Input label="Employee ID" {...regAssign('employeeId')} />
          <Input label="Assignment Date" type="date" {...regAssign('assignedDate')} />
        </div>
      </Modal>
    </div>
  )
}
