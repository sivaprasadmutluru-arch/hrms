import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchBiometricEmployees, createBiometricEmployee, updateBiometricEmployee, deleteBiometricEmployee,
  fetchDevices, selectBiometricEmployees, selectDevices, selectBiometricLoading
} from './biometricSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import ConfirmModal from '../../components/common/ConfirmModal'

export default function BiometricEmployeesPage() {
  const dispatch = useDispatch()
  const employees = useSelector(selectBiometricEmployees)
  const devices = useSelector(selectDevices)
  const loading = useSelector(selectBiometricLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchBiometricEmployees())
    dispatch(fetchDevices())
  }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({
      uid: row.uid,
      refUserId: row.refUserId,
      userId: row.userId,
      dahuaCardNo: row.dahuaCardNo,
      employeeId: row.employee?.id,
      deviceId: row.device?.id,
    })
    setModalOpen(true)
  }

  const handleDelete = (id) => setConfirmModal({ open: true, id })
  const onConfirmDelete = async () => {
    try { await dispatch(deleteBiometricEmployee(confirmModal.id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
    finally { setConfirmModal({ open: false, id: null }) }
  }

  const onSubmit = async (data) => {
    const payload = {
      uid: data.uid ? parseInt(data.uid) : null,
      refUserId: data.refUserId,
      userId: data.userId,
      dahuaCardNo: data.dahuaCardNo,
      employee: data.employeeId ? { id: parseInt(data.employeeId) } : null,
      device: data.deviceId ? { id: parseInt(data.deviceId) } : null,
    }
    try {
      if (editing) {
        await dispatch(updateBiometricEmployee({ id: editing.id, data: payload })).unwrap()
        toast.success('Updated')
      } else {
        await dispatch(createBiometricEmployee(payload)).unwrap()
        toast.success('Created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'uid', header: 'UID' },
    { accessorKey: 'refUserId', header: 'Ref User ID' },
    { accessorKey: 'userId', header: 'User ID' },
    { accessorKey: 'dahuaCardNo', header: 'Dahua Card No' },
    { accessorKey: 'employee', header: 'Employee ID', cell: ({ getValue }) => getValue()?.id || '—' },
    { accessorKey: 'device', header: 'Device', cell: ({ getValue }) => getValue()?.name || getValue()?.id || '—' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Biometric Employees" subtitle="Employees registered on biometric devices"
        actions={<Button onClick={openCreate}>+ Add Employee</Button>} />
      <DataTable columns={columns} data={employees} loading={loading} />
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Remove Biometric Employee"
        message="Are you sure you want to remove this biometric employee record?"
        confirmLabel="Remove"
        loading={loading}
      />
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Biometric Employee' : 'Add Biometric Employee'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="UID" type="number" error={errors.uid?.message} {...register('uid')} />
          <Input label="Ref User ID" {...register('refUserId')} />
          <Input label="User ID" {...register('userId')} />
          <Input label="Dahua Card No" {...register('dahuaCardNo')} />
          <Input label="Employee ID" type="number" error={errors.employeeId?.message} {...register('employeeId', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
            <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...register('deviceId')}>
              <option value="">Select device</option>
              {devices.map(d => <option key={d.id} value={d.id}>{d.name} ({d.machineIp})</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  )
}
