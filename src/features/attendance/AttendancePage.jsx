import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, fetchFullView, create,
  fetchLateComeEarlyOut, deleteLateComeEarlyOut,
  fetchOvertime,
  selectAll, selectLoading, selectPagination, selectLateComeEarlyOut, selectOvertimeRecords,
} from './attendanceSlice'
import { submitRequest } from './regularisationSlice'
import { fetchAll as fetchDepartments } from '../departments/departmentsSlice'
import { fetchAll as fetchEmployees } from '../employees/employeesSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import Input from '../../components/common/Input'
import Pagination from '../../components/common/Pagination'
import SearchInput from '../../components/common/SearchInput'
import { formatDate } from '../../utils/formatters'
import ConfirmModal from '../../components/common/ConfirmModal'
import api from '../../services/api'

const REQUEST_TYPES = [
  { value: 'LATE_ARRIVAL',             label: 'Late Arrival' },
  { value: 'MISSING_PUNCH',            label: 'Missing Punch' },
  { value: 'WORKING_HOURS_CORRECTION', label: 'Working Hours Correction' },
  { value: 'OVERTIME_REQUEST',         label: 'Overtime Request' },
  { value: 'WRONG_STATUS',             label: 'Wrong Status' },
  { value: 'HALF_TO_FULL_DAY',         label: 'Half Day → Full Day' },
  { value: 'WORK_FROM_HOME',           label: 'Work From Home' },
  { value: 'OFFICIAL_DUTY',            label: 'Official Duty' },
]

const TABS = ['Attendance', 'Late / Early Out', 'Overtime']

const QUALITY_COLORS = {
  REGULAR:      'success',
  IRREGULAR:    'warning',
  REGULARISED:  'accent',
  ABSENT:       'danger',
  ON_LEAVE:     'info',
  HOLIDAY:      'default',
  WEEK_OFF:     'default',
}

const REG_STATUS_COLORS = {
  HAS_PENDING:  'warning',
  REGULARISED:  'success',
  NONE:         'default',
}

