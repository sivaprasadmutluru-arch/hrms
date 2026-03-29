import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDevices, createDevice, updateDevice, deleteDevice,
  selectDevices, selectBiometricLoading
} from './biometricSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

const MACHINE_TYPES = ['ZK', 'ANVIZ', 'COSEC', 'DAHUA', 'ETIMEOFFICE']
const DEVICE_DIRECTIONS = ['IN', 'OUT', 'ALTERNATE', 'SYSTEM']

export default function BiometricDevicesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const devices = useSelector(selectDevices)
  const loading = useSelector(selectBiometricLoading)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { dispatch(fetchDevices()) }, [dispatch])

  const openCreate = () => { setEditing(null); reset({}); setModalOpen(true) }
  const openEdit = (row) => {
    setEditing(row)
    reset({
      name: row.name,
      machineType: row.machineType,
      machineIp: row.machineIp,
      port: row.port,
      zkPassword: row.zkPassword,
      bioUsername: row.bioUsername,
      bioPassword: row.bioPassword,
      anvizRequestId: row.anvizRequestId,
      apiUrl: row.apiUrl,
      apiKey: row.apiKey,
      apiSecret: row.apiSecret,
      apiToken: row.apiToken,
      apiExpires: row.apiExpires,
      isLive: row.isLive,
      isScheduler: row.isScheduler,
      schedulerDuration: row.schedulerDuration,
      deviceDirection: row.deviceDirection,
    })
    setModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this device?')) return
    try { await dispatch(deleteDevice(id)).unwrap(); toast.success('Device deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      port: data.port ? parseInt(data.port) : null,
      schedulerDuration: data.schedulerDuration ? parseInt(data.schedulerDuration) : null,
      isLive: data.isLive === true || data.isLive === 'true',
      isScheduler: data.isScheduler === true || data.isScheduler === 'true',
      company: { id: user?.companyId },
    }
    try {
      if (editing) {
        await dispatch(updateDevice({ id: editing.id, data: payload })).unwrap()
        toast.success('Device updated')
      } else {
        await dispatch(createDevice(payload)).unwrap()
        toast.success('Device created')
      }
      setModalOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Error') }
  }

  const columns = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'machineType', header: 'Type' },
    { accessorKey: 'machineIp', header: 'IP Address' },
    { accessorKey: 'port', header: 'Port' },
    { accessorKey: 'deviceDirection', header: 'Direction' },
    { accessorKey: 'isLive', header: 'Live', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { accessorKey: 'isScheduler', header: 'Scheduler', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDelete(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div>
      <PageHeader title="Biometric Devices" subtitle="Manage biometric attendance devices"
        actions={<Button onClick={openCreate}>+ Add Device</Button>} />
      <DataTable columns={columns} data={devices} loading={loading} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Device' : 'Add Device'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          <Input label="Device Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Machine Type</label>
            <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...register('machineType')}>
              <option value="">Select type</option>
              {MACHINE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <Input label="Machine IP" {...register('machineIp')} />
          <Input label="Port" type="number" {...register('port')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device Direction</label>
            <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" {...register('deviceDirection')}>
              <option value="">Select direction</option>
              {DEVICE_DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <Input label="ZK Password" type="password" {...register('zkPassword')} />
          <Input label="Bio Username" {...register('bioUsername')} />
          <Input label="Bio Password" type="password" {...register('bioPassword')} />
          <Input label="Anviz Request ID" {...register('anvizRequestId')} />
          <Input label="API URL" {...register('apiUrl')} />
          <Input label="API Key" {...register('apiKey')} />
          <Input label="API Secret" {...register('apiSecret')} />
          <Input label="API Token" {...register('apiToken')} />
          <Input label="API Expires" type="date" {...register('apiExpires')} />
          <Input label="Scheduler Duration (minutes)" type="number" {...register('schedulerDuration')} />
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isLive')} className="rounded" />
              Is Live
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isScheduler')} className="rounded" />
              Is Scheduler
            </label>
          </div>
        </div>
      </Modal>
    </div>
  )
}
