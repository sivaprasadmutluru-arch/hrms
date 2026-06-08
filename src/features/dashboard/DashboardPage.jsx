import { useEffect, useState, useMemo, memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  UsersIcon, CalendarDaysIcon, TicketIcon, FolderIcon,
  BuildingOffice2Icon, CheckCircleIcon, XCircleIcon,
  ClockIcon, UserGroupIcon, ChartBarIcon, BanknotesIcon,
  ChevronLeftIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline'
import StatCard from '../../components/common/StatCard'
import Card from '../../components/common/Card'
import PageHeader from '../../components/common/PageHeader'
import WelcomeHeader from '../../components/common/WelcomeHeader'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import Avatar from '../../components/common/Avatar'
import { fetchAll as fetchLeave, fetchHolidays } from '../leave/leaveSlice'
import { fetchAll as fetchTickets } from '../helpdesk/helpdeskSlice'
import { fetchAll as fetchOrganizations } from '../organizations/organizationsSlice'
import { fetchBranchesSummary, selectBranchesSummary } from '../companies/companiesSlice'
import { selectPlatformCompanies } from '../platform/platformSlice'
import { fetchHeadcount as fetchHeadcountReport, fetchAttendanceReport } from '../reports/reportsSlice'
import { fetchEmployeeDashboard } from '../employees/employeesSlice'
import { fetchAttendanceDashboard, fetchNotIn, fetchCalendar, fetchToday, selectCalendarDays, selectCalendarLoading } from '../attendance/attendanceSlice'
import { fetchMyAttendance, checkIn, checkOut, selectEssAttendance, fetchMyWorkInfo, selectEssWorkInfo } from '../ess/essSlice'
import { fetchAll as fetchNotifications, markAllRead as markAllNotificationsRead, selectAll as selectNotifications } from '../notifications/notificationsSlice'
import { formatDate } from '../../utils/formatters'
import { STATUS_COLORS } from '../../config/constants'
import useAuth from '../../hooks/useAuth'

// ─── Attendance calendar helpers (used inline on dashboard) ───────────────────
const CAL_DAY_TYPE = {
  present:    { label: 'Present',        circle: 'bg-green-500 text-white',     dot: 'bg-green-500' },
  irregular:  { label: 'Irregular',      circle: 'bg-yellow-400 text-white',    dot: 'bg-yellow-400' },
  absent:     { label: 'Absent',         circle: 'bg-orange-500 text-white',    dot: 'bg-orange-500' },
  weekly_off: { label: 'Weekly Off',     circle: 'bg-green-200 text-green-800', dot: 'bg-green-200' },
  on_leave:   { label: 'Leave',          circle: 'bg-purple-500 text-white',    dot: 'bg-purple-500' },
  holiday:    { label: 'Public Holiday', circle: 'bg-cyan-400 text-white',      dot: 'bg-cyan-400' },
  future:     { label: '',               circle: 'bg-transparent text-gray-300',dot: '' },
}
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function buildCalendarGrid(year, month, days) {
  const dayMap = {}
  days.forEach(d => { dayMap[String(d.date)] = d })
  const firstDay = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const startWeekday = firstDay.getDay()
  const cells = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, dateStr, data: dayMap[dateStr] || null })
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

const CHART_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899']

