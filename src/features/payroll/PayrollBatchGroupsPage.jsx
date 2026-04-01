import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { fetchBatchGroups, createBatchGroup, updateBatchGroup, deleteBatchGroup } from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'

export default function PayrollBatchGroupsPage() {
  const dispatch = useDispatch()
  const groups = useSelector(s => s.payroll.batchGroups)
  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchBatchGroups()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModal(true) }
  const openEdit = (g) => { setEditing(g); reset({ name: g.name, description: g.description }); setModal(true) }

  const onSubmit = async (data) => {
    try {
      if (editing) {
        await dispatch(updateBatchGroup({ id: editing.id, data })).unwrap()
        toast.success('Updated')
      } else {
        await dispatch(createBatchGroup(data)).unwrap()
        toast.success('Created')
      }
      setModal(false)
      dispatch(fetchBatchGroups())
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this batch group?')) return
    try { await dispatch(deleteBatchGroup(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const columns = [
    { key: 'name', header: 'Name' },
    { key: 'description', header: 'Description' },
    {
      key: 'actions', header: 'Actions',
      render: r => (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => handleDelete(r.id)}>Delete</Button>
        </div>
      )
    }
  ]

  return (
    <div>
      <PageHeader title="Payroll Batch Groups" subtitle="Manage payroll batch groups">
        <Button onClick={openCreate}>Add Batch Group</Button>
      </PageHeader>
      <DataTable columns={columns} data={groups} />
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Edit Batch Group' : 'New Batch Group'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" {...register('name', { required: 'Required' })} error={errors.name?.message} />
          <Input label="Description" {...register('description')} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModal(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
