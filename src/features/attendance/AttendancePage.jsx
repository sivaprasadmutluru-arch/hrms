import { useEffect, useState, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchAll, create, approve, reject,
  fetchLateComeEarlyOut, deleteLateComeEarlyOut,
  fetchOvertime, approveOvertime, rejectOvertime,
  requestValidation, fetchValidationPending,
  selectAll, selectLoading, selectPagination, selectLateComeEarlyOut, selectOvertimeRecords, selectValidationPending
} from './attendanceSlice'
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
import { STATUS_COLORS } from '../../config/constants'
import ConfirmModal from '../../components/common/ConfirmModal'
import api from '../../services/api'

const TABS = ['Attendance', 'Late / Early Out', 'Overtime', 'Validation Requests']

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
  const validationPending = useSelector(selectValidationPending)
  const departments = useSelector(s => s.departments?.data || [])
  const employees = useSelector(s => s.employees?.data || [])

  const [tab, setTab] = useState('Attendance')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, id: null, action: null })
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => {
    dispatch(fetchAll({ page: 0, size: 20 }))
    dispatch(fetchLateComeEarlyOut())
    dispatch(fetchDepartments())
    dispatch(fetchEmployees({ page: 0, size: 1000 }))
  }, [dispatch])

  // Re-fetch with server-side filters when any filter changes
  useEffect(() => {
    const params = { page: 0, size: 20 }
    if (filterStatus) params.status = filterStatus
    if (filterDateFrom) params.from = filterDateFrom
    if (filterDateTo) params.to = filterDateTo
    if (filterDept) params.departmentId = filterDept
    dispatch(fetchAll(params))
  }, [dispatch, filterStatus, filterDateFrom, filterDateTo, filterDept])

  // Client-side search on loaded records (name search only)
  const filteredData = useMemo(() => {
    if (!search) return data
    const q = search.toLowerCase()
    return data.filter(a => (a.employeeName || '').toLowerCase().includes(q))
  }, [data, search])

  const handleExport = async () => {
    if (!companyId) return
    try {
      const res = await api.get(`/attendance/export?companyId=${companyId}`, {
        responseType: 'blob',
        headers: { 'X-Company-Id': companyId },
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = 'attendance.xlsx'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Export failed')
    }
  }

  useEffect(() => {
    if (tab === 'Overtime' && companyId) {
      dispatch(fetchOvertime(companyId))
    }
    if (tab === 'Validation Requests' && companyId) {
      dispatch(fetchValidationPending(companyId))
    }
  }, [tab, dispatch, companyId])

  const handleApprove = async (id) => {
    try {
      await dispatch(approve(id)).unwrap()
      if (companyId) dispatch(fetchValidationPending(companyId))
      toast.success('Approved')
    } catch { toast.error('Failed') }
  }
  const handleReject = async (id) => {
    try {
      await dispatch(reject(id)).unwrap()
      if (companyId) dispatch(fetchValidationPending(companyId))
      toast.success('Rejected')
    } catch { toast.error('Failed') }
  }

  const handleDeleteLate = (id) => {
    setConfirmModal({ open: true, id, action: 'deleteLate' })
  }
  const onConfirmDelete = async () => {
    const { id, action } = confirmModal
    try {
      if (action === 'deleteLate') await dispatch(deleteLateComeEarlyOut(id)).unwrap()
      toast.success('Deleted')
      setConfirmModal({ open: false, id: null, action: null })
    } catch (e) { toast.error(e || 'Failed') }
  }

  const handleApproveOvertime = async (id) => {
    try { await dispatch(approveOvertime(id)).unwrap(); toast.success('Overtime approved') }
    catch (e) { toast.error(e || 'Failed') }
  }
  const handleRejectOvertime = async (id) => {
    try { await dispatch(rejectOvertime(id)).unwrap(); toast.success('Overtime rejected') }
    catch (e) { toast.error(e || 'Failed') }
  }

  const handleRequestValidation = async (id) => {
    try {
      await dispatch(requestValidation(id)).unwrap()
      toast.success('Validation request submitted')
    } catch (e) { toast.error(e || 'Failed') }
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
      dispatch(fetchAll({ page: 0, size: 20 }))
    } catch (e) { toast.error(e || 'Error') }
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
    { accessorKey: 'workedHour', header: 'Hours' },
    { accessorKey: 'attendanceValidated', header: 'Status', cell: ({ getValue }) => <Badge label={getValue() || 'Pending'} variant={STATUS_COLORS[getValue()?.toLowerCase()] || 'default'} /> },
    { id: 'actions', header: '', cell: ({ row }) => {
      const rec = row.original
      if (!isEmp && (!rec.attendanceValidated || rec.attendanceValidated === 'PENDING') && rec.checkOut) {
        return (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => openEdit(rec)}>Edit</Button>
            <Button size="sm" variant="success" onClick={() => handleApprove(rec.id)}>Approve</Button>
            <Button size="sm" variant="danger" onClick={() => handleReject(rec.id)}>Reject</Button>
          </div>
        )
      }
      if (!isEmp) {
        return <Button size="sm" variant="secondary" onClick={() => openEdit(rec)}>Edit</Button>
      }
      if (isEmp && !rec.isValidateRequest) {
        return <Button size="sm" variant="secondary" onClick={() => handleRequestValidation(rec.id)}>Request Validation</Button>
      }
      if (isEmp && rec.isValidateRequest && !rec.isValidateRequestApproved) {
        return <span className="text-xs text-yellow-600 font-medium">Validation Pending</span>
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
    { accessorKey: 'overtimeHours', header: 'Overtime Hrs', cell: ({ getValue }) => getValue() != null ? `${getValue()}h` : '—' },
    { accessorKey: 'status', header: 'Status', cell: ({ getValue }) => {
      const v = getValue()
      return <Badge label={v || 'PENDING'} variant={v === 'APPROVED' ? 'success' : v === 'REJECTED' ? 'danger' : 'default'} />
    }},
    { id: 'actions', header: '', cell: ({ row }) => row.original.status === 'PENDING' && !isEmp ? (
      <div className="flex gap-2">
        <Button size="sm" variant="success" onClick={() => handleApproveOvertime(row.original.id)}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => handleRejectOvertime(row.original.id)}>Reject</Button>
      </div>
    ) : null },
  ]

  return (
    <div>
      <PageHeader title="Attendance" subtitle="Track employee attendance records"
        actions={
          <>
            <SearchInput onSearch={setSearch} className="w-48" />
            {tab === 'Attendance' && (
              <>
                <Button variant="secondary" onClick={handleExport}>Export Excel</Button>
                <Button onClick={() => { setEditTarget(null); reset({}); setModalOpen(true) }}>+ Record</Button>
              </>
            )}
          </>
        }
      />

      {/* Filters row */}
      {tab === 'Attendance' && (
        <div className="flex flex-wrap gap-3 mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">Status:</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              <option value="">All</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">From:</label>
            <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500 font-medium">To:</label>
            <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)}
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
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
          {(filterStatus || filterDateFrom || filterDateTo || filterDept) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterDateFrom(''); setFilterDateTo(''); setFilterDept('') }}
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
          <Pagination page={pagination.page} totalPages={Math.ceil(pagination.total / pagination.size)} onPageChange={p => dispatch(fetchAll({ page: p, size: 20 }))} />
        </>
      )}

      {tab === 'Late / Early Out' && (
        <DataTable columns={lateColumns} data={lateComeEarlyOut} loading={loading} />
      )}

      {tab === 'Overtime' && (
        <DataTable columns={overtimeColumns} data={overtimeRecords} loading={loading} />
      )}

      {tab === 'Validation Requests' && (
        <DataTable
          columns={[
            { accessorKey: 'employeeName', header: 'Employee' },
            { accessorKey: 'attendanceDate', header: 'Date', cell: ({ getValue }) => formatDate(getValue()) },
            { accessorKey: 'checkIn', header: 'Check In', cell: ({ getValue }) => getValue() || '—' },
            { accessorKey: 'checkOut', header: 'Check Out', cell: ({ getValue }) => getValue() || '—' },
            { accessorKey: 'workedHour', header: 'Hours' },
            { id: 'actions', header: '', cell: ({ row }) => !isEmp ? (
              <div className="flex gap-2">
                <Button size="sm" variant="success" onClick={() => handleApprove(row.original.id)}>Approve</Button>
                <Button size="sm" variant="danger" onClick={() => handleReject(row.original.id)}>Reject</Button>
              </div>
            ) : null },
          ]}
          data={validationPending}
          loading={loading}
        />
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
    </div>
  )
}