export default function AttendancePage() {
  const dispatch = useDispatch()
  const { user, isEmployee, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId
  const isEmp = isEmployee()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const lateComeEarlyOut = useSelector(selectLateComeEarlyOut)
  const overtimeRecords = useSelector(selectOvertimeRecords)
  const departments = useSelector(s => s.departments?.data || [])
  const employees = useSelector(s => s.employees?.data || [])

  const [tab, setTab] = useState('Attendance')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [search, setSearch] = useState('')
  const today = new Date().toISOString().split('T')[0]
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState(isEmp ? '' : today)
  const [filterDateTo, setFilterDateTo] = useState(isEmp ? '' : today)
  const [filterDept, setFilterDept] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })
  const [exportModal, setExportModal] = useState(false)
  const [exportMode, setExportMode] = useState('all')
  const [exportSingleId, setExportSingleId] = useState('')
  const [exportMultiIds, setExportMultiIds] = useState(new Set())
  const [exportSearch, setExportSearch] = useState('')
  const [exportDateFrom, setExportDateFrom] = useState('')
  const [exportDateTo, setExportDateTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [regModal, setRegModal] = useState({ open: false, record: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const { register: regRegister, handleSubmit: regHandleSubmit, watch: regWatch, reset: regReset, formState: { errors: regErrors } } = useForm()
  const selectedRegType = regWatch('requestType')

  useEffect(() => {
    dispatch(fetchLateComeEarlyOut())
    if (!isEmp) {
      dispatch(fetchDepartments())
      dispatch(fetchEmployees({ page: 0, size: 1000 }))
    }
  }, [dispatch, isEmp])

  useEffect(() => {
    if (!companyId) return
    if (isEmp) {
      const params = { page: 0, size: 20, isEmp: true }
      if (filterStatus) params.status = filterStatus
      if (filterDateFrom) params.from = filterDateFrom
      if (filterDateTo) params.to = filterDateTo
      dispatch(fetchFullView(params))
    } else {
      const params = { companyId, page: 0, size: 20 }
      if (filterStatus) params.status = filterStatus
      if (filterDateFrom) params.from = filterDateFrom
      if (filterDateTo) params.to = filterDateTo
      if (filterDept) params.departmentId = filterDept
      dispatch(fetchFullView(params))
    }
  }, [dispatch, companyId, isEmp, filterStatus, filterDateFrom, filterDateTo, filterDept])

  const filteredData = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(a => (a.employeeName || '').toLowerCase().includes(q))
  }, [data, search])

  const handleExport = async () => {
    if (!isEmp && !companyId) return
    setExporting(true)
    try {
      let url, headers = {}
      if (isEmp) {
        // Employee-facing export via ESS endpoint
        const params = new URLSearchParams()
        if (exportDateFrom) params.append('from', exportDateFrom)
        if (exportDateTo) params.append('to', exportDateTo)
        url = `/ess/my-attendance/export?${params}`
      } else {
        const params = new URLSearchParams({ companyId })
        if (exportMode === 'single' && exportSingleId) {
          params.append('employeeIds', exportSingleId)
        } else if (exportMode === 'multiple' && exportMultiIds.size > 0) {
          exportMultiIds.forEach(id => params.append('employeeIds', id))
        }
        if (exportDateFrom) params.append('from', exportDateFrom)
        if (exportDateTo) params.append('to', exportDateTo)
        url = `/attendance/export?${params}`
        headers = { 'X-Company-Id': companyId }
      }
      const res = await api.get(url, {
        responseType: 'blob',
        headers,
      })
      const blobUrl = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = 'attendance.xlsx'
      a.click()
      URL.revokeObjectURL(blobUrl)
      setExportModal(false)
      setExportMode('all')
      setExportSingleId('')
      setExportMultiIds(new Set())
      setExportSearch('')
      setExportDateFrom('')
      setExportDateTo('')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  const toggleExportEmployee = (id) => {
    setExportMultiIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredExportEmployees = useMemo(() => {
    if (!exportSearch) return employees
    const q = exportSearch.toLowerCase()
    return employees.filter(e =>
      `${e.firstName} ${e.lastName || ''} ${e.employeeCode || ''}`.toLowerCase().includes(q)
    )
  }, [employees, exportSearch])

  useEffect(() => {
    if (tab === 'Overtime' && companyId) {
      dispatch(fetchOvertime(companyId))
    }
  }, [tab, dispatch, companyId])

  const handleDeleteLate = (id) => {
    setConfirmModal({ open: true, id, action: 'deleteLate' })
  }
  const onConfirmDelete = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'deleteLate') await dispatch(deleteLateComeEarlyOut(id)).unwrap()
      toast.success('Deleted')
      setConfirmModal({ open: false, id: null, action: null })
    } catch (e) { toast.error(typeof e === 'string' ? e : e?.message || 'Failed') }
  }

  const openEdit = (rec) => {
    setEditTarget(rec)
    reset({
      employeeId: rec.employeeId || rec.employee?.id,
      attendanceDate: rec.attendanceDate,
      checkIn: rec.checkIn,
      checkOut: rec.checkOut,
    })
    setModalOpen(true)
  }

  const onSubmit = async (formData) => {
    try {
      const payload = { ...formData, companyId: companyId || user?.companyId }
      if (!payload.checkIn) payload.checkIn = null
      else if (payload.checkIn.length === 5) payload.checkIn += ':00'
      if (!payload.checkOut) payload.checkOut = null
      else if (payload.checkOut.length === 5) payload.checkOut += ':00'

      if (editTarget) {
        await api.put(`/attendance/${editTarget.id}`, payload)
        toast.success('Attendance updated')
        setEditTarget(null)
      } else {
        await dispatch(create(payload)).unwrap()
        toast.success('Attendance recorded')
      }
      setModalOpen(false)
      dispatch(fetchAll({ page: 0, size: 20, sort: 'attendanceDate,desc' }))
    } catch (e) { toast.error(typeof e === 'string' ? e : e?.message || 'Error') }
  }

  const attendanceColumns = [
    { accessorKey: 'employeeName', header: 'Employee' },
    { accessorKey: 'attendanceDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'checkIn', header: 'Check In', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'checkOut', header: 'Check Out', cell: ({ getValue }) => getValue() || '—' },
    { id: 'source', header: 'Source', cell: ({ row }) => {
      const src = row.original.clockInSource
      const deviceName = row.original.clockInDeviceName
      if (src === 'device') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium" title={deviceName || 'Biometric Device'}>
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
          {deviceName || 'Device'}
        </span>
      )
      if (src === 'mobile') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />Mobile
        </span>
      )
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />Manual
        </span>
      )
    }},
    { accessorKey: 'workedHour', header: 'Hours', cell: ({ getValue }) => {
      const v = getValue()
      if (!v && v !== 0) return '—'
      const h = Math.floor(v)
      const m = Math.round((v - h) * 60)
      return m > 0 ? `${h}h ${m}m` : `${h}h`
    }},
    { id: 'ot', header: 'OT', cell: ({ row }) => {
      const ot = row.original.attendanceOvertime
      if (!ot || ot === 0) return <span className="text-gray-300 text-xs">—</span>
      const h = Math.floor(ot)
      const m = Math.round((ot - h) * 60)
      const label = h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
      return <span className="text-indigo-600 font-medium text-sm">{label}</span>
    }},
    { id: 'status', header: 'Status', cell: ({ row }) => {
      const qs = row.original.displayStatus || row.original.attendanceStatus || 'REGULAR'
      const labels = { REGULAR: 'Regular', IRREGULAR: 'Irregular', REGULARISED: 'Regularised', ABSENT: 'Absent', ON_LEAVE: 'On Leave', HOLIDAY: 'Holiday', WEEK_OFF: 'Week Off' }
      const label = qs === 'ON_LEAVE' && row.original.leaveTypeName ? row.original.leaveTypeName : (labels[qs] || qs)
      return <Badge label={label} variant={QUALITY_COLORS[qs] || 'default'} />
    }},
    { id: 'regularisation', header: 'Regularisation', cell: ({ row }) => {
      const rec = row.original
      const rs = rec.regularisationStatus
      const as_ = rec.attendanceStatus

      if (rs === 'REGULARISED' || as_ === 'REGULARISED') {
        return <Badge label="Regularised" variant="success" />
      }
      if (rs === 'HAS_PENDING') {
        return <Badge label="Pending" variant="warning" />
      }
      if (isEmp && as_ === 'IRREGULAR' && (!rs || rs === 'NONE')) {
        return (
          <Button size="sm" variant="warning" onClick={() => { regReset({ attendanceId: rec.id }); setRegModal({ open: true, record: rec }) }}>
            Request
          </Button>
        )
      }
      return <span className="text-gray-300 text-xs">—</span>
    }},
    { id: 'actions', header: '', cell: ({ row }) => {
      if (!isEmp) {
        if (row.original.id) {
          return <Button size="sm" variant="secondary" onClick={() => openEdit(row.original)}>Edit</Button>
        }
        const ds = row.original.displayStatus
        if (ds === 'ABSENT') {
          return (
            <Button size="sm" variant="secondary" onClick={() => {
              setEditTarget(null)
              reset({ employeeId: row.original.employeeId, attendanceDate: row.original.attendanceDate })
              setModalOpen(true)
            }}>+ Record</Button>
          )
        }
      }
      return null
    }},
  ]

  const lateColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { id: 'date', header: 'Attendance Date', cell: ({ row }) => formatDate(row.original.attendance?.attendanceDate) },
    { id: 'regularised', header: 'Regularised', cell: ({ row }) => (
      row.original.isRegularised
        ? <Badge label="Yes" variant="success" />
        : <Badge label="No" variant="default" />
    )},
    { accessorKey: 'type', header: 'Type', cell: ({ getValue }) => {
      const v = getValue()
      return <Badge label={v === 'LATE_COME' ? 'Late Come' : 'Early Out'} variant={v === 'LATE_COME' ? 'warning' : 'accent'} />
    }},
    { id: 'actions', header: '', cell: ({ row }) => !isEmp ? (
      <Button size="sm" variant="danger" onClick={() => handleDeleteLate(row.original.id)}>Delete</Button>
    ) : null },
  ]

  const overtimeColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { accessorKey: 'month', header: 'Month' },
    { accessorKey: 'year', header: 'Year' },
    { accessorKey: 'overtimeHours', header: 'OT Hours', cell: ({ getValue }) => getValue() != null ? `${getValue()}h` : '—' },
    { id: 'status', header: 'Status', cell: () => <Badge label="Auto-Calculated" variant="success" /> },
  ]

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Track employee attendance records"
        actions={
          <>
            <SearchInput onSearch={setSearch} className="w-48" />
            {tab === 'Attendance' && (
              <>
                <Button variant="secondary" onClick={() => setExportModal(true)}>Export Excel</Button>
                {!isEmp && (
                  <Button onClick={() => { setEditTarget(null); reset({}); setModalOpen(true) }}>+ Record</Button>
                )}
              </>
            )}
          </>
        }
      />

      {/* Filters */}
      {tab === 'Attendance' && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          {!isEmp && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-medium">Status:</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">All</option>
                <option value="REGULAR">Regular</option>
                <option value="IRREGULAR">Irregular</option>
                <option value="REGULARISED">Regularised</option>
                <option value="ABSENT">Absent</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="HOLIDAY">Holiday</option>
                <option value="WEEK_OFF">Week Off</option>
              </select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">From:</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">To:</label>
            <input type="date" value={filterDateTo} max={today} onChange={e => setFilterDateTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
          {!isEmp && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500 font-medium">Department:</label>
              <select
                value={filterDept}
                onChange={e => setFilterDept(e.target.value)}
                className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                <option value="">All</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          )}
          {(filterStatus || filterDateFrom || filterDateTo || filterDept) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterDateFrom(isEmp ? '' : today); setFilterDateTo(isEmp ? '' : today); setFilterDept('') }}
              className="text-xs text-indigo-600 hover:underline ml-1"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      <div className="flex gap-2 border-b border-gray-200 mb-4">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'Attendance' && (
        <>
          <DataTable columns={attendanceColumns} data={filteredData} loading={loading} />
          <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => {
  if (isEmp) {
    dispatch(fetchAll({ page: p, size: 20, sort: 'attendanceDate,desc' }))
  } else {
    const params = { companyId, page: p, size: 20 }
    if (filterStatus) params.status = filterStatus
    if (filterDateFrom) params.from = filterDateFrom
    if (filterDateTo) params.to = filterDateTo
    if (filterDept) params.departmentId = filterDept
    dispatch(fetchFullView(params))
  }
}} />
        </>
      )}

      {tab === 'Late / Early Out' && (
        <DataTable columns={lateColumns} data={lateComeEarlyOut} loading={loading} />
      )}

      {tab === 'Overtime' && (
        <DataTable columns={overtimeColumns} data={overtimeRecords} loading={loading} />
      )}

      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, id: null, action: null })}
        onConfirm={onConfirmDelete}
        title="Delete Late / Early Out Record"
        message="Are you sure you want to delete this record? This action cannot be undone."
        confirmLabel="Delete"
        loading={loading}
      />

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditTarget(null) }} title={editTarget ? 'Edit Attendance' : 'Record Attendance'}
        footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { setModalOpen(false); setEditTarget(null) }}>Cancel</Button><Button onClick={handleSubmit(onSubmit)}>{editTarget ? 'Update' : 'Save'}</Button></div>}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
            <select
              {...register('employeeId', { required: 'Required' })}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${errors.employeeId ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select Employee</option>
              {employees.map(e => (
                <option key={e.id} value={e.id}>
                  {e.badgeId ? `${e.badgeId} - ` : ''}{e.firstName} {e.lastName}
                </option>
              ))}
            </select>
            {errors.employeeId && <span className="text-red-500 text-xs mt-1 block">{errors.employeeId.message}</span>}
          </div>
          <Input label="Date" type="date" error={errors.attendanceDate?.message} {...register('attendanceDate', { required: 'Required' })} />
          <Input label="Check In Time" type="time" {...register('checkIn')} />
          <Input label="Check Out Time" type="time" {...register('checkOut')} />
        </div>
      </Modal>

      {/* Regularisation Request Modal (employee inline) */}
      <Modal
        open={regModal.open}
        onClose={() => { setRegModal({ open: false, record: null }); regReset() }}
        title="Request Regularisation"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setRegModal({ open: false, record: null }); regReset() }}>Cancel</Button>
            <Button onClick={regHandleSubmit(async (data) => {
              try {
                await dispatch(submitRequest(data)).unwrap()
                toast.success('Regularisation request submitted')
                setRegModal({ open: false, record: null })
                regReset()
                dispatch(fetchAll({ page: 0, size: 20, sort: 'attendanceDate,desc' }))
              } catch (e) { toast.error(typeof e === 'string' ? e : e?.message || 'Failed to submit') }
            })} loading={loading}>Submit</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {regModal.record && (
            <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-sm text-yellow-800">
              <span className="font-medium">{formatDate(regModal.record.attendanceDate)}</span>
              {' — '}Check in: {regModal.record.checkIn || '—'} / Check out: {regModal.record.checkOut || '—'}
            </div>
          )}
          <input type="hidden" {...regRegister('attendanceId')} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
            <select
              {...regRegister('requestType', { required: 'Select a request type' })}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${regErrors.requestType ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select type</option>
              {REQUEST_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {regErrors.requestType && <span className="text-red-500 text-xs mt-1 block">{regErrors.requestType.message}</span>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              {...regRegister('reason', { required: 'Reason is required' })}
              rows={3}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${regErrors.reason ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Explain the reason for this request..."
            />
            {regErrors.reason && <span className="text-red-500 text-xs mt-1 block">{regErrors.reason.message}</span>}
          </div>
          {['MISSING_PUNCH', 'WORKING_HOURS_CORRECTION'].includes(selectedRegType) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check In</label>
                <input type="datetime-local" {...regRegister('requestedCheckIn')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check Out</label>
                <input type="datetime-local" {...regRegister('requestedCheckOut')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
          )}
          {selectedRegType === 'OVERTIME_REQUEST' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested Overtime Hours</label>
              <input type="number" step="0.5" min="0" {...regRegister('requestedOvertimeHours')}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. 2.5" />
            </div>
          )}
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        open={exportModal}
        onClose={() => { setExportModal(false); setExportMode('all'); setExportSingleId(''); setExportMultiIds(new Set()); setExportSearch(''); setExportDateFrom(''); setExportDateTo('') }}
        title="Export Attendance"
        size="md"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setExportModal(false); setExportMode('all'); setExportSingleId(''); setExportMultiIds(new Set()); setExportSearch(''); setExportDateFrom(''); setExportDateTo('') }}>Cancel</Button>
            <Button
              onClick={handleExport}
              loading={exporting}
              disabled={
                exporting ||
                (!isEmp && exportMode === 'single' && !exportSingleId) ||
                (!isEmp && exportMode === 'multiple' && exportMultiIds.size === 0)
              }
            >
              {exporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Mode selector - only for admin */}
          {!isEmp && (
            <div className="flex gap-2">
              {[
                { value: 'all', label: 'All Employees' },
                { value: 'single', label: 'Single Employee' },
                { value: 'multiple', label: 'Multiple Employees' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => { setExportMode(opt.value); setExportSingleId(''); setExportMultiIds(new Set()); setExportSearch('') }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    exportMode === opt.value
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input
                type="date"
                value={exportDateFrom}
                onChange={e => setExportDateFrom(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input
                type="date"
                value={exportDateTo}
                onChange={e => setExportDateTo(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Single employee - admin only */}
          {!isEmp && exportMode === 'single' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Select Employee</label>
              <select
                value={exportSingleId}
                onChange={e => setExportSingleId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">— choose employee —</option>
                {employees.map(e => (
                  <option key={e.id} value={e.id}>
                    {e.firstName} {e.lastName || ''}{e.employeeCode ? ` (${e.employeeCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Multiple employees - admin only */}
          {!isEmp && exportMode === 'multiple' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">Select Employees</label>
                {exportMultiIds.size > 0 && (
                  <span className="text-xs text-indigo-600 font-medium">{exportMultiIds.size} selected</span>
                )}
              </div>
              <input
                type="text"
                placeholder="Search employees..."
                value={exportSearch}
                onChange={e => setExportSearch(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-100">
                {filteredExportEmployees.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No employees found</p>
                ) : (
                  filteredExportEmployees.map(e => (
                    <label key={e.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportMultiIds.has(e.id)}
                        onChange={() => toggleExportEmployee(e.id)}
                        className="accent-indigo-600"
                      />
                      <span className="text-sm text-gray-700">
                        {e.firstName} {e.lastName || ''}
                        {e.employeeCode && <span className="text-gray-400 ml-1">({e.employeeCode})</span>}
                      </span>
                    </label>
                  ))
                )}
              </div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setExportMultiIds(new Set(filteredExportEmployees.map(e => e.id)))}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Select all
                </button>
                {exportMultiIds.size > 0 && (
                  <button onClick={() => setExportMultiIds(new Set())} className="text-xs text-gray-400 hover:underline">
                    Clear
                  </button>
                )}
              </div>
            </div>
          )}

          {isEmp && (
            <p className="text-sm text-gray-500">Your attendance records will be exported.</p>
          )}
          {!isEmp && exportMode === 'all' && (
            <p className="text-sm text-gray-500">All attendance records for this company will be exported.</p>
          )}
        </div>
      </Modal>
    </div>
  )
}
