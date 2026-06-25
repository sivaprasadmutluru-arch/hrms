import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMyRequests, submitRequest,
  fetchPendingManager, approveByManager, rejectByManager,
  fetchPendingHR, approveByHR, rejectByHR,
  fetchAllForCompany,
  selectMyRequests, selectPendingManager, selectPendingHR, selectAllRequests, selectRegLoading,
} from './regularisationSlice'
import { fetchAll as fetchAttendance, selectAll as selectAttendance } from './attendanceSlice'
import useAuth from '../../hooks/useAuth'
import PageHeader from '../../components/common/PageHeader'
import Button from '../../components/common/Button'
import DataTable from '../../components/common/DataTable'
import Badge from '../../components/common/Badge'
import Modal from '../../components/common/Modal'
import { formatDate } from '../../utils/formatters'

const REQUEST_TYPES = [
  { value: 'LATE_ARRIVAL',              label: 'Late Arrival' },
  { value: 'MISSING_PUNCH',             label: 'Missing Punch' },
  { value: 'WORKING_HOURS_CORRECTION',  label: 'Working Hours Correction' },
  { value: 'OVERTIME_REQUEST',          label: 'Overtime Request' },
  { value: 'WRONG_STATUS',             label: 'Wrong Status' },
  { value: 'HALF_TO_FULL_DAY',         label: 'Half Day → Full Day' },
  { value: 'WORK_FROM_HOME',           label: 'Work From Home' },
  { value: 'OFFICIAL_DUTY',            label: 'Official Duty' },
]

const STATUS_COLORS = {
  PENDING_MANAGER:       'warning',
  APPROVED_BY_MANAGER:   'accent',
  PENDING_HR:            'warning',
  APPROVED:              'success',
  REJECTED:              'danger',
}

const STATUS_LABELS = {
  PENDING_MANAGER:       'Pending Manager',
  APPROVED_BY_MANAGER:   'Manager Approved',
  PENDING_HR:            'Pending HR',
  APPROVED:              'Approved',
  REJECTED:              'Rejected',
}

function RemarksModal({ open, onClose, onConfirm, title, loading }) {
  const [remarks, setRemarks] = useState('')
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={() => { onConfirm(remarks); setRemarks('') }} loading={loading}>Confirm</Button>
        </div>
      }>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Remarks (optional)</label>
        <textarea
          value={remarks}
          onChange={e => setRemarks(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          placeholder="Enter remarks..."
        />
      </div>
    </Modal>
  )
}

