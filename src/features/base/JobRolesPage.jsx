import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchJobPositions, selectJobPositions,
  fetchJobRoles, createJobRole, updateJobRole, deleteJobRole, selectJobRoles,
} from './baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function JobRolesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const jobRoles = useSelector(selectJobRoles)
  const jobPositions = useSelector(selectJobPositions)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchJobRoles())
    dispatch(fetchJobPositions())
  }, [dispatch])

  const jobPositionOptions = jobPositions.map(p => ({ value: p.id, label: p.name }))

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); setModalOpen(true) }

  useEffect(() => {
    if (!modalOpen) return
    if (editing) {
      reset({ name: editing.name, jobPositionId: editing.jobPosition?.id })
    } else {
      reset({})
    }
  }, [modalOpen, editing])

  const onSubmit = async (data) => {
    const payload = {
      name: data.name,
      jobPosition: data.jobPositionId ? { id: Number(data.jobPositionId) } : undefined,
      company: user?.companyId ? { id: user.companyId } : undefined,
    }
    try {
      if (editing) {
        await dispatch(updateJobRole({ id: editing.id, data: payload })).unwrap()
        toast.success('Job role updated')
      } else {
        await dispatch(createJobRole(payload)).unwrap()
        toast.success('Job role created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteJobRole(deleteTarget.id)).unwrap()
      toast.success('Job role deleted')
      setDeleteTarget(null)
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Job Role' },
    { id: 'jobPosition', header: 'Job Position', cell: ({ row }) => row.original.jobPosition?.name || '—' },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader title="Job Roles" subtitle="Manage job roles" actions={<Button onClick={openCreate}>+ New Role</Button>} />
      <DataTable columns={columns} data={jobRoles} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Job Role' : 'New Job Role'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Select
            label="Job Position"
            options={[{ value: '', label: 'Select job position...' }, ...jobPositionOptions]}
            error={errors.jobPositionId?.message}
            {...register('jobPositionId', { required: 'Required' })}
          />
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Job Role" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" />
    </div>
  )
}
