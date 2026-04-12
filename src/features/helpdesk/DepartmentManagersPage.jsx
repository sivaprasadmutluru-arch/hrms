import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDepartmentManagers, assignDepartmentManager, removeDepartmentManager,
  selectDepartmentManagers, selectLoading,
} from './helpdeskSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'

export default function DepartmentManagersPage() {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const managers = useSelector(selectDepartmentManagers)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchDepartmentManagers()) }, [dispatch])

  const handleRemove = (id) => setConfirmModal({ open: true, id })
  const onConfirmRemove = async () => {
    try { await dispatch(removeDepartmentManager(confirmModal.id)).unwrap(); toast.success('Removed') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const onSubmit = async (formData) => {
    try {
      await dispatch(assignDepartmentManager({
        department: { id: Number(formData.departmentId) },
        manager: { id: Number(formData.managerId) },
      })).unwrap()
      toast.success('Manager assigned')
      setModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'department.name', header: 'Department' },
    { accessorKey: 'manager.firstName', header: 'Manager First' },
    { accessorKey: 'manager.lastName', header: 'Manager Last' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <Button size="sm" variant="danger" onClick={() => handleRemove(row.original.id)}>Remove</Button>
    )},
  ]

  return (
    <div>
      <PageHeader title="Helpdesk Department Managers" subtitle="Assign managers to handle department tickets"
        actions={<Button onClick={() => { reset({}); setModalOpen(true) }}>+ Assign Manager</Button>} />
      <DataTable columns={columns} data={managers} loading={loading} />
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmRemove}
        title="Remove Manager Assignment"
        message="Are you sure you want to remove this manager assignment?"
        confirmLabel="Remove"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Assign Department Manager"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>Assign</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Department ID" type="number" error={errors.departmentId?.message} {...register('departmentId', { required: 'Required' })} />
          <Input label="Manager Employee ID" type="number" error={errors.managerId?.message} {...register('managerId', { required: 'Required' })} />
        </div>
      </Modal>
    </div>
  )
}
