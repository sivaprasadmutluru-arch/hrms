import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchBiometricEmployees, createBiometricEmployee, updateBiometricEmployee, deleteBiometricEmployee,
  fetchDevices,
  selectBiometricEmployees, selectDevices, selectBiometricLoading,
} from './biometricSlice'
import { fetchAll as fetchEmployees, selectAll as selectEmployees } from '../employees/employeesSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import Input from '../../components/common/Input'
import Combobox from '../../components/common/Combobox'
import Avatar from '../../components/common/Avatar'
import SearchInput from '../../components/common/SearchInput'
import useAuth from '../../hooks/useAuth'
import {
  UserPlusIcon, UsersIcon, IdentificationIcon, LinkIcon, PencilSquareIcon, TrashIcon,
} from '@heroicons/react/24/outline'

function StatCard({ label, value, icon, tone }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600',
    gray: 'bg-gray-100 text-gray-600',
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${tones[tone] || tones.gray}`}>
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
      </div>
    </div>
  )
}

const employeeName = (e) => e?.fullName || [e?.firstName, e?.lastName].filter(Boolean).join(' ') || `Employee #${e?.id}`

export default function BiometricEmployeesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const employees = useSelector(selectBiometricEmployees)
  const devices = useSelector(selectDevices)
  const allEmployees = useSelector(selectEmployees)
  const loading = useSelector(selectBiometricLoading)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null })
  const [search, setSearch] = useState('')
  const [deviceFilter, setDeviceFilter] = useState('ALL')

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchBiometricEmployees())
    dispatch(fetchDevices())
    // Fetch a large page so the searchable picker has options to choose from.
    dispatch(fetchEmployees({ page: 0, size: 500, companyId: user?.companyId }))
  }, [dispatch, user?.companyId])

  const employeeOptions = useMemo(
    () => (allEmployees || []).map((e) => ({
      value: e.id,
      label: employeeName(e),
      sublabel: [e.badgeId ? `#${e.badgeId}` : null, e.departmentName, e.email].filter(Boolean).join(' · '),
      searchText: `${employeeName(e)} ${e.badgeId || ''} ${e.email || ''}`,
    })),
    [allEmployees]
  )

  const deviceOptions = useMemo(
    () => [
      { value: '', label: '— No device —', sublabel: 'Unassigned' },
      ...(devices || []).map((d) => ({
        value: d.id,
        label: d.name,
        sublabel: [d.machineType, d.serialNumber ? `SN ${d.serialNumber}` : null].filter(Boolean).join(' · '),
        searchText: `${d.name} ${d.serialNumber || ''} ${d.machineIp || ''}`,
      })),
    ],
    [devices]
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (employees || []).filter((be) => {
      if (deviceFilter !== 'ALL' && (be.device?.id ?? null) !== deviceFilter) return false
      if (!q) return true
      const emp = be.employee
      return `${employeeName(emp)} ${emp?.badgeId || ''} ${be.userId || ''} ${be.device?.name || ''}`.toLowerCase().includes(q)
    })
  }, [employees, search, deviceFilter])

  const stats = useMemo(() => ({
    total: employees.length,
    uniqueEmployees: new Set(employees.map((be) => be.employee?.id).filter(Boolean)).size,
    devices: devices.length,
  }), [employees, devices])

  const watchEmployeeId = watch('employeeId')
  const watchDeviceId = watch('deviceId')

  const openCreate = () => {
    setEditing(null)
    reset({ userId: '', uid: '', refUserId: '', dahuaCardNo: '', employeeId: null, deviceId: null })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    reset({
      uid: row.uid ?? '',
      refUserId: row.refUserId ?? '',
      userId: row.userId ?? '',
      dahuaCardNo: row.dahuaCardNo ?? '',
      employeeId: row.employee?.id ?? null,
      deviceId: row.device?.id ?? null,
    })
    setModalOpen(true)
  }

  const handleDelete = (row) => setConfirmModal({ open: true, id: row.id })

  const onConfirmDelete = async () => {
    try {
      await dispatch(deleteBiometricEmployee(confirmModal.id)).unwrap()
      toast.success('Mapping removed')
    } catch (e) {
      toast.error(e || 'Failed to remove')
    } finally {
      setConfirmModal({ open: false, id: null })
    }
  }

  const onSubmit = async (data) => {
    if (!data.employeeId) { toast.error('Please select an employee'); return }
    if (!data.userId?.trim()) { toast.error('User ID on device is required'); return }

    const payload = {
      uid: data.uid !== '' && data.uid != null ? parseInt(data.uid, 10) : null,
      refUserId: data.refUserId || null,
      userId: String(data.userId).trim(),
      dahuaCardNo: data.dahuaCardNo || null,
      employee: data.employeeId ? { id: parseInt(data.employeeId, 10) } : null,
      device: data.deviceId ? { id: parseInt(data.deviceId, 10) } : null,
    }
    setSaving(true)
    try {
      if (editing) {
        await dispatch(updateBiometricEmployee({ id: editing.id, data: payload })).unwrap()
        toast.success('Mapping updated')
      } else {
        await dispatch(createBiometricEmployee(payload)).unwrap()
        toast.success('Mapping created')
      }
      setModalOpen(false)
      reset()
    } catch (e) {
      toast.error(e || 'Could not save mapping')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      id: 'employee',
      header: 'Employee',
      cell: ({ row }) => {
        const emp = row.original.employee
        return (
          <div className="flex items-center gap-3">
            <Avatar name={employeeName(emp)} size="sm" />
            <div className="min-w-0">
              <p className="font-medium text-gray-900 truncate">{employeeName(emp)}</p>
              <p className="text-xs text-gray-400 truncate">
                {emp?.badgeId ? `#${emp.badgeId}` : `ID ${emp?.id ?? '?'}`}
                {emp?.departmentName ? ` · ${emp.departmentName}` : ''}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'userId',
      header: 'Device User ID',
      cell: ({ getValue }) => (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-50 border border-gray-200 font-mono text-sm text-gray-700">
          <IdentificationIcon className="h-3.5 w-3.5 text-gray-400" />
          {getValue() || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'uid',
      header: 'UID',
      cell: ({ getValue }) => getValue() != null ? (
        <span className="font-mono text-sm text-gray-600">{getValue()}</span>
      ) : <span className="text-gray-300">—</span>,
    },
    {
      id: 'device',
      header: 'Device',
      cell: ({ row }) => {
        const d = row.original.device
        if (!d) return <span className="text-sm text-amber-500">Unassigned</span>
        return (
          <div className="flex items-center gap-2">
            <LinkIcon className="h-3.5 w-3.5 text-gray-400" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{d.name}</p>
              {d.serialNumber && <p className="text-xs text-gray-400 font-mono truncate">SN: {d.serialNumber}</p>}
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'dahuaCardNo',
      header: 'Dahua Card',
      cell: ({ getValue }) => getValue()
        ? <span className="font-mono text-sm text-gray-600">{getValue()}</span>
        : <span className="text-gray-300">—</span>,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(row.original)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors" title="Edit">
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button onClick={() => handleDelete(row.original)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors" title="Remove">
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="biometric-workspace biometric-employees-workspace">
      <PageHeader
        title="Biometric Employees"
        subtitle="Map employees to their local user IDs on each biometric device"
        actions={<Button onClick={openCreate}><UserPlusIcon className="h-4 w-4 mr-1" /> Add Mapping</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Device Mappings" value={stats.total} tone="indigo" icon={<LinkIcon className="h-6 w-6" />} />
        <StatCard label="Enrolled Employees" value={stats.uniqueEmployees} tone="emerald" icon={<UsersIcon className="h-6 w-6" />} />
        <StatCard label="Active Devices" value={stats.devices} tone="violet" icon={<IdentificationIcon className="h-6 w-6" />} />
      </div>

      {/* Toolbar */}
      <div className="biometric-toolbar flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput placeholder="Search employee, user ID, or device..." onSearch={setSearch} className="sm:max-w-xs" />
        <div className="flex items-center gap-1.5 ml-auto overflow-x-auto">
          <button
            onClick={() => setDeviceFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              deviceFilter === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            All Devices
          </button>
          {devices.map((d) => (
            <button
              key={d.id}
              onClick={() => setDeviceFilter(d.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                deviceFilter === d.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
              title={d.serialNumber ? `SN: ${d.serialNumber}` : ''}
            >
              {d.name}
            </button>
          ))}
        </div>
      </div>

      <div className="biometric-table"><DataTable columns={columns} data={filtered} loading={loading} /></div>

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null })}
        onConfirm={onConfirmDelete}
        title="Remove Mapping"
        message="Remove this employee-device mapping? The device will no longer recognize this user ID. This cannot be undone."
        confirmLabel="Remove"
        loading={loading}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Mapping' : 'Add Biometric Mapping'}
        size="lg"
        panelClassName="biometric-form-modal"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={saving}>{editing ? 'Save Changes' : 'Create Mapping'}</Button>
          </div>
        }
      >
        <div className="biometric-form">
          {/* Employee picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
            <Combobox
              options={employeeOptions}
              value={watchEmployeeId ?? null}
              onChange={(v) => setValue('employeeId', v, { shouldValidate: true })}
              placeholder="Search employee by name, badge, or email..."
              emptyText="No employees found"
              error={errors.employeeId?.message}
            />
          </div>

          {/* Device picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Device</label>
            <Combobox
              options={deviceOptions}
              value={watchDeviceId ?? ''}
              onChange={(v) => setValue('deviceId', v || null)}
              placeholder="Select a device..."
              emptyText="No devices found"
              helperText="Choose the physical machine this user is enrolled on"
            />
          </div>

          {/* Device IDs */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Device Identifiers</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="User ID on Device *"
                error={errors.userId?.message}
                placeholder="e.g. 5"
                helperText="The local user number enrolled on the machine"
                {...register('userId', { required: 'User ID on device is required' })}
              />
              <Input label="UID" type="number" placeholder="e.g. 1001" {...register('uid')} />
              <Input label="Ref User ID" {...register('refUserId')} />
              <Input label="Dahua Card No" {...register('dahuaCardNo')} />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
