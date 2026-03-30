import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchWorkTypes, createWorkType, updateWorkType, deleteWorkType, selectWorkTypes } from './baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'

export default function WorkTypesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const workTypes = useSelector(selectWorkTypes)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchWorkTypes()) }, [dispatch])

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (row) => { setEditing(row); setModalOpen(true) }

  useEffect(() => {
    if (!modalOpen) return
    reset(editing ? { name: editing.name } : {})
  }, [modalOpen, editing])

  const onSubmit = async (data) => {
    const payload = {
      name: data.name,
      company: user?.companyId ? { id: user.companyId } : undefined,
    }
    try {
      if (editing) {
        await dispatch(updateWorkType({ id: editing.id, data: payload })).unwrap()
        toast.success('Work type updated')
      } else {
        await dispatch(createWorkType(payload)).unwrap()
        toast.success('Work type created')
      }
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteWorkType(deleteTarget.id)).unwrap()
      toast.success('Work type deleted')
      setDeleteTarget(null)
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Work Type' },
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
      <PageHeader title="Work Types" subtitle="Manage work types (remote, on-site, hybrid, etc.)" actions={<Button onClick={openCreate}>+ New Work Type</Button>} />
      <DataTable columns={columns} data={workTypes} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Work Type' : 'New Work Type'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Work Type" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" />
    </div>
  )
}