// ─── Isolated live clock — 1s timer stays inside this tiny component only ────
function LiveClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return (
    <>
      <p className="text-base font-bold text-gray-900 tabular-nums mt-0.5">
        {now.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Dubai' })}
      </p>
      <p className="text-xs text-gray-400 mt-0.5">
        {now.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Dubai' })}
      </p>
    </>
  )
}

// ─── Check-In / Check-Out Widget — shown for all roles ───────────────────────

const CheckInOutWidget = memo(function CheckInOutWidget({ user }) {
  const dispatch = useDispatch()
  const myAttendance = useSelector(selectEssAttendance)
  const workInfo = useSelector(selectEssWorkInfo)
  const [actionLoading, setActionLoading] = useState(false)
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    function computeElapsed() {
      const todayStr = new Date().toISOString().slice(0, 10)
      const myRecord = myAttendance.find(r => r.attendanceDate === todayStr) || null
      const isClockedIn = myRecord?.checkIn && !myRecord?.checkOut
      if (isClockedIn && myRecord.checkInUtc) {
        const diffMs = Date.now() - new Date(myRecord.checkInUtc).getTime()
        if (diffMs > 0) {
          const diffH = Math.floor(diffMs / 3600000)
          const diffM = Math.floor((diffMs % 3600000) / 60000)
          setElapsed(`${diffH}h ${diffM}m worked`)
          return
        }
      }
      setElapsed('')
    }
    computeElapsed()
    const timer = setInterval(computeElapsed, 60000)
    return () => clearInterval(timer)
  }, [myAttendance])

  useEffect(() => {
    dispatch(fetchMyAttendance())
    dispatch(fetchMyWorkInfo())
  }, [dispatch])

  const todayStr = new Date().toISOString().slice(0, 10)
  const myRecord = myAttendance.find(r => r.attendanceDate === todayStr) || null
  const isClockedIn  = myRecord?.checkIn && !myRecord?.checkOut
  const isClockedOut = myRecord?.checkIn && myRecord?.checkOut

  const handleCheckIn = async () => {
    setActionLoading(true)
    await dispatch(checkIn({}))
    dispatch(fetchMyAttendance())
    setActionLoading(false)
  }

  const handleCheckOut = async () => {
    setActionLoading(true)
    await dispatch(checkOut())
    dispatch(fetchMyAttendance())
    setActionLoading(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-5 flex items-center gap-6 w-full">
      {/* Clock — isolated in its own component so the 1s tick only re-renders this tiny node */}
      <div className="flex-shrink-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Current Time</p>
        <LiveClock />
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-gray-100 flex-shrink-0" />

      {/* Status info */}
      <div className="flex-1">
        {isClockedIn && (
          <>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Checked in at</p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">
              {myRecord.checkInUtc
                ? new Date(myRecord.checkInUtc).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })
                : (myRecord.checkIn ? String(myRecord.checkIn).substring(0, 5) : '—')}
            </p>
            {elapsed && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <p className="text-xs font-medium text-green-600">{elapsed}</p>
              </div>
            )}
          </>
        )}
        {isClockedOut && (
          <div className="flex items-center gap-6">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Check In</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {myRecord.checkInUtc
                  ? new Date(myRecord.checkInUtc).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })
                  : (myRecord.checkIn ? String(myRecord.checkIn).substring(0, 5) : '—')}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Check Out</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">
                {myRecord.checkOutUtc
                  ? new Date(myRecord.checkOutUtc).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Dubai' })
                  : (myRecord.checkOut ? String(myRecord.checkOut).substring(0, 5) : '—')}
              </p>
            </div>
          </div>
        )}
        {!myRecord && user?.employeeId && (
          <>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Status</p>
            <p className="text-sm font-medium text-gray-500 mt-0.5">Not checked in today</p>
          </>
        )}
        {!user?.employeeId && (
          <p className="text-xs text-gray-400">No employee account</p>
        )}
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-gray-100 flex-shrink-0" />

      {/* Shift */}
      <div className="flex-shrink-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Shift</p>
        <p className="text-sm font-semibold text-gray-900 mt-0.5">
          {workInfo?.shiftName || '—'}
        </p>
      </div>

      {/* Divider */}
      <div className="h-10 w-px bg-gray-100 flex-shrink-0" />

      {/* Action button */}
      <div className="flex-shrink-0">
        {!user?.employeeId ? null : isClockedOut ? (
          <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gray-100 text-gray-500 text-sm font-medium">
            <CheckCircleIcon className="h-4 w-4 text-green-500" />
            Done for today
          </span>
        ) : isClockedIn ? (
          <button
            onClick={handleCheckOut}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <ClockIcon className="h-4 w-4" />
            {actionLoading ? 'Processing…' : 'Check Out'}
          </button>
        ) : (
          <button
            onClick={handleCheckIn}
            disabled={actionLoading}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <ClockIcon className="h-4 w-4" />
            {actionLoading ? 'Processing…' : 'Check In'}
          </button>
        )}
      </div>
    </div>
  )
})

// ─── Sub-views ────────────────────────────────────────────────────────────────

