import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchJobPositions, createJobPosition, updateJobPosition, deleteJobPosition, selectJobPositions,
} from './baseExtrasSlice'
import { fetchAll as fetchDepartments, selectAll as selectDepartments } from '../departments/departmentsSlice'
import Button from '../../components/common/Button'
import SetupDirectory from '../../components/common/SetupDirectory'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Select from '../../components/common/Select'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'
import { BriefcaseBusiness, Building2 } from 'lucide-react'

export default function JobPositionsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const jobPositions = useSelector(selectJobPositions)
  const departments = useSelector(selectDepartments)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchJobPositions())
    dispatch(fetchDepartments({ page: 0, size: 100 }))
  }, [dispatch])

  const departmentOptions = departments.map(d => ({ value: d.id, label: d.name }))

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); setModalOpen(true) }

  useEffect(() => {
    if (!modalOpen) return
    if (editing) {
      reset({ name: editing.name, departmentId: editing.department?.id })
    } else {
      reset({})
    }
  }, [modalOpen, editing])

  const onSubmit = async (data) => {
    const payload = {
      name: data.name,
      department: data.departmentId ? { id: Number(data.departmentId) } : undefined,
      company: user?.companyId ? { id: user.companyId } : undefined,
    }
    try {
      if (editing) {
        await dispatch(updateJobPosition({ id: editing.id, data: payload })).unwrap()
        toast.success('Job position updated')
      } else {
        await dispatch(createJobPosition(payload)).unwrap()
        toast.success('Job position created')
      }
      setModalOpen(false)
      dispatch(fetchJobPositions())
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteJobPosition(deleteTarget.id)).unwrap()
      toast.success('Job position deleted')
      setDeleteTarget(null)
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Job Position', cell: ({ row }) => <span className="setup-name-cell"><i><BriefcaseBusiness size={16} /></i><b>{row.original.name}</b></span> },
    { id: 'department', header: 'Department', cell: ({ row }) => <span className="setup-related-cell"><Building2 size={15} />{row.original.department?.name || 'Unassigned'}</span> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex gap-2 setup-table-actions">
          <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => setDeleteTarget(row.original)}>Delete</Button>
        </div>
      ),
    },
  ]

  return (
    <>
      <SetupDirectory title="Job positions" subtitle="Define the positions your teams hire for and connect them to the right department." icon={<BriefcaseBusiness size={22} />} itemLabel="position" data={jobPositions} columns={columns} searchText={item => `${item.name || ''} ${item.department?.name || ''}`} action={<Button className="setup-primary-button" onClick={openCreate}>+ New position</Button>} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg" panelClassName="setup-form-modal" title={editing ? 'Edit job position' : 'New job position'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <div className="space-y-4">
          <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Select
            label="Department"
            options={[{ value: '', label: 'Select department...' }, ...departmentOptions]}
            error={errors.departmentId?.message}
            {...register('departmentId', { required: 'Required' })}
          />
        </div>
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Job Position" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" />
    </>
  )
}
