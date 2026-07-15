import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  fetchMyProfile, fetchMyLeave, fetchEssLeaveTypes, applyLeave,
  fetchMyAttendance, fetchClockStatus, checkIn, checkOut, fetchMyPayslips,
  selectEssProfile, selectEssLeaveRequests, selectEssLeaveTypes,
  selectEssAttendance, selectEssClockStatus, selectEssPayslips, selectEssLoading,
} from './essSlice'
import Badge from '../../components/common/Badge'
import Button from '../../components/common/Button'
import Modal from '../../components/common/Modal'
import PdfPreviewModal from '../../components/common/PdfPreviewModal'
import Select from '../../components/common/Select'
import Input from '../../components/common/Input'
import { formatAttendanceTime, formatDate } from '../../utils/formatters'
import useCurrency from '../../hooks/useCurrency'
import { useLocationPermission } from '../../hooks/useLocationPermission'
import { MapPinIcon } from '@heroicons/react/24/outline'

const TABS = ['Profile', 'My Leave', 'My Attendance', 'My Payslips']

function LocationLink({ latitude, longitude, address }) {
  if (latitude == null || longitude == null) return <span className="text-gray-300 text-xs">—</span>
  return (
    <a
      href={`https://maps.google.com/?q=${latitude},${longitude}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex max-w-56 items-start gap-1 text-xs text-indigo-600 hover:underline"
      title={address || `${latitude}, ${longitude}`}
    >
      <MapPinIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span className="line-clamp-2">{address || `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`}</span>
    </a>
  )
}

const STATUS_COLORS = {
  approved: 'success', rejected: 'danger', pending: 'warning',
  requested: 'warning', paid: 'success', confirmed: 'primary', draft: 'default',
}

function ProfileTab({ profile }) {
  if (!profile) return <p className="text-gray-400 text-sm py-8 text-center">No profile data found.</p>
  const fields = [
    ['Full Name', profile.fullName],
    ['Email', profile.email],
    ['Work Email', profile.workEmail],
    ['Phone', profile.phone],
    ['Badge ID', profile.badgeId],
    ['Department', profile.departmentName],
    ['Job Position', profile.jobPositionName],
    ['Job Role', profile.jobRoleName],
    ['Work Type', profile.workTypeName],
    ['Employee Type', profile.employeeType?.replace(/_/g, ' ')],
    ['Date Joined', formatDate(profile.dateJoining)],
    ['Date of Birth', formatDate(profile.dateOfBirth)],
    ['Gender', profile.gender],
    ['Nationality', profile.nationality],
    ['Marital Status', profile.maritalStatus],
  ].filter(([, v]) => v)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
      {fields.map(([label, value]) => (
        <div key={label} className="flex justify-between border-b border-gray-50 py-2">
          <span className="text-xs text-gray-500 font-medium">{label}</span>
          <span className="text-xs text-gray-800">{value}</span>
        </div>
      ))}
    </div>
  )
}

function LeaveTab({ leaveRequests, leaveTypes, leaveBalance, loading }) {
  const dispatch = useDispatch()
  const [applyOpen, setApplyOpen] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const onApply = async (data) => {
    try {
      await dispatch(applyLeave({
        leaveTypeId: data.leaveTypeId,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description || undefined,
      })).unwrap()
      toast.success('Leave application submitted')
      setApplyOpen(false)
      reset()
    } catch (e) { toast.error(e || 'Failed to apply') }
  }

  return (
    <div className="space-y-4">
      {/* Leave Balance Summary */}
      {leaveBalance.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your Leave Balance</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {leaveBalance.map(b => (
              <div key={b.id} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-800 mb-3">{b.leaveTypeName || '—'}</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xl font-bold text-indigo-600">{(b.availableDays ?? 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Available</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-amber-500">{(b.carryforwardDays ?? 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Carry Fwd</p>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-emerald-600">{(b.totalLeaveDays ?? 0).toFixed(1)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">Total</p>
                  </div>
                </div>
                {b.usedDays > 0 && (
                  <p className="text-xs text-gray-400 text-center mt-2">{(b.usedDays).toFixed(1)} days used this year</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => { reset(); setApplyOpen(true) }}>+ Apply Leave</Button>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Leave Type', 'Start Date', 'End Date', 'Status', 'Description'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {leaveRequests.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400 text-sm">No leave requests found</td></tr>
            ) : leaveRequests.map(lr => (
              <tr key={lr.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm text-gray-700">{lr.leaveType?.name || lr.leaveTypeName || '—'}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{formatDate(lr.startDate)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">{formatDate(lr.endDate)}</td>
                <td className="px-4 py-3"><Badge label={lr.status || 'Pending'} variant={STATUS_COLORS[lr.status?.toLowerCase()] || 'default'} /></td>
                <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">{lr.description || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title="Apply for Leave"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(onApply)}>Submit</Button>
          </div>
        }>
        <div className="space-y-4">
          <Select label="Leave Type" options={leaveTypes.map(lt => ({ value: lt.id, label: lt.name }))}
            error={errors.leaveTypeId?.message} {...register('leaveTypeId', { required: 'Required' })} />
          <Input label="Start Date" type="date" error={errors.startDate?.message}
            {...register('startDate', { required: 'Required' })} />
          <Input label="End Date" type="date" error={errors.endDate?.message}
            {...register('endDate', { required: 'Required' })} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              rows={3} {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  )
}

function AttendanceTab({ attendance, loading }) {
  const dispatch = useDispatch()
  const clockStatus = useSelector(selectEssClockStatus)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const { requestCoords, LocationModal } = useLocationPermission()

  useEffect(() => {
    dispatch(fetchClockStatus())
  }, [dispatch])

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Dubai' })
  const isClockedIn = !!clockStatus?.online

  const handleFilter = () => {
    dispatch(fetchMyAttendance(from && to ? { from, to } : undefined))
  }

  const handleCheckIn = async () => {
    try {
      const coords = await requestCoords()
      await dispatch(checkIn(coords)).unwrap()
      toast.success('Checked in successfully')
      dispatch(fetchClockStatus())
      dispatch(fetchMyAttendance())
    } catch (e) { toast.error(e || 'Check-in failed') }
  }

  const handleCheckOut = async () => {
    try {
      const coords = await requestCoords()
      await dispatch(checkOut(coords)).unwrap()
      toast.success('Checked out successfully')
      dispatch(fetchClockStatus())
      dispatch(fetchMyAttendance())
    } catch (e) { toast.error(e || 'Check-out failed') }
  }

  return (
    <div className="space-y-4">
      <LocationModal />
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">From</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">To</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50" />
        </div>
        <Button variant="secondary" onClick={handleFilter}>Filter</Button>
        <div className="ml-auto flex items-center gap-2">
          {isClockedIn ? (
            <Button onClick={handleCheckOut}>Check Out</Button>
          ) : (
            <Button onClick={handleCheckIn}>Check In</Button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Date', 'Check In', 'Check In Location', 'Check Out', 'Check Out Location', 'Hours Worked', 'Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {attendance.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">No attendance records found</td></tr>
            ) : attendance.map(a => {
              return (
              <tr key={a.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm text-gray-700">{formatDate(a.attendanceDate)}</td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatAttendanceTime(a.checkIn, a.checkInUtc)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <LocationLink latitude={a.checkInLatitude} longitude={a.checkInLongitude} address={a.checkInAddress} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">
                  {formatAttendanceTime(a.checkOut, a.checkOutUtc)}
                </td>
                <td className="px-4 py-3 text-sm">
                  <LocationLink latitude={a.checkOutLatitude} longitude={a.checkOutLongitude} address={a.checkOutAddress} />
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{a.workedHour != null ? `${Number(a.workedHour).toFixed(1)}h` : '—'}</td>
                <td className="px-4 py-3">
                  <Badge label={a.attendanceValidated ? 'Validated' : 'Pending'} variant={a.attendanceValidated ? 'success' : 'warning'} />
                </td>
              </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PayslipsTab({ payslips }) {
  const [pdfPreviewId, setPdfPreviewId] = useState(null)

  return (
    <>
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50">
            <tr>
              {['Period', 'Gross Pay', 'Deductions', 'Net Pay', 'Status', ''].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payslips.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">No payslips found</td></tr>
            ) : payslips.map(p => (
              <tr key={p.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3 text-sm text-gray-700">
                  {p.startDate && p.endDate ? `${p.startDate} – ${p.endDate}` : p.startDate || '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-700">{formatCurrency(p.grossPay)}</td>
                <td className="px-4 py-3 text-sm text-red-500">{formatCurrency(p.deduction)}</td>
                <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{formatCurrency(p.netPay)}</td>
                <td className="px-4 py-3">
                  <Badge label={p.status || 'Draft'} variant={STATUS_COLORS[p.status?.toLowerCase()] || 'default'} />
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => setPdfPreviewId(p.id)}
                    className="text-xs text-indigo-600 hover:underline">View PDF</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PdfPreviewModal
        open={!!pdfPreviewId}
        onClose={() => setPdfPreviewId(null)}
        payslipId={pdfPreviewId}
      />
    </>
  )
}

export default function ESSPage() {
  const dispatch = useDispatch()
  const formatCurrency = useCurrency().format
  const [activeTab, setActiveTab] = useState('Profile')
  const profile = useSelector(selectEssProfile)
  const leaveRequests = useSelector(selectEssLeaveRequests)
  const leaveTypes = useSelector(selectEssLeaveTypes)
  const leaveBalance = useSelector(selectEssLeaveBalance)
  const attendance = useSelector(selectEssAttendance)
  const payslips = useSelector(selectEssPayslips)
  const loading = useSelector(selectEssLoading)

  useEffect(() => {
    dispatch(fetchMyProfile())
    dispatch(fetchMyLeave())
    dispatch(fetchEssLeaveTypes())
    dispatch(fetchMyBalance())
    dispatch(fetchMyAttendance())
    dispatch(fetchMyPayslips())
  }, [dispatch])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Self-Service</h1>
        <p className="text-sm text-gray-500 mt-1">Your profile, leave, attendance, and payslips</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        {loading && activeTab === 'Profile' && !profile ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {activeTab === 'Profile' && <ProfileTab profile={profile} />}
            {activeTab === 'My Leave' && <LeaveTab leaveRequests={leaveRequests} leaveTypes={leaveTypes} leaveBalance={leaveBalance} loading={loading} />}
            {activeTab === 'My Attendance' && <AttendanceTab attendance={attendance} loading={loading} />}
            {activeTab === 'My Payslips' && <PayslipsTab payslips={payslips} />}
          </>
        )}
      </div>
    </div>
  )
}
