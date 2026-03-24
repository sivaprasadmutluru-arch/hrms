import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, selectAll, selectLoading, selectPagination } from './performanceSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import Pagination from '../../components/common/Pagination'
import { formatDate } from '../../utils/formatters'

export default function PerformanceCyclesPage() {
  const dispatch = useDispatch()
  const cycles = useSelector(selectAll)
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
      if (editing) { await dispatch(update({ id: editing.id, data: formData })).unwrap(); toast.success('Cycle updated') }
      else { await dispatch(create(formData)).unwrap(); toast.success('Cycle created') }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Cycle Name' },
    { accessorKey: 'type', header: 'Type' },
    { accessorKey: 'startDate', header: 'Start', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'endDate', header: 'End', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Active'} variant={getValue() === 'COMPLETED' ? 'success' : getValue() === 'ACTIVE' ? 'primary' : 'warning'} /> },
    { id: 'actions', header: '', cell: ({ row }) => <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button> },
  ]

  return (
    <div>
      <PageHeader title="Performance Cycles" subtitle="Manage appraisal and review cycles" actions={<Button onClick={openCreate}>+ New Cycle</Button>} />
      <DataTable columns={columns} data={cycles} loading={loading} />
      <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Cycle' : 'New Cycle'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Cycle Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Select label="Type" options={['ANNUAL', 'SEMI_ANNUAL', 'QUARTERLY', 'MONTHLY']} {...register('type')} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" {...register('startDate')} />
            <Input label="End Date" type="date" {...register('endDate')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}