function PlatformAdminDashboard({ organizations, headcount, leave, helpdesk }) {
  const activeOrgs = (organizations?.data || []).filter(o => o.status === 'ACTIVE')
  const pendingLeaves = (leave.data || []).filter(l => l.status === 'PENDING')
  const openTickets = (helpdesk.data || []).filter(t => t.status === 'OPEN')

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Active Organizations" value={activeOrgs.length || '—'} icon={BuildingOffice2Icon} color="indigo" />
        <StatCard title="Total Employees" value={headcount?.total ?? '—'} icon={UsersIcon} color="emerald" />
        <StatCard title="Pending Leaves" value={pendingLeaves.length} icon={CalendarDaysIcon} color="amber" />
        <StatCard title="Open Tickets" value={openTickets.length} icon={TicketIcon} color="red" />
      </div>

      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">All Client Organizations</h3>
        {organizations?.loading ? <Spinner size="sm" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="pb-2 text-left font-medium">Organization</th>
                  <th className="pb-2 text-left font-medium">Contact Email</th>
                  <th className="pb-2 text-left font-medium">Plan</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(organizations?.data || []).slice(0, 10).map(org => (
                  <tr key={org.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-medium text-gray-800">{org.name || '—'}</td>
                    <td className="py-2.5 text-gray-500">{org.contactEmail || '—'}</td>
                    <td className="py-2.5 text-gray-500 capitalize">{org.subscriptionPlan?.toLowerCase() || '—'}</td>
                    <td className="py-2.5">
                      <Badge label={org.status || 'Active'} variant={STATUS_COLORS[org.status?.toLowerCase()] || 'success'} />
                    </td>
                  </tr>
                ))}
                {(organizations?.data || []).length === 0 && (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-400 text-sm">No organizations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Leave Requests</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b">
              <th className="pb-2 text-left">Employee</th>
              <th className="pb-2 text-left">Type</th>
              <th className="pb-2 text-left">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {(leave.data || []).slice(0, 6).map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-800">{l.employeeName || '—'}</td>
                  <td className="py-2 text-gray-500">{l.leaveTypeName || '—'}</td>
                  <td className="py-2"><Badge label={l.status} variant={STATUS_COLORS[l.status?.toLowerCase()] || 'default'} /></td>
                </tr>
              ))}
              {(leave.data || []).length === 0 && <tr><td colSpan="3" className="py-4 text-center text-gray-400">No leave requests</td></tr>}
            </tbody>
          </table>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Support Tickets</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b">
              <th className="pb-2 text-left">Subject</th>
              <th className="pb-2 text-left">Priority</th>
              <th className="pb-2 text-left">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {(helpdesk.data || []).slice(0, 6).map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-800 max-w-[150px] truncate">{t.subject || t.title || '—'}</td>
                  <td className="py-2"><Badge label={t.priority} variant={t.priority === 'HIGH' || t.priority === 'URGENT' ? 'danger' : 'warning'} /></td>
                  <td className="py-2"><Badge label={t.status} variant={STATUS_COLORS[t.status?.toLowerCase()] || 'default'} /></td>
                </tr>
              ))}
              {(helpdesk.data || []).length === 0 && <tr><td colSpan="3" className="py-4 text-center text-gray-400">No tickets</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
}

