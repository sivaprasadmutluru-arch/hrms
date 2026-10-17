import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchDevices, createDevice, updateDevice, deleteDevice, testDeviceConnection,
  selectDevices, selectBiometricLoading, selectConnectionTests,
} from './biometricSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import ConfirmModal from '../../components/common/ConfirmModal'
import SearchInput from '../../components/common/SearchInput'
import DeviceFormFields from './DeviceFormFields'
import useAuth from '../../hooks/useAuth'
import { formatDate } from '../../utils/formatters'
import {
  FingerPrintIcon, CircleStackIcon, WifiIcon, ExclamationTriangleIcon,
  CpuChipIcon, ArrowPathIcon, PencilSquareIcon, TrashIcon, PlusIcon,
} from '@heroicons/react/24/outline'

const MACHINE_TYPE_BADGE = {
  ZK: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ANVIZ: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  COSEC: 'bg-violet-50 text-violet-700 border-violet-200',
  DAHUA: 'bg-amber-50 text-amber-700 border-amber-200',
  ETIMEOFFICE: 'bg-blue-50 text-blue-700 border-blue-200',
}

const DIRECTION_LABEL = {
  SYSTEM: 'System',
  ALTERNATE: 'Alternate',
  IN: 'In only',
  OUT: 'Out only',
}

function StatCard({ label, value, icon, tone }) {
  const tones = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
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

function ConnectionBadge({ deviceId, tests, onTest }) {
  const t = tests[deviceId]
  // No test run yet
  if (!t) {
    return (
      <button
        onClick={() => onTest(deviceId)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100 transition-colors"
      >
        <WifiIcon className="h-3.5 w-3.5" /> Test
      </button>
    )
  }
  if (t.unavailable) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200" title={t.detail?.message || 'Waiting for the physical device to contact HRMS'}>
        <ExclamationTriangleIcon className="h-3.5 w-3.5" /> Waiting for device
      </span>
    )
  }
  return t.ok ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-600 border border-red-200">
      <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> Offline
    </span>
  )
}