export default function AttendanceRegularisationPage() {
  const dispatch = useDispatch()
  const { isEmployee, isHRManager, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId
  const isEmp = isEmployee()
  const isManager = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()
  const loading = useSelector(selectRegLoading)
  const myRequests = useSelector(selectMyRequests)
  const pendingManager = useSelector(selectPendingManager)
  const pendingHR = useSelector(selectPendingHR)
  const allRequests = useSelector(selectAllRequests)
  const attendanceRecords = useSelector(selectAttendance)

  // Tabs visible to the current user
  const tabs = [
    'My Requests',
    ...(isManager ? ['Pending My Approval'] : []),
    ...(isManager ? ['Pending HR'] : []),
    ...(isManager ? ['All Requests'] : []),
  ]
  const [tab, setTab] = useState('My Requests')
  const [submitOpen, setSubmitOpen] = useState(false)
  const [remarksModal, setRemarksModal] = useState({ open: false, id: null, action: null })
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm()
  const selectedType = watch('requestType')

  // Only IRREGULAR records with no pending request can be submitted
  const irregularRecords = attendanceRecords.filter(
    a => a.attendanceStatus === 'IRREGULAR' && a.regularisationStatus === 'NONE'
  )

  useEffect(() => {
    dispatch(fetchMyRequests())
    // Load irregular attendance records for submit form
    dispatch(fetchAttendance({ page: 0, size: 200, status: 'IRREGULAR' }))
  }, [dispatch])

  useEffect(() => {
    if (tab === 'Pending My Approval') dispatch(fetchPendingManager())
    if (tab === 'Pending HR' && companyId) dispatch(fetchPendingHR(companyId))
    if (tab === 'All Requests' && companyId) dispatch(fetchAllForCompany(companyId))
  }, [tab, dispatch, companyId])

  const onSubmit = async (data) => {
    try {
      await dispatch(submitRequest(data)).unwrap()
      toast.success('Regularisation request submitted')
      setSubmitOpen(false)
      reset()
      dispatch(fetchMyRequests())
      dispatch(fetchAttendance({ page: 0, size: 200, status: 'IRREGULAR' }))
    } catch (e) { toast.error(e || 'Failed to submit') }
  }

  const handleAction = (id, action) => {
    setRemarksModal({ open: true, id, action })
  }

  const onConfirmRemarks = async (remarks) => {
    const { id, action } = remarksModal
    try {
      if (action === 'approve-manager') await dispatch(approveByManager({ id, remarks })).unwrap()
      else if (action === 'reject-manager') await dispatch(rejectByManager({ id, remarks })).unwrap()
      else if (action === 'approve-hr') await dispatch(approveByHR({ id, remarks })).unwrap()
      else if (action === 'reject-hr') await dispatch(rejectByHR({ id, remarks })).unwrap()
      toast.success('Done')
      setRemarksModal({ open: false, id: null, action: null })
    } catch (e) { toast.error(e || 'Failed') }
  }

  const baseColumns = [
    { id: 'employee', header: 'Employee', cell: ({ row }) => row.original.employeeName || '—' },
    { id: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.attendanceDate) },
    { id: 'type', header: 'Request Type', cell: ({ row }) => {
      const t = REQUEST_TYPES.find(r => r.value === row.original.requestType)
      return t ? t.label : row.original.requestType || '—'
    }},
    { id: 'reason', header: 'Reason', cell: ({ row }) => (
      <span className="max-w-[180px] truncate block text-gray-600 text-xs">{row.original.reason || '—'}</span>
    )},
    { id: 'status', header: 'Status', cell: ({ row }) => {
      const s = row.original.status
      return <Badge label={STATUS_LABELS[s] || s} variant={STATUS_COLORS[s] || 'default'} />
    }},
  ]

  const managerActionColumns = [
    ...baseColumns,
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="success" onClick={() => handleAction(row.original.id, 'approve-manager')}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => handleAction(row.original.id, 'reject-manager')}>Reject</Button>
      </div>
    )},
  ]

  const hrActionColumns = [
    ...baseColumns,
    { id: 'managerRemarks', header: 'Manager Remarks', cell: ({ row }) => (
      <span className="text-xs text-gray-500">{row.original.managerRemarks || '—'}</span>
    )},
    { id: 'actions', header: '', cell: ({ row }) => (
      <div className="flex gap-2">
        <Button size="sm" variant="success" onClick={() => handleAction(row.original.id, 'approve-hr')}>Approve</Button>
        <Button size="sm" variant="danger" onClick={() => handleAction(row.original.id, 'reject-hr')}>Reject</Button>
      </div>
    )},
  ]

  const myColumns = [
    { id: 'date', header: 'Date', cell: ({ row }) => formatDate(row.original.attendanceDate) },
    { id: 'type', header: 'Request Type', cell: ({ row }) => {
      const t = REQUEST_TYPES.find(r => r.value === row.original.requestType)
      return t ? t.label : row.original.requestType || '—'
    }},
    { id: 'reason', header: 'Reason', cell: ({ row }) => (
      <span className="max-w-[200px] truncate block text-gray-600 text-xs">{row.original.reason || '—'}</span>
    )},
    { id: 'status', header: 'Status', cell: ({ row }) => {
      const s = row.original.status
      return <Badge label={STATUS_LABELS[s] || s} variant={STATUS_COLORS[s] || 'default'} />
    }},
    { id: 'remarks', header: 'Remarks', cell: ({ row }) => {
      const r = row.original
      return (
        <span className="text-xs text-gray-500">
          {r.status === 'REJECTED' ? r.rejectionRemarks || '—' : r.hrRemarks || r.managerRemarks || '—'}
        </span>
      )
    }},
  ]

  const showTimings = ['MISSING_PUNCH', 'WORKING_HOURS_CORRECTION'].includes(selectedType)
  const showOT = selectedType === 'OVERTIME_REQUEST'

  return (
    <div>
      <PageHeader title="Attendance Regularisation" subtitle="Request corrections for irregular attendance records"
        actions={
          <Button onClick={() => { reset(); setSubmitOpen(true) }} disabled={irregularRecords.length === 0 && isEmp}>
            + New Request
          </Button>
        }
      />

      <div className="flex gap-2 border-b border-gray-200 mb-4">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
            {t === 'Pending My Approval' && pendingManager.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingManager.length}</span>
            )}
            {t === 'Pending HR' && pendingHR.length > 0 && (
              <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-1.5 py-0.5 rounded-full">{pendingHR.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'My Requests' && (
        <>
          {myRequests.length === 0 && !loading && (
            <div className="text-center text-gray-400 py-12 text-sm">
              No regularisation requests yet.
              {irregularRecords.length > 0 && (
                <span className="block mt-1 text-indigo-600 cursor-pointer hover:underline" onClick={() => setSubmitOpen(true)}>
                  You have {irregularRecords.length} irregular record(s) — submit a request.
                </span>
              )}
            </div>
          )}
          <DataTable columns={myColumns} data={myRequests} loading={loading} />
        </>
      )}

      {tab === 'Pending My Approval' && (
        <DataTable columns={managerActionColumns} data={pendingManager} loading={loading} />
      )}

      {tab === 'Pending HR' && (
        <DataTable columns={hrActionColumns} data={pendingHR} loading={loading} />
      )}

      {tab === 'All Requests' && (
        <DataTable columns={baseColumns} data={allRequests} loading={loading} />
      )}

      {/* Submit request modal */}
      <Modal
        open={submitOpen}
        onClose={() => { setSubmitOpen(false); reset() }}
        title="Submit Regularisation Request"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setSubmitOpen(false); reset() }}>Cancel</Button>
            <Button onClick={handleSubmit(onSubmit)} loading={loading}>Submit</Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Attendance selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Irregular Attendance Record</label>
            <select
              {...register('attendanceId', { required: 'Select an attendance record' })}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${errors.attendanceId ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select date</option>
              {irregularRecords.map(a => (
                <option key={a.id} value={a.id}>
                  {a.attendanceDate} — {a.checkIn || 'No check-in'} / {a.checkOut || 'No check-out'}
                </option>
              ))}
            </select>
            {errors.attendanceId && <span className="text-red-500 text-xs mt-1 block">{errors.attendanceId.message}</span>}
            {irregularRecords.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No irregular attendance records found.</p>
            )}
          </div>

          {/* Request type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Type</label>
            <select
              {...register('requestType', { required: 'Select a request type' })}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${errors.requestType ? 'border-red-500' : 'border-gray-300'}`}
            >
              <option value="">Select type</option>
              {REQUEST_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            {errors.requestType && <span className="text-red-500 text-xs mt-1 block">{errors.requestType.message}</span>}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              {...register('reason', { required: 'Reason is required' })}
              rows={3}
              className={`w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${errors.reason ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Explain the reason for this request..."
            />
            {errors.reason && <span className="text-red-500 text-xs mt-1 block">{errors.reason.message}</span>}
          </div>

          {/* Conditional: check-in / check-out times */}
          {showTimings && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check In</label>
                <input
                  type="datetime-local"
                  {...register('requestedCheckIn')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Requested Check Out</label>
                <input
                  type="datetime-local"
                  {...register('requestedCheckOut')}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Conditional: overtime hours */}
          {showOT && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested Overtime Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                {...register('requestedOvertimeHours', { min: 0 })}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder="e.g. 2.5"
              />
            </div>
          )}

          {/* Attachment URL (optional) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Attachment URL <span className="text-gray-400 font-normal">(optional)</span></label>
            <input
              type="url"
              {...register('attachmentUrl')}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="https://..."
            />
          </div>
        </div>
      </Modal>

      {/* Approve / Reject with remarks modal */}
      <RemarksModal
        open={remarksModal.open}
        onClose={() => setRemarksModal({ open: false, id: null, action: null })}
        onConfirm={onConfirmRemarks}
        title={
          remarksModal.action?.includes('approve') ? 'Approve Request' : 'Reject Request'
        }
        loading={loading}
      />
    </div>
  )
}
