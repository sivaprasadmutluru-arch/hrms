import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchWorkTypes, createWorkType, updateWorkType, deleteWorkType, selectWorkTypes } from './baseExtrasSlice'
import Button from '../../components/common/Button'
import SetupDirectory from '../../components/common/SetupDirectory'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'
import useAuth from '../../hooks/useAuth'
import { LaptopMinimal } from 'lucide-react'

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
    { accessorKey: 'name', header: 'Work Type', cell: ({ row }) => <span className="setup-name-cell"><i><LaptopMinimal size={16} /></i><b>{row.original.name}</b></span> },
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
      <SetupDirectory title="Work types" subtitle="Set the ways your teams work, from office-based schedules to remote arrangements." icon={<LaptopMinimal size={22} />} itemLabel="work type" data={workTypes} columns={columns} searchText={item => `${item.name || ''}`} action={<Button className="setup-primary-button" onClick={openCreate}>+ New work type</Button>} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="lg" panelClassName="setup-form-modal" title={editing ? 'Edit work type' : 'New work type'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editing ? 'Update' : 'Create'}</Button></div>}>
        <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
      </Modal>

      <ConfirmModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Work Type" message={`Delete "${deleteTarget?.name}"?`} confirmLabel="Delete" />
    </>
  )
}
