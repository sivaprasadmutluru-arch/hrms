import { useState, useEffect, useMemo, useCallback } from 'react'
import toast from 'react-hot-toast'
import {
  MapPinIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CalendarDaysIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  XCircleIcon,
  UserCircleIcon,
  BuildingOffice2Icon,
} from '@heroicons/react/24/outline'
import api from '../../services/api'
import useAuth from '../../hooks/useAuth'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Spinner from '../../components/common/Spinner'
import Modal from '../../components/common/Modal'
import { formatAttendanceTime, formatDate } from '../../utils/formatters'

const QUALITY_COLORS = {
  REGULAR:     'success',
  IRREGULAR:   'warning',
  REGULARISED: 'accent',
  ABSENT:      'danger',
  ON_LEAVE:    'info',
  HOLIDAY:     'default',
  WEEK_OFF:    'default',
  EXEMPT:      'default',
}

const QUALITY_LABELS = {
  REGULAR:     'Regular',
  IRREGULAR:   'Irregular',
  REGULARISED: 'Regularised',
  ABSENT:      'Absent',
  ON_LEAVE:    'On Leave',
  HOLIDAY:     'Holiday',
  WEEK_OFF:    'Week Off',
  EXEMPT:      'Not Required',
}

function LocationLink({ latitude, longitude, address }) {
  if (latitude == null || longitude == null) return <span className="text-gray-300 text-xs">—</span>
  return (
    <a
      href={`https://maps.google.com/?q=${latitude},${longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-[200px] items-start gap-1 text-xs text-indigo-600 hover:underline"
      title={address || `${latitude}, ${longitude}`}
    >
      <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-500" />
      <span className="truncate">{address || `${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)}`}</span>
    </a>
  )
}

function SourceBadge({ source, deviceName }) {
  if (source === 'device') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-xs font-medium" title={deviceName || 'Biometric Device'}>
        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
        {deviceName || 'Device'}
      </span>
    )
  }
  if (source === 'mobile') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-medium">
        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />Mobile
      </span>
    )
  }
  if (source === 'web') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-medium">
        <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />Web
      </span>
    )
  }
  if (source === 'manual') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs font-medium">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />Manual
      </span>
    )
  }
  return null
}

function formatHours(val) {
  if (val == null || val === undefined || isNaN(val)) return '—'
  const num = Number(val)
  if (num <= 0) return '0h'
  const h = Math.floor(num)
  const m = Math.round((num - h) * 60)
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

export default function IndividualAttendanceView({
  employeeId,
  companyId: propCompanyId,
  employeeName: propEmployeeName,
  employeeCode: propEmployeeCode,
  allEmployees = [],
  isModal = false,
  onClose,
}) {
  const { user, isEmployee, effectiveCompanyId, isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager } = useAuth()
  const isEmp = isEmployee()
  const canManage = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()
  
  const [selectedEmpId, setSelectedEmpId] = useState(employeeId || user?.employeeId)
  useEffect(() => {
    if (employeeId) setSelectedEmpId(employeeId)
  }, [employeeId])

  const effectiveId = selectedEmpId || employeeId || user?.employeeId
  const targetCompanyId = propCompanyId || effectiveCompanyId || user?.companyId

  // Dubai / Gulf business timezone alignment
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' })
  const defaultMonthStart = today.substring(0, 7) + '-01'

  const [dateFrom, setDateFrom] = useState(defaultMonthStart)
  const [dateTo, setDateTo] = useState(today)
  const [selectedFrom, setSelectedFrom] = useState(defaultMonthStart)
  const [selectedTo, setSelectedTo] = useState(today)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [employeeDetails, setEmployeeDetails] = useState(null)

  // Edit / Record Modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [editCheckIn, setEditCheckIn] = useState('')
  const [editCheckOut, setEditCheckOut] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)

  // Regularize Modal state
  const [regModalOpen, setRegModalOpen] = useState(false)
  const [regRecord, setRegRecord] = useState(null)
  const [regReason, setRegReason] = useState('')
  const [regReqCheckIn, setRegReqCheckIn] = useState('')
  const [regReqCheckOut, setRegReqCheckOut] = useState('')
  const [submittingReg, setSubmittingReg] = useState(false)

  // Fetch employee details if not provided
  useEffect(() => {
    if (!effectiveId) return
    let active = true
    const config = targetCompanyId ? { headers: { 'X-Company-Id': targetCompanyId } } : {}
    api.get(`/employees/${effectiveId}`, config)
      .then(res => {
        if (active) setEmployeeDetails(res.data)
      })
      .catch(() => {
        // Fallback gracefully to props
      })
    return () => { active = false }
  }, [effectiveId, targetCompanyId])

  // Load attendance data
  const loadAttendance = useCallback(async () => {
    if (!effectiveId) return
    setLoading(true)
    try {
      const isSelf = isEmp && (!employeeId || employeeId === user?.employeeId)
      const url = isSelf ? '/ess/my-attendance/full-view' : '/attendance/full-view'
      const params = {
        page: 0,
        size: 150,
      }
      if (!isSelf && targetCompanyId) params.companyId = targetCompanyId
      if (!isSelf && effectiveId) params.employeeId = effectiveId
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo

      const headers = targetCompanyId ? { 'X-Company-Id': targetCompanyId } : {}
      const res = await api.get(url, { params, headers })
      const list = res.data?.content || (Array.isArray(res.data) ? res.data : [])
      setRecords(list)
    } catch (err) {
      toast.error('Failed to load attendance history')
    } finally {
      setLoading(false)
    }
  }, [effectiveId, isEmp, employeeId, user?.employeeId, targetCompanyId, dateFrom, dateTo])

  useEffect(() => {
    loadAttendance()
  }, [loadAttendance])

  // Preset Date Handlers
  const handlePreset = (preset) => {
    const now = new Date()
    let from = ''
    let to = today

    if (preset === 'THIS_MONTH') {
      from = today.substring(0, 7) + '-01'
      to = today
    } else if (preset === 'LAST_MONTH') {
      const firstOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      from = firstOfLastMonth.toLocaleDateString('en-CA')
      to = lastOfLastMonth.toLocaleDateString('en-CA')
    } else if (preset === 'LAST_90_DAYS') {
      const past = new Date(now)
      past.setDate(past.getDate() - 90)
      from = past.toLocaleDateString('en-CA')
      to = today
    } else if (preset === 'THIS_YEAR') {
      from = `${now.getFullYear()}-01-01`
      to = today
    }

    setSelectedFrom(from)
    setSelectedTo(to)
    setDateFrom(from)
    setDateTo(to)
  }

  const applyCustomFilter = () => {
    if (!selectedFrom || !selectedTo) {
      toast.error('Please select both From and To dates')
      return
    }
    if (selectedFrom > selectedTo) {
      toast.error('From date cannot be after To date')
      return
    }
    setDateFrom(selectedFrom)
    setDateTo(selectedTo)
  }

  // Summary Metrics Computation
  const metrics = useMemo(() => {
    let present = 0
    let irregular = 0
    let absent = 0
    let onLeave = 0
    let holidayOrOff = 0
    let exempt = 0
    let totalWorkedHours = 0

    records.forEach(r => {
      const s = r.displayStatus || r.attendanceStatus || 'REGULAR'
      if (s === 'REGULAR' || s === 'REGULARISED') present++
      else if (s === 'IRREGULAR') irregular++
      else if (s === 'ABSENT') absent++
      else if (s === 'ON_LEAVE') onLeave++
      else if (s === 'HOLIDAY' || s === 'WEEK_OFF') holidayOrOff++
      else if (s === 'EXEMPT') exempt++

      if (r.workedHour && !isNaN(r.workedHour)) {
        totalWorkedHours += Number(r.workedHour)
      }
    })

    const workingDaysCount = present + irregular
    const avgDailyHours = workingDaysCount > 0 ? (totalWorkedHours / workingDaysCount) : 0

    return {
      totalDays: records.length,
      present,
      irregular,
      absent,
      onLeave,
      holidayOrOff,
      exempt,
      totalWorkedHours,
      avgDailyHours,
    }
  }, [records])

  // Filtered rows for table
  const filteredRecords = useMemo(() => {
    if (statusFilter === 'ALL') return records
    return records.filter(r => {
      const s = r.displayStatus || r.attendanceStatus || 'REGULAR'
      if (statusFilter === 'PRESENT') return s === 'REGULAR' || s === 'REGULARISED'
      if (statusFilter === 'IRREGULAR') return s === 'IRREGULAR'
      if (statusFilter === 'ABSENT') return s === 'ABSENT'
      if (statusFilter === 'ON_LEAVE') return s === 'ON_LEAVE'
      if (statusFilter === 'HOLIDAY_OFF') return s === 'HOLIDAY' || s === 'WEEK_OFF'
      return true
    })
  }, [records, statusFilter])

  // Export to Excel for this specific employee
  const handleExport = async () => {
    if (!effectiveId) return
    setExporting(true)
    try {
      const params = new URLSearchParams()
      if (targetCompanyId) params.append('companyId', targetCompanyId)
      params.append('employeeIds', effectiveId)
      if (dateFrom) params.append('from', dateFrom)
      if (dateTo) params.append('to', dateTo)

      const res = await api.get(`/attendance/export?${params.toString()}`, {
        responseType: 'blob',
        headers: targetCompanyId ? { 'X-Company-Id': targetCompanyId } : {},
      })
      const blobUrl = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = blobUrl
      const empName = employeeDetails
        ? `${employeeDetails.firstName || ''}_${employeeDetails.lastName || ''}`.trim()
        : propEmployeeName || `employee_${effectiveId}`
      const cleanName = empName.toLowerCase().replace(/[^a-z0-9]+/g, '_')
      a.download = `attendance_${cleanName}_${dateFrom}_to_${dateTo}.xlsx`
      a.click()
      URL.revokeObjectURL(blobUrl)
      toast.success('Attendance history exported')
    } catch {
      toast.error('Export failed')
    } finally {
      setExporting(false)
    }
  }

  // Open Edit Modal
  const handleOpenEdit = (rec) => {
    setEditingRecord(rec)
    setEditCheckIn(rec.checkIn ? String(rec.checkIn).substring(0, 5) : '')
    setEditCheckOut(rec.checkOut ? String(rec.checkOut).substring(0, 5) : '')
    setEditModalOpen(true)
  }

  // Save Edit
  const handleSaveEdit = async () => {
    if (!editingRecord) return
    setSavingEdit(true)
    try {
      const payload = {
        employeeId: effectiveId,
        attendanceDate: editingRecord.attendanceDate,
        checkIn: editCheckIn ? (editCheckIn.length === 5 ? `${editCheckIn}:00` : editCheckIn) : null,
        checkOut: editCheckOut ? (editCheckOut.length === 5 ? `${editCheckOut}:00` : editCheckOut) : null,
        companyId: targetCompanyId,
      }
      if (editingRecord.id) {
        await api.put(`/attendance/${editingRecord.id}`, payload)
        toast.success('Attendance record updated')
      } else {
        await api.post('/attendance', payload)
        toast.success('Attendance recorded')
      }
      setEditModalOpen(false)
      loadAttendance()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update record')
    } finally {
      setSavingEdit(false)
    }
  }

  // Open Regularise Modal
  const handleOpenRegularise = (rec) => {
    setRegRecord(rec)
    setRegReason('')
    setRegReqCheckIn(rec.checkIn ? String(rec.checkIn).substring(0, 5) : '09:00')
    setRegReqCheckOut(rec.checkOut ? String(rec.checkOut).substring(0, 5) : '18:00')
    setRegModalOpen(true)
  }

  // Submit Regularise
  const handleSubmitRegularise = async () => {
    if (!regRecord || !regReason.trim()) {
      toast.error('Please provide a reason')
      return
    }
    setSubmittingReg(true)
    try {
      const isMissingPunch = !regRecord.checkOut
      const isShortHours = regRecord.minimumHour > 0 && regRecord.workedHour < regRecord.minimumHour
      const requestType = !regRecord.id
        ? 'MISSING_PUNCH'
        : isMissingPunch
          ? 'MISSING_PUNCH'
          : isShortHours
            ? 'WORKING_HOURS_CORRECTION'
            : 'WRONG_STATUS'

      const payload = {
        attendanceId: regRecord.id || null,
        attendanceDate: regRecord.attendanceDate,
        requestType,
        reason: regReason.trim(),
        requestedCheckIn: regReqCheckIn ? `${regReqCheckIn}:00` : null,
        requestedCheckOut: regReqCheckOut ? `${regReqCheckOut}:00` : null,
        employeeId: effectiveId,
      }

      await api.post('/attendance-regularisations/request', payload)
      toast.success('Regularisation request submitted')
      setRegModalOpen(false)
      loadAttendance()
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to submit regularisation')
    } finally {
      setSubmittingReg(false)
    }
  }

  const displayName = employeeDetails
    ? `${employeeDetails.firstName || ''} ${employeeDetails.lastName || ''}`.trim()
    : propEmployeeName || 'Employee'
  const displayCode = employeeDetails?.badgeId || employeeDetails?.employeeCode || propEmployeeCode || ''
  const displayDept = employeeDetails?.departmentName || employeeDetails?.department?.name || ''
  const displayRole = employeeDetails?.jobRoleName || employeeDetails?.jobPositionName || ''
  const displayBranch = employeeDetails?.companyName || ''

  return (
    <div className={`individual-attendance-container space-y-4 ${isModal ? 'p-1' : ''}`}>
      {/* ── Employee Header Strip ── */}
      <div className="bg-gradient-to-r from-indigo-50/70 via-white to-slate-50 border border-indigo-100/80 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'EM'}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{displayName}</h2>
              {displayCode && (
                <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {displayCode}
                </span>
              )}
              {canManage && allEmployees && allEmployees.length > 1 && (
                <select
                  value={effectiveId || ''}
                  onChange={e => setSelectedEmpId(Number(e.target.value))}
                  className="text-xs border border-indigo-200 rounded-lg px-2 py-1 bg-white text-indigo-900 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-2xs"
                  title="Switch employee"
                >
                  {allEmployees.map(e => (
                    <option key={e.id} value={e.id}>
                      Switch: {e.firstName} {e.lastName || ''} ({e.badgeId || e.employeeCode || `ID:${e.id}`})
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-0.5">
              {displayRole && <span className="font-medium text-gray-700">{displayRole}</span>}
              {displayRole && displayDept && <span>•</span>}
              {displayDept && <span>{displayDept}</span>}
              {displayBranch && (
                <>
                  <span>•</span>
                  <span className="inline-flex items-center gap-1">
                    <BuildingOffice2Icon className="w-3.5 h-3.5 text-gray-400" />
                    {displayBranch}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <Button
            size="sm"
            variant="secondary"
            onClick={loadAttendance}
            loading={loading}
            title="Refresh Attendance"
            className="flex items-center gap-1"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={handleExport}
            loading={exporting}
            disabled={exporting || records.length === 0}
            className="flex items-center gap-1"
            title="Download Excel for this Employee"
          >
            <ArrowDownTrayIcon className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </Button>

          {isModal && onClose && (
            <Button size="sm" variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-800">
              Close
            </Button>
          )}
        </div>
      </div>

      {/* ── Filter Bar: Date Presets & Custom Picker ── */}
      <div className="bg-white border border-gray-200 rounded-xl p-3.5 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Quick Date Range Buttons */}
          <div className="inline-flex flex-wrap items-center p-1 bg-gray-100 rounded-lg text-xs font-medium text-gray-600 gap-1">
            <button
              type="button"
              onClick={() => handlePreset('THIS_MONTH')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                dateFrom === defaultMonthStart && dateTo === today
                  ? 'bg-white text-indigo-600 font-semibold shadow-xs'
                  : 'hover:text-gray-900'
              }`}
            >
              This Month
            </button>
            <button
              type="button"
              onClick={() => handlePreset('LAST_MONTH')}
              className="px-3 py-1.5 rounded-md transition-all hover:text-gray-900"
            >
              Last Month
            </button>
            <button
              type="button"
              onClick={() => handlePreset('LAST_90_DAYS')}
              className="px-3 py-1.5 rounded-md transition-all hover:text-gray-900"
            >
              Last 90 Days
            </button>
            <button
              type="button"
              onClick={() => handlePreset('THIS_YEAR')}
              className="px-3 py-1.5 rounded-md transition-all hover:text-gray-900"
            >
              This Year
            </button>
          </div>

          {/* Custom Date Inputs */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span>From:</span>
              <input
                type="date"
                value={selectedFrom}
                onChange={e => setSelectedFrom(e.target.value)}
                className="border border-gray-300 rounded-md px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
              <span>To:</span>
              <input
                type="date"
                value={selectedTo}
                max={today}
                onChange={e => setSelectedTo(e.target.value)}
                className="border border-gray-300 rounded-md px-2.5 py-1 text-xs text-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <Button size="sm" onClick={applyCustomFilter} disabled={loading}>
              Apply
            </Button>
          </div>
        </div>

        {/* Secondary Filter: Status Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-gray-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-gray-500 font-medium mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All' },
              { id: 'PRESENT', label: 'Present' },
              { id: 'IRREGULAR', label: 'Irregular' },
              { id: 'ABSENT', label: 'Absent' },
              { id: 'ON_LEAVE', label: 'On Leave' },
              { id: 'HOLIDAY_OFF', label: 'Holiday & Off' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white font-medium shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-700">{filteredRecords.length}</span> records
            {dateFrom && dateTo && (
              <span> ({formatDate(dateFrom)} – {formatDate(dateTo)})</span>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Days */}
        <div className="bg-white border border-gray-200/80 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Total Days</span>
            <CalendarDaysIcon className="w-4 h-4 text-gray-400" />
          </div>
          <div className="mt-1 text-2xl font-bold text-gray-800">{metrics.totalDays}</div>
          <div className="text-[11px] text-gray-400 mt-0.5">In selected range</div>
        </div>

        {/* Present Days */}
        <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-emerald-700 font-medium">
            <span>Present</span>
            <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-800">{metrics.present}</div>
          <div className="text-[11px] text-emerald-600/80 mt-0.5">Regular attendance</div>
        </div>

        {/* Irregular / Incomplete */}
        <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-amber-700 font-medium">
            <span>Irregular</span>
            <ExclamationCircleIcon className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-800">{metrics.irregular}</div>
          <div className="text-[11px] text-amber-600/80 mt-0.5">Missing punch / short</div>
        </div>

        {/* Absent */}
        <div className="bg-rose-50/60 border border-rose-200/80 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-rose-700 font-medium">
            <span>Absent</span>
            <XCircleIcon className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-800">{metrics.absent}</div>
          <div className="text-[11px] text-rose-600/80 mt-0.5">Unexcused days</div>
        </div>

        {/* On Leave / Off */}
        <div className="bg-sky-50/60 border border-sky-200/80 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-sky-700 font-medium">
            <span>Leave / Off</span>
            <ClockIcon className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-sky-800">{metrics.onLeave + metrics.holidayOrOff}</div>
          <div className="text-[11px] text-sky-600/80 mt-0.5">{metrics.onLeave} leave • {metrics.holidayOrOff} off</div>
        </div>

        {/* Total Hours Worked */}
        <div className="bg-indigo-50/60 border border-indigo-200/80 rounded-xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs text-indigo-700 font-medium">
            <span>Total Hours</span>
            <ClockIcon className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-indigo-900">{formatHours(metrics.totalWorkedHours)}</div>
          <div className="text-[11px] text-indigo-600/80 mt-0.5">
            Avg: {formatHours(metrics.avgDailyHours)}/day
          </div>
        </div>
      </div>

      {/* ── Attendance Records Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2">
            <Spinner />
            <span className="text-xs text-gray-500">Loading attendance records...</span>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 text-center">
            <CalendarDaysIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-700">No attendance records found</h3>
            <p className="text-xs text-gray-500 mt-1">Try expanding your date filter or choosing another status.</p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[560px]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50/90 sticky top-0 z-10 text-gray-600 font-semibold border-b border-gray-200 uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Date & Day</th>
                  <th className="py-3 px-3">Check In</th>
                  <th className="py-3 px-3">Check Out</th>
                  <th className="py-3 px-3">Worked Hours</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Regularisation</th>
                  <th className="py-3 px-3">Locations</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRecords.map((rec, idx) => {
                  const dateObj = new Date(rec.attendanceDate + 'T00:00:00')
                  const dayName = isNaN(dateObj) ? '' : dateObj.toLocaleDateString('en-US', { weekday: 'short' })
                  const isWeekend = ['Sat', 'Sun'].includes(dayName)
                  const displayStatus = rec.displayStatus || rec.attendanceStatus || 'REGULAR'
                  const isOwnRecord = user?.employeeId != null && rec.employeeId === user.employeeId
                  const canRequest = isEmp || isOwnRecord

                  return (
                    <tr
                      key={rec.id || `row-${rec.attendanceDate}-${idx}`}
                      className={`hover:bg-indigo-50/30 transition-colors ${
                        displayStatus === 'ABSENT' ? 'bg-rose-50/20' : ''
                      }`}
                    >
                      {/* Date & Day */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-semibold text-gray-900">{formatDate(rec.attendanceDate)}</div>
                        <div className={`text-[11px] ${isWeekend ? 'text-amber-600 font-medium' : 'text-gray-400'}`}>
                          {dayName}
                        </div>
                      </td>

                      {/* Check In */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-800">
                            {formatAttendanceTime(rec.checkIn, rec.checkInUtc)}
                          </span>
                          <SourceBadge source={rec.clockInSource} deviceName={rec.clockInDeviceName} />
                        </div>
                      </td>

                      {/* Check Out */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-gray-800">
                            {formatAttendanceTime(rec.checkOut, rec.checkOutUtc)}
                          </span>
                          <SourceBadge source={rec.clockOutSource} deviceName={rec.clockOutDeviceName} />
                        </div>
                      </td>

                      {/* Worked Hours */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-medium text-gray-800">
                          {formatHours(rec.workedHour)}
                        </div>
                        {rec.minimumHour > 0 && rec.workedHour != null && rec.workedHour < rec.minimumHour && (
                          <div className="text-[10px] text-amber-600 font-medium">
                            Short of {rec.minimumHour}h
                          </div>
                        )}
                        {rec.attendanceOvertime > 0 && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            +{rec.attendanceOvertime}h OT
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <Badge
                          label={
                            displayStatus === 'ON_LEAVE' && rec.leaveTypeName
                              ? rec.leaveTypeName
                              : (QUALITY_LABELS[displayStatus] || displayStatus)
                          }
                          variant={QUALITY_COLORS[displayStatus] || 'default'}
                        />
                      </td>

                      {/* Regularisation */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {rec.attendanceRequired === false || displayStatus === 'EXEMPT' ? (
                          <span className="text-gray-400 text-xs">Not required</span>
                        ) : rec.regularisationStatus === 'REGULARISED' || rec.attendanceStatus === 'REGULARISED' ? (
                          <Badge label="Regularised" variant="success" />
                        ) : rec.regularisationStatus === 'HAS_PENDING' ? (
                          <Badge label="Pending Approval" variant="warning" />
                        ) : displayStatus === 'IRREGULAR' || (!rec.id && ['ABSENT', 'ON_LEAVE', 'HOLIDAY', 'WEEK_OFF'].includes(displayStatus)) ? (
                          <button
                            type="button"
                            onClick={() => handleOpenRegularise(rec)}
                            className="inline-flex items-center text-xs font-semibold text-indigo-600 hover:text-indigo-900 hover:underline"
                          >
                            Regularize
                          </button>
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>

                      {/* Location Links */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="space-y-0.5">
                          {rec.checkInLatitude != null && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400">In:</span>
                              <LocationLink
                                latitude={rec.checkInLatitude}
                                longitude={rec.checkInLongitude}
                                address={rec.checkInAddress}
                              />
                            </div>
                          )}
                          {rec.checkOutLatitude != null && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400">Out:</span>
                              <LocationLink
                                latitude={rec.checkOutLatitude}
                                longitude={rec.checkOutLongitude}
                                address={rec.checkOutAddress}
                              />
                            </div>
                          )}
                          {rec.checkInLatitude == null && rec.checkOutLatitude == null && (
                            <span className="text-gray-300 text-xs">—</span>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 whitespace-nowrap text-right">
                        {canManage && (
                          <div className="flex items-center justify-end gap-1.5">
                            {rec.id ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(rec)}
                                className="px-2 py-1 text-xs font-medium text-indigo-600 hover:text-indigo-900 hover:bg-indigo-50 rounded"
                              >
                                Edit
                              </button>
                            ) : displayStatus === 'ABSENT' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(rec)}
                                className="px-2 py-1 text-xs font-medium text-emerald-600 hover:text-emerald-900 hover:bg-emerald-50 rounded"
                              >
                                + Record
                              </button>
                            ) : null}
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Edit / Record Modal ── */}
      {editModalOpen && (
        <Modal
          open={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title={editingRecord?.id ? 'Edit Attendance' : 'Record Attendance'}
          size="sm"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setEditModalOpen(false)} disabled={savingEdit}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} loading={savingEdit}>
                {editingRecord?.id ? 'Save Changes' : 'Record Attendance'}
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-xs text-indigo-900">
              <div className="font-semibold text-sm">{displayName}</div>
              <div className="text-indigo-700 mt-0.5">
                Date: <span className="font-medium">{formatDate(editingRecord?.attendanceDate)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Check In Time</label>
                <input
                  type="time"
                  value={editCheckIn}
                  onChange={e => setEditCheckIn(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Check Out Time</label>
                <input
                  type="time"
                  value={editCheckOut}
                  onChange={e => setEditCheckOut(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Regularisation Modal ── */}
      {regModalOpen && (
        <Modal
          open={regModalOpen}
          onClose={() => setRegModalOpen(false)}
          title="Attendance Regularisation Request"
          size="md"
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setRegModalOpen(false)} disabled={submittingReg}>
                Cancel
              </Button>
              <Button onClick={handleSubmitRegularise} loading={submittingReg}>
                Submit Request
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
              <div className="font-semibold text-sm">
                Regularise for {displayName} on {formatDate(regRecord?.attendanceDate)}
              </div>
              <div className="text-amber-800 mt-1">
                Current status:{' '}
                <span className="font-semibold">{regRecord?.displayStatus || regRecord?.attendanceStatus || 'Unknown'}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={regReason}
                onChange={e => setRegReason(e.target.value)}
                rows={3}
                placeholder="Reason for regularisation (e.g. forgot to punch out, client visit)..."
                className="w-full border border-gray-300 rounded p-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Requested Check In</label>
                <input
                  type="time"
                  value={regReqCheckIn}
                  onChange={e => setRegReqCheckIn(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Requested Check Out</label>
                <input
                  type="time"
                  value={regReqCheckOut}
                  onChange={e => setRegReqCheckOut(e.target.value)}
                  className="w-full border border-gray-300 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
