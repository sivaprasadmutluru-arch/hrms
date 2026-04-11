import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchGraceTimes, createGraceTime, updateGraceTime, deleteGraceTime,
  fetchValidationConditions, updateValidationConditions,
  fetchGeneralSettings, upsertGeneralSettings,
  fetchAllowedIPs, createAllowedIP, updateAllowedIP, deleteAllowedIP,
  fetchBatches, createBatch, updateBatch, deleteBatch,
  selectGraceTimes, selectValidationConditions, selectGeneralSettings,
  selectAllowedIPs, selectBatches, selectLoading
} from './attendanceSlice'
import {
  fetchEmployeeShifts, createEmployeeShift, updateEmployeeShift, deleteEmployeeShift,
  fetchTrackSettings, saveTrackSettings,
  selectEmployeeShifts, selectTrackSettings,
} from '../base/baseExtrasSlice'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import useAuth from '../../hooks/useAuth'

const TABS = ['Grace Times', 'Validation', 'General', 'Allowed IPs', 'Batches', 'Employee Shifts', 'Track Settings']

const SCOPE_LABEL = (gt) => {
  if (gt.organization?.id) return 'Organisation'
  if (gt.company?.id) return 'Branch'
  return '—'
}

export default function AttendanceSettingsPage() {
  const dispatch = useDispatch()
  const { user, isEnterpriseAdmin, isPlatformAdmin } = useAuth()
  const graceTimes = useSelector(selectGraceTimes)
  const validationConditions = useSelector(selectValidationConditions)
  const generalSettings = useSelector(selectGeneralSettings)
  const allowedIPs = useSelector(selectAllowedIPs)
  const batches = useSelector(selectBatches)
  const loading = useSelector(selectLoading)
  const employeeShifts = useSelector(selectEmployeeShifts)
  const trackSettings = useSelector(selectTrackSettings)

  const [tab, setTab] = useState('Grace Times')
  const [gtModalOpen, setGtModalOpen] = useState(false)
  const [editingGt, setEditingGt] = useState(null)
  const [ipModalOpen, setIpModalOpen] = useState(false)
  const [editingIp, setEditingIp] = useState(null)
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [editingBatch, setEditingBatch] = useState(null)
  const [shiftModalOpen, setShiftModalOpen] = useState(false)
  const [editingShift, setEditingShift] = useState(null)

  const gtForm = useForm()
  const vcForm = useForm()
  const gsForm = useForm()
  const ipForm = useForm()
  const batchForm = useForm()
  const shiftForm = useForm()
  const trackForm = useForm()

  useEffect(() => {
    dispatch(fetchGraceTimes())
    dispatch(fetchBatches())
    dispatch(fetchEmployeeShifts())
    if (user?.companyId) {
      dispatch(fetchValidationConditions(user.companyId))
      dispatch(fetchGeneralSettings(user.companyId))
      dispatch(fetchAllowedIPs(user.companyId))
      dispatch(fetchTrackSettings(user.companyId))
    }
  }, [dispatch, user?.companyId])

  useEffect(() => {
    if (validationConditions) {
      vcForm.reset({
        validationAtWork: validationConditions.validationAtWork || '',
        minimumOvertimeToApprove: validationConditions.minimumOvertimeToApprove || '',
        overtimeCutoff: validationConditions.overtimeCutoff || '',
        autoApproveOt: validationConditions.autoApproveOt ? 'true' : 'false',
      })
    }
  }, [validationConditions])

  useEffect(() => {
    if (generalSettings) {
      gsForm.reset({
        timeRunner: generalSettings.timeRunner ? 'true' : 'false',
        enableCheckIn: generalSettings.enableCheckIn ? 'true' : 'false',
      })
    }
  }, [generalSettings])

  useEffect(() => {
    if (trackSettings) {
      trackForm.reset({
        minimumLateComeMinutes: trackSettings.minimumLateComeMinutes ?? 15,
        minimumEarlyOutMinutes: trackSettings.minimumEarlyOutMinutes ?? 15,
        enableLateComeTracking: trackSettings.enableLateComeTracking ? 'true' : 'false',
        enableEarlyOutTracking: trackSettings.enableEarlyOutTracking ? 'true' : 'false',
      })
    }
  }, [trackSettings])

  const openCreateGt = () => { setEditingGt(null); gtForm.reset({ isDefault: true, allowedClockIn: true, allowedClockOut: false }); setGtModalOpen(true) }
  const openEditGt = (gt) => {
    setEditingGt(gt)
    gtForm.reset({
      allowedTime: gt.allowedTime,
      allowedTimeInSeconds: gt.allowedTimeInSeconds,
      allowedClockIn: gt.allowedClockIn,
      allowedClockOut: gt.allowedClockOut,
      isDefault: gt.isDefault,
    })
    setGtModalOpen(true)
  }

  const onSubmitGt = async (data) => {
    try {
      const isOrgLevel = isEnterpriseAdmin() || isPlatformAdmin()
      const payload = {
        ...data,
        allowedTimeInSeconds: data.allowedTimeInSeconds ? parseInt(data.allowedTimeInSeconds) : null,
        isDefault: data.isDefault === true || data.isDefault === 'true',
        allowedClockIn: data.allowedClockIn === true || data.allowedClockIn === 'true',
        allowedClockOut: data.allowedClockOut === true || data.allowedClockOut === 'true',
      }
      if (!editingGt) {
        if (isOrgLevel && user?.organizationId) {
          payload.organization = { id: user.organizationId }
        } else {
          payload.company = { id: user?.companyId }
        }
      }
      if (editingGt) {
        await dispatch(updateGraceTime({ id: editingGt.id, data: payload })).unwrap()
        toast.success('Grace time updated')
      } else {
        await dispatch(createGraceTime(payload)).unwrap()
        toast.success('Grace time created')
      }
      setGtModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDeleteGt = async (id) => {
    if (!window.confirm('Delete this grace time?')) return
    try { await dispatch(deleteGraceTime(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmitVc = async (data) => {
    try {
      await dispatch(updateValidationConditions({
        companyId: user?.companyId,
        data: { ...data, autoApproveOt: data.autoApproveOt === 'true' }
      })).unwrap()
      toast.success('Validation conditions updated')
    } catch (e) { toast.error(e || 'Error') }
  }

  const onSubmitGs = async (data) => {
    try {
      await dispatch(upsertGeneralSettings({
        companyId: user?.companyId,
        data: { timeRunner: data.timeRunner === 'true', enableCheckIn: data.enableCheckIn === 'true' }
      })).unwrap()
      toast.success('General settings saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  const openCreateIp = () => { setEditingIp(null); ipForm.reset({}); setIpModalOpen(true) }
  const openEditIp = (ip) => { setEditingIp(ip); ipForm.reset({ ipAddress: ip.ipAddress, description: ip.description, isEnabled: ip.isEnabled }); setIpModalOpen(true) }

  const onSubmitIp = async (data) => {
    try {
      if (editingIp) {
        await dispatch(updateAllowedIP({ id: editingIp.id, data })).unwrap()
        toast.success('IP updated')
      } else {
        await dispatch(createAllowedIP({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('IP added')
      }
      setIpModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDeleteIp = async (id) => {
    if (!window.confirm('Remove this IP?')) return
    try { await dispatch(deleteAllowedIP(id)).unwrap(); toast.success('Removed') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const openCreateBatch = () => { setEditingBatch(null); batchForm.reset({}); setBatchModalOpen(true) }
  const openEditBatch = (b) => { setEditingBatch(b); batchForm.reset({ title: b.title }); setBatchModalOpen(true) }

  const onSubmitBatch = async (data) => {
    try {
      if (editingBatch) {
        await dispatch(updateBatch({ id: editingBatch.id, data })).unwrap()
        toast.success('Batch updated')
      } else {
        await dispatch(createBatch({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('Batch created')
      }
      setBatchModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }

  const handleDeleteBatch = async (id) => {
    if (!window.confirm('Delete this batch?')) return
    try { await dispatch(deleteBatch(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const gtColumns = [
    { accessorKey: 'allowedTime', header: 'Allowed Time' },
    { accessorKey: 'allowedTimeInSeconds', header: 'Seconds' },
    { accessorKey: 'allowedClockIn', header: 'Clock In', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { accessorKey: 'allowedClockOut', header: 'Clock Out', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { id: 'scope', header: 'Scope', cell: ({ row }) => {
      const label = SCOPE_LABEL(row.original)
      return (
        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
          label === 'Organisation' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
        }`}>{label}</span>
      )
    }},
    { id: 'isDefault', header: 'Default', cell: ({ row }) => row.original.isDefault
      ? <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700">Yes</span>
      : <span className="text-gray-400 text-xs">No</span>
    },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditGt(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteGt(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const ipColumns = [
    { accessorKey: 'ipAddress', header: 'IP Address' },
    { accessorKey: 'description', header: 'Description' },
    { accessorKey: 'isEnabled', header: 'Enabled', cell: ({ getValue }) => getValue() ? 'Yes' : 'No' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditIp(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteIp(row.original.id)}>Remove</Button>
      </div>
    )},
  ]

  const openCreateShift = () => { setEditingShift(null); shiftForm.reset({}); setShiftModalOpen(true) }
  const openEditShift = (s) => { setEditingShift(s); shiftForm.reset({ name: s.name, startTime: s.startTime, endTime: s.endTime, minimumWorkingHour: s.minimumWorkingHour }); setShiftModalOpen(true) }
  const onSubmitShift = async (data) => {
    try {
      if (editingShift) {
        await dispatch(updateEmployeeShift({ id: editingShift.id, data })).unwrap()
        toast.success('Shift updated')
      } else {
        await dispatch(createEmployeeShift({ ...data, company: { id: user?.companyId } })).unwrap()
        toast.success('Shift created')
      }
      setShiftModalOpen(false)
    } catch (e) { toast.error(e || 'Error') }
  }
  const handleDeleteShift = async (id) => {
    if (!window.confirm('Delete this shift?')) return
    try { await dispatch(deleteEmployeeShift(id)).unwrap(); toast.success('Deleted') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const onSubmitTrack = async (data) => {
    try {
      await dispatch(saveTrackSettings({
        companyId: user?.companyId,
        data: {
          minimumLateComeMinutes: parseInt(data.minimumLateComeMinutes),
          minimumEarlyOutMinutes: parseInt(data.minimumEarlyOutMinutes),
          enableLateComeTracking: data.enableLateComeTracking === 'true',
          enableEarlyOutTracking: data.enableEarlyOutTracking === 'true',
        }
      })).unwrap()
      toast.success('Track settings saved')
    } catch (e) { toast.error(e || 'Error') }
  }

  const shiftColumns = [
    { accessorKey: 'name', header: 'Shift Name' },
    { accessorKey: 'startTime', header: 'Start Time' },
    { accessorKey: 'endTime', header: 'End Time' },
    { accessorKey: 'minimumWorkingHour', header: 'Min Hours' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditShift(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteShift(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  const batchColumns = [
    { accessorKey: 'id', header: 'ID' },
    { accessorKey: 'title', header: 'Title' },
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" onClick={() => openEditBatch(row.original)}>Edit</Button>
        <Button size="sm" variant="danger" onClick={() => handleDeleteBatch(row.original.id)}>Delete</Button>
      </div>
    )},
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Attendance Settings" subtitle="Grace times, validation, IP restrictions, and batch groups" />

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Grace Times' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Grace Times</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Branch-level overrides organisation-level. If no branch grace is set, the organisation default applies.
              </p>
            </div>
            <Button onClick={openCreateGt}>+ Add Grace Time</Button>
          </div>
          <DataTable columns={gtColumns} data={graceTimes} loading={loading} />
        </div>
      )}

      {tab === 'Validation' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Validation Conditions</h3>
          <form onSubmit={vcForm.handleSubmit(onSubmitVc)} className="space-y-4">
            <Input label="Validation at Work (HH:MM)" {...vcForm.register('validationAtWork')} />
            <Input label="Minimum Overtime to Approve (HH:MM)" {...vcForm.register('minimumOvertimeToApprove')} />
            <Input label="Overtime Cutoff (HH:MM)" {...vcForm.register('overtimeCutoff')} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auto Approve OT</label>
              <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...vcForm.register('autoApproveOt')}>
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
            <div className="flex justify-end"><Button type="submit">Save</Button></div>
          </form>
        </div>
      )}

      {tab === 'General' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">General Settings</h3>
          <form onSubmit={gsForm.handleSubmit(onSubmitGs)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Time Runner</label>
              <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...gsForm.register('timeRunner')}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enable Check In / Check Out</label>
              <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...gsForm.register('enableCheckIn')}>
                <option value="true">Enabled</option>
                <option value="false">Disabled</option>
              </select>
            </div>
            <div className="flex justify-end"><Button type="submit">Save</Button></div>
          </form>
        </div>
      )}

      {tab === 'Allowed IPs' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">IP Whitelist</h3>
            <Button onClick={openCreateIp}>+ Add IP</Button>
          </div>
          <DataTable columns={ipColumns} data={allowedIPs} loading={loading} />
        </div>
      )}

      {tab === 'Batches' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Batch Attendance Groups</h3>
            <Button onClick={openCreateBatch}>+ New Batch</Button>
          </div>
          <DataTable columns={batchColumns} data={batches} loading={loading} />
        </div>
      )}

      {tab === 'Employee Shifts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800">Employee Shifts</h3>
            <Button onClick={openCreateShift}>+ Add Shift</Button>
          </div>
          <DataTable columns={shiftColumns} data={employeeShifts} loading={loading} />
        </div>
      )}

      {tab === 'Track Settings' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Late Come / Early Out Tracking</h3>
          <form onSubmit={trackForm.handleSubmit(onSubmitTrack)} className="space-y-4">
            <Input label="Minimum Late Come (minutes)" type="number" {...trackForm.register('minimumLateComeMinutes')} />
            <Input label="Minimum Early Out (minutes)" type="number" {...trackForm.register('minimumEarlyOutMinutes')} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enable Late Come Tracking</label>
              <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...trackForm.register('enableLateComeTracking')}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Enable Early Out Tracking</label>
              <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...trackForm.register('enableEarlyOutTracking')}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="flex justify-end"><Button type="submit">Save</Button></div>
          </form>
        </div>
      )}

      {/* Grace Time Modal */}
      <Modal open={gtModalOpen} onClose={() => setGtModalOpen(false)} title={editingGt ? 'Edit Grace Time' : 'Add Grace Time'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setGtModalOpen(false)}>Cancel</Button>
            <Button onClick={gtForm.handleSubmit(onSubmitGt)}>{editingGt ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          {!editingGt && (
            <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-2 text-xs text-indigo-700">
              {(isEnterpriseAdmin() || isPlatformAdmin())
                ? 'This will apply as an organisation-wide default. Branches can override it with their own grace time.'
                : 'This will apply to your branch only.'}
            </div>
          )}
          <Input label="Allowed Time (HH:MM:SS)" placeholder="00:15:00"
            error={gtForm.formState.errors.allowedTime?.message}
            {...gtForm.register('allowedTime', { required: 'Required' })} />
          <Input label="Allowed Time in Seconds" type="number" placeholder="900"
            {...gtForm.register('allowedTimeInSeconds', { valueAsNumber: true })} />
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-indigo-600"
                {...gtForm.register('allowedClockIn')} />
              Apply on Clock In
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-indigo-600"
                {...gtForm.register('allowedClockOut')} />
              Apply on Clock Out
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="rounded border-gray-300 text-indigo-600"
              {...gtForm.register('isDefault')} />
            Set as default for this scope
          </label>
        </div>
      </Modal>

      {/* IP Modal */}
      <Modal open={ipModalOpen} onClose={() => setIpModalOpen(false)} title={editingIp ? 'Edit IP' : 'Add Allowed IP'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIpModalOpen(false)}>Cancel</Button>
            <Button onClick={ipForm.handleSubmit(onSubmitIp)}>{editingIp ? 'Update' : 'Add'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="IP Address" placeholder="192.168.1.0" error={ipForm.formState.errors.ipAddress?.message}
            {...ipForm.register('ipAddress', { required: 'Required' })} />
          <Input label="Description" {...ipForm.register('description')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Enabled</label>
            <select className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...ipForm.register('isEnabled')}>
              <option value={true}>Yes</option>
              <option value={false}>No</option>
            </select>
          </div>
        </div>
      </Modal>

      {/* Batch Modal */}
      <Modal open={batchModalOpen} onClose={() => setBatchModalOpen(false)} title={editingBatch ? 'Edit Batch' : 'New Batch Group'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setBatchModalOpen(false)}>Cancel</Button>
            <Button onClick={batchForm.handleSubmit(onSubmitBatch)}>{editingBatch ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Title" error={batchForm.formState.errors.title?.message}
            {...batchForm.register('title', { required: 'Required' })} />
        </div>
      </Modal>
      {/* Shift Modal */}
      <Modal open={shiftModalOpen} onClose={() => setShiftModalOpen(false)} title={editingShift ? 'Edit Shift' : 'Add Shift'}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShiftModalOpen(false)}>Cancel</Button>
            <Button onClick={shiftForm.handleSubmit(onSubmitShift)}>{editingShift ? 'Update' : 'Create'}</Button>
          </div>
        }>
        <div className="space-y-4">
          <Input label="Shift Name" error={shiftForm.formState.errors.name?.message}
            {...shiftForm.register('name', { required: 'Required' })} />
          <Input label="Start Time (HH:MM)" placeholder="09:00" {...shiftForm.register('startTime')} />
          <Input label="End Time (HH:MM)" placeholder="18:00" {...shiftForm.register('endTime')} />
          <Input label="Minimum Working Hours" type="number" {...shiftForm.register('minimumWorkingHour')} />
        </div>
      </Modal>
    </div>
  )
}
