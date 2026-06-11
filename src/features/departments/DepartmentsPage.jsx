import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchAll, create, update, remove, selectAll, selectLoading, selectPagination } from './departmentsSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function DepartmentsPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchAll({ page: 0, size: 20 })) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({ managerId: user?.employeeId ?? '' }); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({ name: row.name, managerId: row.manager?.id })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    const companyId = effectiveCompanyId
    try {
      if (editing) {
        await dispatch(update({
          id: editing.id,
          data: { name: formData.name },
          params: { managerId: formData.managerId || undefined },
        })).unwrap()
        toast.success('Department updated')
      } else {
        await dispatch(create({
          body: { name: formData.name },
          params: { companyId, managerId: formData.managerId || undefined },
        })).unwrap()
        toast.success('Department created')
      }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(remove(deleteTarget.id)).unwrap()
      toast.success('Department removed')
      setDeleteTarget(null)
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Department Name' },
    { id: 'manager', header: 'Manager', cell: ({ row }) => {
      const m = row.original.manager
      return m ? `${m.firstName || ''} ${m.lastName || ''}`.trim() || '—' : '—'
    }},
    { id: 'status', header: 'Status', cell: ({ row }) => (
      <Badge label={row.original.isActive === false ? 'Inactive' : 'Active'} variant={row.original.isActive === false ? 'danger' : 'success'} />
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Departments" subtitle="Manage company departments" actions={<Button onClick={openCreate}>+ New Department</Button>} />
      <DataTable columns={columns} data={data} loading={loading} />
      <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Department' : 'New Department'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Department Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Input label="Manager ID (optional)" {...register('managerId')} />
        </div>
      </Modal>
      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Department" message={`Delete department "${deleteTarget?.name}"? This cannot be undone.`} confirmLabel="Delete" />
    </div>
  )
}
