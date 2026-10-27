import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { MapPinIcon } from '@heroicons/react/24/outline'
import {
  fetchAll, fetchFullView, create,
  fetchLateComeEarlyOut, deleteLateComeEarlyOut,
  fetchOvertime, fetchAttendanceActivities,
  selectAll, selectLoading, selectPagination, selectLateComeEarlyOut, selectOvertimeRecords, selectActivities,
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
import { formatAttendanceTime, formatDate } from '../../utils/formatters'
import ConfirmModal from '../../components/common/ConfirmModal'
import api from '../../services/api'

const TABS = ['Attendance', 'Punches', 'Late / Early Out', 'Overtime']

function LocationLink({ latitude, longitude, address }) {
  if (latitude == null || longitude == null) return <span className="text-gray-300 text-xs">—</span>
  return (
    <a
      href={`https://maps.google.com/?q=${latitude},${longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-64 items-start gap-1 text-xs text-indigo-600 hover:underline"
      title={address || `${latitude}, ${longitude}`}
    >
      <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="line-clamp-2">{address || `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`}</span>
    </a>
  )
}

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
  const navigate = useNavigate()
  const { user, isEmployee, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId
  const isEmp = isEmployee()
  const data = useSelector(selectAll)
  const loading = useSelector(selectLoading)
  const pagination = useSelector(selectPagination)
  const lateComeEarlyOut = useSelector(selectLateComeEarlyOut)
  const overtimeRecords = useSelector(selectOvertimeRecords)
  const activitiesState = useSelector(selectActivities)
  const activities = activitiesState?.content || activitiesState || []
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

  useEffect(() => {
    if (tab !== 'Punches') return
    const params = { page: 0, size: 100, sort: 'attendanceDate,desc' }
    if (filterDateFrom) params.from = filterDateFrom
    if (filterDateTo) params.to = filterDateTo
    dispatch(fetchAttendanceActivities(params))
  }, [tab, dispatch, filterDateFrom, filterDateTo])

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
    { accessorKey: 'companyName', header: 'Branch', cell: ({ getValue }) => getValue() || '—' },
    { accessorKey: 'attendanceDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { id: 'checkIn', header: 'Check In', cell: ({ row }) => formatAttendanceTime(row.original.checkIn, row.original.checkInUtc) },
    { id: 'checkOut', header: 'Check Out', cell: ({ row }) => formatAttendanceTime(row.original.checkOut, row.original.checkOutUtc) },
    { id: 'source', header: 'Source', cell: ({ row }) => {
      const src = row.original.clockOutSource || row.original.clockInSource
      const deviceName = row.original.clockOutDeviceName || row.original.clockInDeviceName
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
      if (src === 'web') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />Web
        </span>
      )
      if (src === 'manual') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-50 text-gray-600 rounded-full text-xs font-medium">
          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />Manual
        </span>
      )
      return <span className="text-gray-300 text-xs">—</span>
    }},
    { accessorKey: 'workedHour', header: 'Hours', cell: ({ getValue }) => {
      const v = getValue()
      if (!v && v !== 0) return '—'
      const h = Math.floor(v)
      const m = Math.round((v - h) * 60)
      return m > 0 ? `${h}h ${m}m` : `${h}h`
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
      // HR/Admin roles are gated out of self-filing below (they use Edit instead) — but an
      // HR/Admin is very often also an employee with their own attendance, so let them file a
      // request on their own row the same way a plain employee would.
      const isOwnRecord = user?.employeeId != null && rec.employeeId === user.employeeId
      const canRequest = isEmp || isOwnRecord

      if (rs === 'REGULARISED' || as_ === 'REGULARISED') {
        return <Badge label="Regularised" variant="success" />
      }
      if (rs === 'HAS_PENDING') {
        if (canRequest) return <Badge label="Pending" variant="warning" />
        return (
          <button
            className="text-xs font-medium text-amber-700 underline hover:text-amber-900"
            onClick={() => navigate('/attendance/regularisation')}
          >
            Pending Approval
          </button>
        )
      }
      // HR/Admin viewing someone else's row files on that employee's behalf via employeeId —
      // still goes through the normal pending-approval queue, same as a self-filed request.
      const onBehalfEmployeeId = canRequest ? undefined : rec.employeeId

      if (as_ === 'IRREGULAR' && (!rs || rs === 'NONE')) {
        return (
          <Button size="sm" variant="secondary" onClick={() => {
            const requestType = !rec.checkOut
              ? 'MISSING_PUNCH'
              : (rec.minimumHour > 0 && rec.workedHour < rec.minimumHour)
                ? 'WORKING_HOURS_CORRECTION'
                : 'WRONG_STATUS'
            regReset({ attendanceId: rec.id, requestType })
            setRegModal({ open: true, record: rec, noAttendance: false, employeeId: onBehalfEmployeeId })
          }}>
            Regularize
          </Button>
        )
      }
      // No attendance row yet (Absent / On Leave / Holiday / Week Off) — employee can claim they
      // were actually present that day; HR/Admin can file on the employee's behalf too.
      const ds = rec.displayStatus
      if (!rec.id && ['ABSENT', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF'].includes(ds) && (!rs || rs === 'NONE')) {
        return (
          <Button size="sm" variant="secondary" onClick={() => {
            regReset({ attendanceDate: rec.attendanceDate, requestType: 'MISSING_PUNCH' })
            setRegModal({ open: true, record: rec, noAttendance: true, employeeId: onBehalfEmployeeId })
          }}>
            Regularize
          </Button>
        )
      }
      return <span className="text-gray-300 text-xs">—</span>
    }},
    { id: 'checkInLocation', header: 'Check In Location', cell: ({ row }) => (
      <LocationLink latitude={row.original.checkInLatitude} longitude={row.original.checkInLongitude} address={row.original.checkInAddress} />
    )},
    { id: 'checkOutLocation', header: 'Check Out Location', cell: ({ row }) => (
      <LocationLink latitude={row.original.checkOutLatitude} longitude={row.original.checkOutLongitude} address={row.original.checkOutAddress} />
    )},
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

  const activityColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => {
      const emp = row.original.employee
      return emp ? `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—' : '—'
    }},
    { accessorKey: 'attendanceDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
    { accessorKey: 'clockIn', header: 'Clock In', cell: ({ getValue }) => formatAttendanceTime(getValue()) },
    { id: 'clockInLocation', header: 'Clock In Location', cell: ({ row }) => (
      <LocationLink latitude={row.original.clockInLatitude} longitude={row.original.clockInLongitude} address={row.original.clockInAddress} />
    )},
    { accessorKey: 'clockOut', header: 'Clock Out', cell: ({ getValue }) => formatAttendanceTime(getValue()) },
    { id: 'clockOutLocation', header: 'Clock Out Location', cell: ({ row }) => (
      <LocationLink latitude={row.original.clockOutLatitude} longitude={row.original.clockOutLongitude} address={row.original.clockOutAddress} />
    )},
  ]

  return (
    <div className="attendance-workspace attendance-records-page">
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

      {tab === 'Punches' && (
        <DataTable columns={activityColumns} data={activities} loading={loading} />
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
                const payload = { ...data }
                if (regModal.noAttendance) delete payload.attendanceId
                else delete payload.attendanceDate
                if (regModal.employeeId != null) payload.employeeId = regModal.employeeId
                await dispatch(submitRequest(payload)).unwrap()
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
            <div className="space-y-2">
              {regModal.employeeId != null && (
                <div className="bg-indigo-50 border border-indigo-200 rounded px-3 py-2 text-sm text-indigo-800">
                  Filing on behalf of <span className="font-semibold">{regModal.record.employeeName}</span>. This will still go to the pending approval queue.
                </div>
              )}
              <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-sm text-yellow-800">
                <span className="font-medium">{formatDate(regModal.record.attendanceDate)}</span>
                {regModal.noAttendance ? (
                  <>{' — '}Currently marked <span className="font-medium">{{
                    ABSENT: 'Absent', ON_LEAVE: 'On Leave', HOLIDAY: 'Holiday', WEEK_OFF: 'Week Off',
                  }[regModal.record.displayStatus] || regModal.record.displayStatus}</span>. No attendance record exists for this day yet.</>
                ) : (
                  <>{' — '}Check in: {formatAttendanceTime(regModal.record.checkIn, regModal.record.checkInUtc)} / Check out: {formatAttendanceTime(regModal.record.checkOut, regModal.record.checkOutUtc)}</>
                )}
              </div>
              {!regModal.noAttendance && regModal.record.checkOut && regModal.record.minimumHour > 0
                && regModal.record.workedHour < regModal.record.minimumHour && (
                <div className="bg-indigo-50 border border-indigo-200 rounded px-3 py-2 text-sm text-indigo-800">
                  <span className="font-semibold">Recommended: Working Hours Correction.</span>
                  {' '}Your recorded hours are below the assigned shift hours. Choose Overtime only if you actually worked beyond the shift.
                </div>
              )}
            </div>
          )}
          <input type="hidden" {...regRegister('attendanceId')} />
          <input type="hidden" {...regRegister('attendanceDate')} />
          {/* Request type is auto-derived when the Regularize button is clicked (missing
              punch / short hours / wrong status) — no need to ask the user to pick a type. */}
          <input type="hidden" {...regRegister('requestType')} />
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
          {(regModal.noAttendance || ['MISSING_PUNCH', 'WORKING_HOURS_CORRECTION'].includes(selectedRegType)) && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Requested Check In{regModal.noAttendance && <span className="text-red-500"> *</span>}
                </label>
                <input type="time" {...regRegister('requestedCheckIn', { required: regModal.noAttendance ? 'Check-in time is required' : false })}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                {regErrors.requestedCheckIn && <span className="text-red-500 text-xs mt-1 block">{regErrors.requestedCheckIn.message}</span>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check Out</label>
                <input type="time" {...regRegister('requestedCheckOut')}
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