export default function BiometricDevicesPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const devices = useSelector(selectDevices)
  const loading = useSelector(selectBiometricLoading)
  const tests = useSelector(selectConnectionTests)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, name: null })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const watchType = watch('machineType')

  useEffect(() => { dispatch(fetchDevices()) }, [dispatch])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (devices || []).filter((d) => {
      if (typeFilter !== 'ALL' && d.machineType !== typeFilter) return false
      if (!q) return true
      return `${d.name} ${d.serialNumber || ''} ${d.machineIp || ''}`.toLowerCase().includes(q)
    })
  }, [devices, search, typeFilter])

  const stats = useMemo(() => ({
    total: devices.length,
    live: devices.filter((d) => d.isLive).length,
    zk: devices.filter((d) => d.machineType === 'ZK').length,
    withSerial: devices.filter((d) => d.serialNumber).length,
  }), [devices])

  const openCreate = () => {
    setEditing(null)
    reset({ machineType: 'ZK', deviceDirection: 'SYSTEM', isLive: false, isScheduler: false })
    setModalOpen(true)
  }

  const openEdit = (row) => {
    setEditing(row)
    reset({
      name: row.name,
      machineType: row.machineType || 'ZK',
      serialNumber: row.serialNumber || '',
      machineIp: row.machineIp || '',
      port: row.port ?? '',
      zkPassword: row.zkPassword || '',
      bioUsername: row.bioUsername || '',
      bioPassword: row.bioPassword || '',
      anvizRequestId: row.anvizRequestId || '',
      apiUrl: row.apiUrl || '',
      apiKey: row.apiKey || '',
      apiSecret: row.apiSecret || '',
      apiToken: row.apiToken || '',
      apiExpires: row.apiExpires || '',
      isLive: !!row.isLive,
      isScheduler: !!row.isScheduler,
      schedulerDuration: row.schedulerDuration || '',
      deviceDirection: row.deviceDirection || 'SYSTEM',
    })
    setModalOpen(true)
  }

  const handleDelete = (row) => setConfirmModal({ open: true, id: row.id, name: row.name })

  const onConfirmDelete = async () => {
    try {
      await dispatch(deleteDevice(confirmModal.id)).unwrap()
      toast.success('Device deleted')
    } catch (e) {
      toast.error(e || 'Failed to delete device')
    } finally {
      setConfirmModal({ open: false, id: null, name: null })
    }
  }

  const handleTest = async (id) => {
    const res = await dispatch(testDeviceConnection(id))
    if (res.payload?.unavailable) toast(res.payload?.detail?.message || 'Live test not available — relying on push data', { icon: 'ℹ️' })
    else if (res.payload?.ok) toast.success('Device reachable')
    else toast.error('Device did not respond')
  }

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      // Never send empty strings to the backend for enum columns — coerce to safe values.
      machineType: data.machineType || 'ZK',
      deviceDirection: data.deviceDirection || 'SYSTEM',
      serialNumber: data.serialNumber?.trim() ? data.serialNumber.trim() : null,
      port: data.port !== '' && data.port != null ? parseInt(data.port, 10) : null,
      schedulerDuration: data.schedulerDuration !== '' && data.schedulerDuration != null ? String(data.schedulerDuration) : null,
      isLive: !!data.isLive,
      isScheduler: !!data.isScheduler,
      company: { id: user?.companyId },
    }
    setSaving(true)
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
    } catch (e) {
      toast.error(e || 'Could not save device')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      accessorKey: 'name',
      header: 'Device',
      cell: ({ row }) => {
        const d = row.original
        const badge = MACHINE_TYPE_BADGE[d.machineType] || MACHINE_TYPE_BADGE.ZK
        return (
          <div className="flex items-center gap-3">
            <div className="shrink-0 w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center">
              <FingerPrintIcon className="h-5 w-5 text-gray-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 truncate">{d.name}</p>
                {d.isLive && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700">
                    <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />LIVE
                  </span>
                )}
              </div>
              {d.serialNumber ? (
                <p className="text-xs text-gray-400 font-mono truncate" title="Serial Number (ADMS SN)">
                  SN: {d.serialNumber}
                </p>
              ) : (
                <p className="text-xs text-amber-500 truncate">No serial number</p>
              )}
            </div>
            <span className={`hidden sm:inline-flex shrink-0 items-center px-2 py-0.5 rounded text-[10px] font-semibold border ${badge}`}>
              {d.machineType}
            </span>
          </div>
        )
      },
    },
    {
      id: 'endpoint',
      header: 'Endpoint',
      cell: ({ row }) => {
        const d = row.original
        if (d.machineIp) return <span className="text-sm text-gray-600 font-mono">{d.machineIp}{d.port ? `:${d.port}` : ''}</span>
        if (d.apiUrl) return <span className="text-sm text-gray-600 truncate max-w-[180px] block" title={d.apiUrl}>{d.apiUrl}</span>
        return <span className="text-sm text-gray-300">—</span>
      },
    },
    {
      accessorKey: 'deviceDirection',
      header: 'Direction',
      cell: ({ getValue }) => (
        <span className="text-sm text-gray-600">{DIRECTION_LABEL[getValue()] || getValue() || '—'}</span>
      ),
    },
    {
      id: 'lastFetch',
      header: 'Last Sync',
      cell: ({ row }) => {
        const d = row.original
        if (!d.lastFetchDate) return <span className="text-sm text-gray-300">Never</span>
        return (
          <div className="text-sm">
            <p className="text-gray-600">{formatDate(d.lastFetchDate)}</p>
            {d.lastFetchTime && <p className="text-xs text-gray-400">{String(d.lastFetchTime).slice(0, 5)}</p>}
          </div>
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <ConnectionBadge deviceId={row.original.id} tests={tests} onTest={handleTest} />,
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openEdit(row.original)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
            title="Edit"
          >
            <PencilSquareIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row.original)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Biometric Devices"
        subtitle="Manage attendance machines and ADMS push integrations"
        actions={<Button onClick={openCreate}><PlusIcon className="h-4 w-4 mr-1" /> Add Device</Button>}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Devices" value={stats.total} tone="indigo" icon={<FingerPrintIcon className="h-6 w-6" />} />
        <StatCard label="Live Mode" value={stats.live} tone="emerald" icon={<CircleStackIcon className="h-6 w-6" />} />
        <StatCard label="ZKTeco (ADMS)" value={stats.zk} tone="amber" icon={<CpuChipIcon className="h-6 w-6" />} />
        <StatCard label="With Serial No." value={`${stats.withSerial}/${stats.total}`} tone="gray" icon={<WifiIcon className="h-6 w-6" />} />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <SearchInput placeholder="Search by name, serial, or IP..." onSearch={setSearch} className="sm:max-w-xs" />
        <div className="flex items-center gap-1.5 ml-auto">
          {['ALL', 'ZK', 'ANVIZ', 'COSEC', 'DAHUA', 'ETIMEOFFICE'].map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                typeFilter === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {t === 'ALL' ? 'All' : t}
            </button>
          ))}
        </div>
      </div>

      <DataTable columns={columns} data={filtered} loading={loading} />

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, name: null })}
        onConfirm={onConfirmDelete}
        title="Delete Device"
        message={confirmModal.name ? `Delete "${confirmModal.name}"? Mapped employees will lose their device link. This cannot be undone.` : 'Are you sure?'}
        confirmLabel="Delete"
        loading={loading}
      />

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Device' : 'Add Biometric Device'}
        size="xl"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={saving}>
              {editing ? 'Save Changes' : 'Create Device'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit(onSubmit)}>
          <DeviceFormFields register={register} errors={errors} machineType={watchType} />
        </form>
      </Modal>
    </div>
  )
}