const EnterpriseAdminDashboard = memo(function EnterpriseAdminDashboard({ branchSummaryList, headcount, leave, attendanceReport, helpdesk, companies }) {
  const pendingLeaves = useMemo(() => (leave.data || []).filter(l => l.status === 'PENDING'), [leave.data])
  const openTickets = useMemo(() => (helpdesk.data || []).filter(t => t.status === 'OPEN'), [helpdesk.data])

  const deptData = useMemo(() => (headcount?.departmentBreakdown || []).map(d => ({
    name: d.department?.length > 12 ? d.department.slice(0, 12) + '…' : d.department,
    count: d.count,
  })), [headcount?.departmentBreakdown])

  const attendanceChartData = useMemo(() => (attendanceReport?.daily || []).slice(-7).map(d => ({
    day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
    present: d.present ?? 0,
    absent: d.absent ?? 0,
  })), [attendanceReport?.daily])

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <StatCard title="Total Employees" value={headcount?.total ?? '—'} icon={UsersIcon} color="indigo" />
        <StatCard title="Active Employees" value={headcount?.active ?? '—'} icon={CheckCircleIcon} color="emerald" />
        <StatCard title="Inactive Employees" value={headcount?.inactive ?? '—'} icon={XCircleIcon} color="red" />
        <StatCard title="Branch Companies" value={branchSummaryList.length} icon={BuildingOffice2Icon} color="violet" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard title="Pending Leaves" value={pendingLeaves.length} icon={CalendarDaysIcon} color="amber" />
        <StatCard title="Open Tickets" value={openTickets.length} icon={TicketIcon} color="red" />
        <StatCard title="Departments" value={deptData.length || '—'} icon={UserGroupIcon} color="emerald" />
      </div>

      {/* Branch table */}
      <Card className="mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">
          Branch Companies <span className="text-gray-400 font-normal">({branchSummaryList.length}/5)</span>
        </h3>
        {companies?.loading ? <Spinner size="sm" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="pb-2 text-left font-medium">Branch</th>
                  <th className="pb-2 text-left font-medium">Location</th>
                  <th className="pb-2 text-left font-medium">Employees</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {branchSummaryList.slice(0, 5).map(branch => (
                  <tr key={branch.id} className="hover:bg-gray-50">
                    <td className="py-2.5 font-medium text-gray-800">{branch.name || '—'}</td>
                    <td className="py-2.5 text-gray-500">{branch.location || branch.address || '—'}</td>
                    <td className="py-2.5 font-semibold text-gray-800">{branch.employeeCount ?? '—'}</td>
                    <td className="py-2.5">
                      <Badge label={branch.status || 'Active'} variant={STATUS_COLORS[branch.status?.toLowerCase()] || 'success'} />
                    </td>
                  </tr>
                ))}
                {branchSummaryList.length === 0 && (
                  <tr><td colSpan="4" className="py-8 text-center text-gray-400 text-sm">No branches yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Employees by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} name="Employees" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No department data</div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Attendance Overview (This Week)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceChartData.length > 0 ? attendanceChartData : [{ day: 'No data', present: 0, absent: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="present" fill="#6366F1" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Pending approvals + leave requests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Pending Leave Approvals</h3>
          <div className="space-y-3">
            {pendingLeaves.slice(0, 6).map(l => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={l.employeeName || 'E'} size="sm" />
                  <div>
                    <p className="font-medium text-gray-800">{l.employeeName || 'Employee'}</p>
                    <p className="text-xs text-gray-400">{formatDate(l.startDate)} – {formatDate(l.endDate)}</p>
                  </div>
                </div>
                <Badge label="Pending" variant="warning" />
              </div>
            ))}
            {pendingLeaves.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No pending approvals</p>}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Leave Requests</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b">
              <th className="pb-2 text-left">Employee</th>
              <th className="pb-2 text-left">Type</th>
              <th className="pb-2 text-left">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {(leave.data || []).slice(0, 6).map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-800">{l.employeeName || '—'}</td>
                  <td className="py-2 text-gray-500">{l.leaveTypeName || '—'}</td>
                  <td className="py-2"><Badge label={l.status} variant={STATUS_COLORS[l.status?.toLowerCase()] || 'default'} /></td>
                </tr>
              ))}
              {(leave.data || []).length === 0 && <tr><td colSpan="3" className="py-4 text-center text-gray-400">No requests</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
})

const BranchHRDashboard = memo(function BranchHRDashboard({ headcount, attendanceDashboard, attendanceReport, leave, helpdesk, user }) {
  const pendingLeaves = useMemo(() => (leave.data || []).filter(l => l.status === 'PENDING'), [leave.data])
  const openTickets = useMemo(() => (helpdesk.data || []).filter(t => t.status === 'OPEN'), [helpdesk.data])

  const deptData = useMemo(() => (headcount?.departmentBreakdown || []).map(d => ({
    name: d.department?.length > 14 ? d.department.slice(0, 14) + '…' : d.department,
    count: d.count,
  })), [headcount?.departmentBreakdown])

  const attendanceChartData = useMemo(() => (attendanceReport?.daily || []).slice(-7).map(d => ({
    day: new Date(d.date).toLocaleDateString('en', { weekday: 'short' }),
    present: d.present ?? 0,
    absent: d.absent ?? 0,
  })), [attendanceReport?.daily])

  const todayStats = [
    { label: 'Total Employees', value: headcount?.total ?? '—', color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Employees', value: headcount?.active ?? '—', color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Checked In Today', value: attendanceDashboard?.employeesClockedInToday ?? '—', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Late Arrivals', value: attendanceDashboard?.lateEmployees ?? '—', color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ]

  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {todayStats.map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4 border border-white shadow-sm`}>
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Pending Leave Approvals" value={pendingLeaves.length} icon={CalendarDaysIcon} color="amber" />
        <StatCard title="Open Tickets" value={openTickets.length} icon={TicketIcon} color="red" />
        <StatCard title="Departments" value={deptData.length || '—'} icon={ChartBarIcon} color="violet" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Employees by Department</h3>
          {deptData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={deptData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} name="Employees" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">No department data</div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Attendance Overview (This Week)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={attendanceChartData.length > 0 ? attendanceChartData : [{ day: 'Mon', present: 0, absent: 0 }]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="present" fill="#6366F1" radius={[4, 4, 0, 0]} name="Present" />
              <Bar dataKey="absent" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Absent" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Pending Leave Approvals</h3>
          <div className="space-y-3">
            {pendingLeaves.slice(0, 6).map(l => (
              <div key={l.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <Avatar name={l.employeeName || 'E'} size="sm" />
                  <div>
                    <p className="font-medium text-gray-800">{l.employeeName || 'Employee'}</p>
                    <p className="text-xs text-gray-400">{l.leaveTypeName} · {formatDate(l.startDate)} – {formatDate(l.endDate)}</p>
                  </div>
                </div>
                <Badge label="Pending" variant="warning" />
              </div>
            ))}
            {pendingLeaves.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No pending approvals</p>}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Support Tickets</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-xs text-gray-500 border-b">
              <th className="pb-2 text-left">Subject</th>
              <th className="pb-2 text-left">Priority</th>
              <th className="pb-2 text-left">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {(helpdesk.data || []).slice(0, 6).map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="py-2 font-medium text-gray-800 max-w-[150px] truncate">{t.subject || t.title || '—'}</td>
                  <td className="py-2"><Badge label={t.priority} variant={t.priority === 'HIGH' || t.priority === 'URGENT' ? 'danger' : 'warning'} /></td>
                  <td className="py-2"><Badge label={t.status} variant={STATUS_COLORS[t.status?.toLowerCase()] || 'default'} /></td>
                </tr>
              ))}
              {(helpdesk.data || []).length === 0 && <tr><td colSpan="3" className="py-4 text-center text-gray-400">No tickets</td></tr>}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  )
})

function AccountantDashboard({ leave, helpdesk }) {
  const pendingLeaves = (leave.data || []).filter(l => l.status === 'PENDING')
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        <StatCard title="Pending Leave Approvals" value={pendingLeaves.length} icon={CalendarDaysIcon} color="amber" />
        <StatCard title="Open Tickets" value={(helpdesk.data || []).filter(t => t.status === 'OPEN').length} icon={TicketIcon} color="red" />
        <StatCard title="Finance Overview" value="—" icon={BanknotesIcon} color="emerald" />
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Leave Requests</h3>
        <table className="w-full text-sm">
          <thead><tr className="text-xs text-gray-500 border-b">
            <th className="pb-2 text-left">Employee</th>
            <th className="pb-2 text-left">Type</th>
            <th className="pb-2 text-left">Dates</th>
            <th className="pb-2 text-left">Status</th>
          </tr></thead>
          <tbody className="divide-y divide-gray-50">
            {(leave.data || []).slice(0, 8).map(l => (
              <tr key={l.id} className="hover:bg-gray-50">
                <td className="py-2 font-medium text-gray-800">{l.employeeName || '—'}</td>
                <td className="py-2 text-gray-500">{l.leaveTypeName || '—'}</td>
                <td className="py-2 text-gray-500 text-xs">{formatDate(l.startDate)} – {formatDate(l.endDate)}</td>
                <td className="py-2"><Badge label={l.status} variant={STATUS_COLORS[l.status?.toLowerCase()] || 'default'} /></td>
              </tr>
            ))}
            {(leave.data || []).length === 0 && <tr><td colSpan="4" className="py-4 text-center text-gray-400">No requests</td></tr>}
          </tbody>
        </table>
      </Card>
    </>
  )
}

function DeptManagerDashboard({ leave, headcount }) {
  const pendingLeaves = (leave.data || []).filter(l => l.status === 'PENDING')
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard title="Team Employees" value={headcount?.total ?? '—'} icon={UsersIcon} color="indigo" />
        <StatCard title="Pending Leave Approvals" value={pendingLeaves.length} icon={CalendarDaysIcon} color="amber" />
        <StatCard title="Active Employees" value={headcount?.active ?? '—'} icon={CheckCircleIcon} color="emerald" />
      </div>
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Pending Leave Requests</h3>
        <div className="space-y-3">
          {pendingLeaves.slice(0, 8).map(l => (
            <div key={l.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <Avatar name={l.employeeName || 'E'} size="sm" />
                <div>
                  <p className="font-medium text-gray-800">{l.employeeName || 'Employee'}</p>
                  <p className="text-xs text-gray-400">{l.leaveTypeName} · {formatDate(l.startDate)} – {formatDate(l.endDate)}</p>
                </div>
              </div>
              <Badge label="Pending" variant="warning" />
            </div>
          ))}
          {pendingLeaves.length === 0 && <p className="text-sm text-gray-400 text-center py-6">No pending leave requests</p>}
        </div>
      </Card>
    </>
  )
}

// ─── Welcome banner — employees only ─────────────────────────────────────────
function WelcomeBanner({ user, today, workInfo }) {
  const now = new Date()
  const dayName = now.toLocaleDateString('en', { weekday: 'long' })
  const dateStr = `${String(now.getDate()).padStart(2, '0')} ${now.toLocaleDateString('en', { month: 'short' })} ${now.getFullYear()}`
  const myRecord = user?.employeeId ? (today || []).find(r => r.employeeId === user.employeeId) : null
  const attendanceStatus = myRecord?.checkIn ? 'PRESENT' : null
  const checkIn = myRecord?.checkIn || null
  // Prefer shift from today's attendance record; fall back to employee's assigned shift from work info
  const shiftName = myRecord?.shiftName || workInfo?.shiftName || null
  const shiftStart = null
  const shiftEnd = null

  return (
    <div className="flex flex-col xl:flex-row gap-6 mb-6">
      <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
          <UsersIcon className="w-8 h-8 text-gray-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-indigo-700">Welcome, {user?.firstName || user?.name?.split(' ')[0] || user?.username?.split('@')[0] || 'there'}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{dayName} &bull; {dateStr}</p>
          <p className="text-sm text-gray-400 mt-0.5">Reporting Manager – {user?.reportingManager || 'None'}</p>
        </div>
      </div>
      <div className="xl:w-80 bg-indigo-600 rounded-2xl p-5 text-white flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-indigo-200">Attendance Status</span>
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
            attendanceStatus === 'PRESENT' ? 'bg-green-400 text-white' :
            attendanceStatus === 'ABSENT'  ? 'bg-red-400 text-white' :
            'bg-white/20 text-white'
          }`}>
            {attendanceStatus || 'Absent'}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-indigo-300">Clock In</p>
            <p className="text-lg font-bold mt-0.5">{checkIn || '--:--'}</p>
          </div>
          <div>
            <p className="text-xs text-indigo-300">Shift</p>
            <p className="text-sm font-bold mt-0.5">{shiftName || '—'}</p>
            {shiftStart && shiftEnd && (
              <p className="text-xs text-indigo-300 mt-0.5">{shiftStart} – {shiftEnd}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Personal attendance section — shown for ALL roles ────────────────────────
function PersonalAttendanceSection({ attendanceDashboard }) {
  const dispatch = useDispatch()
  const notifications = useSelector(selectNotifications)
  const calendarDays = useSelector(selectCalendarDays)
  const calendarLoading = useSelector(selectCalendarLoading)

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    dispatch(fetchCalendar({ year: calYear, month: calMonth }))
  }, [dispatch, calYear, calMonth])

  useEffect(() => {
    dispatch(fetchNotifications({ page: 0, size: 20 }))
  }, [dispatch])

  const prevMonth = () => {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12) }
    else setCalMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1) }
    else setCalMonth(m => m + 1)
  }

  const monthLabel = new Date(calYear, calMonth - 1).toLocaleDateString('en', { month: 'long', year: 'numeric' })
  const cells = buildCalendarGrid(calYear, calMonth, calendarDays)
  const todayStr = now.toISOString().slice(0, 10)
  const visibleNotifications = dismissed ? [] : (notifications || [])

  function timeAgo(ts) {
    if (!ts) return ''
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins} min ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs} hour${hrs > 1 ? 's' : ''} ago`
    const days = Math.floor(hrs / 24)
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`
    const weeks = Math.floor(days / 7)
    if (weeks < 5) return `${weeks} week${weeks > 1 ? 's' : ''} ago`
    return `${Math.floor(days / 30)} month${Math.floor(days / 30) > 1 ? 's' : ''} ago`
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
      {/* Attendance Calendar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-indigo-700">Attendance Calendar</h3>
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronLeftIcon className="h-3.5 w-3.5 text-gray-500" />
            </button>
            <button onClick={nextMonth} className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              <ChevronRightIcon className="h-3.5 w-3.5 text-gray-500" />
            </button>
          </div>
        </div>
        <p className="text-sm font-semibold text-gray-700 mb-3">{monthLabel}</p>
        {calendarLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : (
          <>
            <div className="grid grid-cols-7 mb-1">
              {WEEKDAYS.map((wd, i) => (
                <div key={wd} className={`text-center text-xs font-semibold py-1 ${i === 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {wd}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((cell, idx) => {
                if (!cell) return <div key={`e-${idx}`} />
                const { day, dateStr: ds, data } = cell
                const isToday = ds === todayStr
                const isFuture = !data || data.dayType === 'future'
                const dayType = data?.dayType || (isFuture ? 'future' : 'absent')
                const meta = CAL_DAY_TYPE[dayType] || CAL_DAY_TYPE.future
                return (
                  <div key={ds} className="flex justify-center items-center py-0.5">
                    <span className={`
                      w-8 h-8 rounded-full text-xs font-semibold flex items-center justify-center
                      ${isFuture ? 'text-gray-300' : meta.circle}
                      ${isToday && !isFuture ? 'ring-2 ring-offset-1 ring-white shadow' : ''}
                    `}>
                      {day}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-x-3 gap-y-1.5">
              {Object.entries(CAL_DAY_TYPE).filter(([k]) => k !== 'future').map(([key, meta]) => (
                <span key={key} className="flex items-center gap-1 text-xs text-gray-500">
                  <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${meta.dot}`} />
                  {meta.label}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-base font-bold text-indigo-700 mb-4">Quick Actions</h3>
        <div className="space-y-3">
          <a href="/payroll/payslips" className="flex items-center justify-center w-full border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors">
            Download Payslip
          </a>
          <a href="/leave" className="flex items-center justify-center w-full border border-gray-200 rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors">
            Apply Leave
          </a>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-indigo-700">Notifications</h3>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <button
              onClick={() => dispatch(markAllNotificationsRead())}
              className="flex items-center gap-0.5 hover:text-gray-600 transition-colors"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" /> Mark as read
            </button>
            <span>·</span>
            <button onClick={() => setDismissed(true)} className="hover:text-red-500 transition-colors">
              ✕ Clear
            </button>
          </div>
        </div>
        <div className="space-y-3 overflow-y-auto max-h-64">
          {visibleNotifications.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No notifications</p>
          ) : (
            visibleNotifications.slice(0, 8).map(n => (
              <div key={n.id} className="flex items-start gap-3">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${n.isRead ? 'bg-gray-300' : 'bg-indigo-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 leading-snug">{n.message || n.title || 'Notification'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.createdAt || n.timestamp)} by {n.triggeredBy || n.senderName || 'system'}</p>
                </div>
                {!n.isRead && (
                  <button
                    onClick={() => dispatch(markAllNotificationsRead())}
                    className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center"
                  >
                    <CheckCircleIcon className="h-3.5 w-3.5 text-white" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const dispatch = useDispatch()
  const { isPlatformAdmin, isEnterpriseAdmin, isBranchAdmin, isHRManager, isAccountant, isDeptManager, user } = useAuth()
  const leave = useSelector(s => s.leave)
  const helpdesk = useSelector(s => s.helpdesk)
  const organizations = useSelector(s => s.organizations)
  const companies = useSelector(s => s.companies)
  const headcount = useSelector(s => s.reports.headcount)
  const attendanceReport = useSelector(s => s.reports.attendance)
  const branchesSummary = useSelector(selectBranchesSummary)
  const employeeDashboard = useSelector(s => s.employees.employeeDashboard)
  const attendanceDashboard = useSelector(s => s.attendance.dashboard)
  const todayAttendance = useSelector(s => s.attendance.today)
  const myWorkInfo = useSelector(selectEssWorkInfo)

  const isSuperAdmin = isPlatformAdmin()
  const isEntAdmin = isEnterpriseAdmin()
  const isBranchMgr = isBranchAdmin()
  const isHR = isHRManager()
  const isAcc = isAccountant()
  const isDeptMgr = isDeptManager()
  const isEmployee = !isSuperAdmin && !isEntAdmin && !isBranchMgr && !isHR && !isAcc && !isDeptMgr

  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const isSuperAdminViewingCompany = isSuperAdmin && !!selectedCompanyId

  // If the selected company is a branch, resolve to its parent head office for branch-summary calls
  const platformCompanies = useSelector(selectPlatformCompanies)
  const selectedCompany = platformCompanies.find(c => String(c.id) === String(selectedCompanyId))
  const effectiveHeadOfficeId = selectedCompany?.type === 'BRANCH' && selectedCompany?.parentCompanyId
    ? selectedCompany.parentCompanyId
    : selectedCompanyId

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const companyId = user?.companyId

  const branchSummaryList = isSuperAdminViewingCompany
    ? (branchesSummary[effectiveHeadOfficeId] || [])
    : user?.companyId ? (branchesSummary[user.companyId] || []) : []

  useEffect(() => {
    dispatch(fetchLeave({ page: 0, size: 10 }))
    dispatch(fetchTickets({ page: 0, size: 10 }))
    dispatch(fetchHeadcountReport({}))
    dispatch(fetchAttendanceReport({ from: weekAgo, to: today }))
    if (companyId) {
      dispatch(fetchEmployeeDashboard({ companyId }))
      dispatch(fetchAttendanceDashboard({ companyId, date: today }))
      dispatch(fetchToday({ companyId }))
      if (user?.employeeId) dispatch(fetchMyWorkInfo())
    }
    if (isSuperAdmin && !selectedCompanyId) dispatch(fetchOrganizations({ page: 0, size: 100 }))
    if (isSuperAdminViewingCompany) dispatch(fetchBranchesSummary(effectiveHeadOfficeId))
    if (isEntAdmin && companyId) dispatch(fetchBranchesSummary(companyId))
  }, [dispatch, isSuperAdmin, isEntAdmin, companyId, selectedCompanyId, effectiveHeadOfficeId])

  const subtitle = isSuperAdminViewingCompany
    ? 'Company admin view — head office & branches'
    : isSuperAdmin
    ? 'Platform overview — all client organizations'
    : isEntAdmin
      ? 'Head office overview — all branches'
      : isBranchMgr
        ? `Branch overview — ${user?.companyName || 'your branch'}`
        : isHR
          ? 'HR overview — your scope'
          : isAcc
            ? 'Finance overview'
            : isDeptMgr
              ? 'Department overview'
              : `Welcome back, ${user?.firstName || user?.name?.split(' ')[0] || user?.username?.split('@')[0] || 'there'}`

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={subtitle} />
      {/* Welcome + Check-in side by side */}
      <div className="flex flex-col xl:flex-row items-stretch gap-4 mb-6">
        <div className="flex-1 flex"><WelcomeHeader /></div>
        <div className="flex"><CheckInOutWidget user={user} /></div>
      </div>

      {/* Employee-only: welcome banner + today's attendance status */}
      {isEmployee && <WelcomeBanner user={user} today={todayAttendance} workInfo={myWorkInfo} />}

      {/* Personal attendance calendar + quick actions + notifications — all roles */}
      <PersonalAttendanceSection attendanceDashboard={attendanceDashboard} />

      {/* Role-specific content */}
      {isSuperAdmin && !selectedCompanyId && (
        <PlatformAdminDashboard
          organizations={organizations}
          headcount={headcount}
          leave={leave}
          helpdesk={helpdesk}
        />
      )}

      {isSuperAdminViewingCompany && (
        <EnterpriseAdminDashboard
          branchSummaryList={branchSummaryList}
          headcount={headcount}
          leave={leave}
          attendanceReport={attendanceReport}
          helpdesk={helpdesk}
          companies={companies}
        />
      )}

      {isEntAdmin && (
        <EnterpriseAdminDashboard
          branchSummaryList={branchSummaryList}
          headcount={headcount}
          leave={leave}
          attendanceReport={attendanceReport}
          helpdesk={helpdesk}
          companies={companies}
        />
      )}

      {(isBranchMgr || isHR) && (
        <BranchHRDashboard
          headcount={employeeDashboard || headcount}
          attendanceDashboard={attendanceDashboard}
          attendanceReport={attendanceReport}
          leave={leave}
          helpdesk={helpdesk}
          user={user}
        />
      )}

      {isAcc && (
        <AccountantDashboard leave={leave} helpdesk={helpdesk} />
      )}

      {isDeptMgr && (
        <DeptManagerDashboard leave={leave} headcount={employeeDashboard || headcount} />
      )}
    </div>
  )
}
