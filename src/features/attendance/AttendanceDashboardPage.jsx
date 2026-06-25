import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import {
  ClockIcon, CheckCircleIcon, ExclamationTriangleIcon,
  UserMinusIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline'
import {
  fetchAttendanceDashboard, fetchNotIn,
  fetchAll as fetchAttendance,
} from './attendanceSlice'
import { fetchPendingCounts, selectPendingCounts } from './regularisationSlice'
import { fetchAll as fetchDepartments } from '../departments/departmentsSlice'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import useAuth from '../../hooks/useAuth'

const QUALITY_COLORS = {
  REGULAR:     'success',
  IRREGULAR:   'warning',
  REGULARISED: 'accent',
}

export default function AttendanceDashboardPage() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { isHRManager, isBranchAdmin, isEnterpriseAdmin, isPlatformAdmin, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [departmentId, setDepartmentId] = useState('')

  const dashboard = useSelector(s => s.attendance.dashboard)
  const notIn = useSelector(s => s.attendance.notIn || [])
  const allAttendance = useSelector(s => s.attendance.data || [])
  const loading = useSelector(s => s.attendance.loading)
  const departments = useSelector(s => s.departments?.data || [])
  const pendingCounts = useSelector(selectPendingCounts)

  const isManager = isPlatformAdmin() || isEnterpriseAdmin() || isBranchAdmin() || isHRManager()

  useEffect(() => {
    if (companyId) dispatch(fetchDepartments({ companyId }))
  }, [dispatch, companyId])

  useEffect(() => {
    if (companyId) {
      const params = { companyId, date }
      if (departmentId) params.departmentId = departmentId
      dispatch(fetchAttendanceDashboard(params))
      dispatch(fetchNotIn({ companyId }))
    }
  }, [dispatch, companyId, date, departmentId])

  useEffect(() => {
    if (companyId && isManager) {
      dispatch(fetchAttendance({ companyId, page: 0, size: 30 }))
      dispatch(fetchPendingCounts(companyId))
    }
  }, [dispatch, companyId, isManager])

  const total = dashboard?.totalAttendanceToday ?? dashboard?.totalEmployees ?? 0
  const clockedIn = dashboard?.employeesClockedInToday ?? dashboard?.presentToday ?? 0
  const late = dashboard?.lateEmployees ?? dashboard?.lateCount ?? 0
  const absent = total > 0 ? Math.max(0, total - clockedIn) : (dashboard?.absentCount ?? dashboard?.absentToday ?? 0)
  const onTime = Math.max(0, clockedIn - late)
  const irregularToday = dashboard?.irregularToday ?? 0

  const pctPresent = total > 0 ? Math.round((clockedIn / total) * 100) : 0
  const pctOnTime = clockedIn > 0 ? Math.round((onTime / clockedIn) * 100) : 0

  // Build last-7-day chart from attendance records
  const last7 = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayLabel = d.toLocaleDateString('en', { weekday: 'short' })
    const records = allAttendance.filter(a => a.attendanceDate === key)
    last7.push({
      day: dayLabel,
      present: records.filter(a => a.attendanceStatus !== 'IRREGULAR').length,
      irregular: records.filter(a => a.attendanceStatus === 'IRREGULAR').length,
    })
  }

  const hoursByDepartment = dashboard?.hoursByDepartment || []

  const statCards = [
    {
      label: 'Attendance Rate',
      value: `${pctPresent}%`,
      sub: `${clockedIn} of ${total} employees`,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
      icon: ClockIcon,
    },
    {
      label: 'On Time',
      value: onTime,
      sub: `${pctOnTime}% punctuality`,
      color: 'text-green-600',
      bg: 'bg-green-50 border-green-100',
      icon: CheckCircleIcon,
    },
    {
      label: 'Late Arrivals',
      value: late,
      sub: late === 1 ? '1 employee late' : `${late} employees late`,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50 border-yellow-100',
      icon: ExclamationTriangleIcon,
    },
    {
      label: 'Not Checked In',
      value: notIn.length || absent,
      sub: 'As of now',
      color: 'text-red-600',
      bg: 'bg-red-50 border-red-100',
      icon: UserMinusIcon,
    },
  ]

  return (
    <div>
      <PageHeader title="Attendance Dashboard" subtitle="Daily attendance analytics and team overview">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 font-medium">Date:</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 font-medium">Department:</label>
            <select
              value={departmentId}
              onChange={e => setDepartmentId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <div key={s.label} className={`${s.bg} border rounded-xl p-4 shadow-sm`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1">{s.label}</p>
                <p className={`text-2xl font-bold ${s.color}`}>{loading ? '—' : s.value}</p>
                <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
              </div>
              <s.icon className={`h-6 w-6 ${s.color} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Attendance Analytics — Last 7 Days
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="present" fill="#6366F1" radius={[4, 4, 0, 0]} name="Regular" />
              <Bar dataKey="irregular" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Irregular" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">
            Hours Worked by Department — Last 7 Days
          </h3>
          {hoursByDepartment.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hoursByDepartment} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} unit="h" allowDecimals={false} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} width={90} allowDecimals={false} />
                <Tooltip formatter={v => [`${v}h`, 'Total Hours']} />
                <Bar dataKey="totalHours" fill="#10B981" radius={[0, 4, 4, 0]} name="Hours" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
              No hours data for the last 7 days
            </div>
          )}
        </Card>
      </div>

      {/* Not checked in + pending regularisations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Not Checked In</h3>
            <button
              onClick={() => companyId && dispatch(fetchNotIn({ companyId }))}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="Refresh"
            >
              <ArrowPathIcon className="h-4 w-4 text-gray-400" />
            </button>
          </div>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {notIn.map((emp, i) => (
              <div key={emp.id || i} className="flex items-center gap-3 text-sm">
                <Avatar name={emp.name || emp.firstName || 'E'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{emp.name || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || '—'}</p>
                  <p className="text-xs text-gray-400">{emp.department || emp.jobPosition || 'Employee'}</p>
                </div>
                <span className="text-xs text-red-500 font-medium">Absent</span>
              </div>
            ))}
            {notIn.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">All employees have checked in</p>
            )}
          </div>
        </Card>

        {/* Pending regularisations — managers only */}
        {isManager && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Pending Regularisations
                {(pendingCounts.pendingManager > 0 || pendingCounts.pendingHR > 0) && (
                  <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {pendingCounts.pendingManager + pendingCounts.pendingHR}
                  </span>
                )}
              </h3>
              <button
                onClick={() => companyId && dispatch(fetchPendingCounts(companyId))}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                title="Refresh"
              >
                <ArrowPathIcon className="h-4 w-4 text-gray-400" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">Awaiting Your Approval</p>
                  <p className="text-xs text-gray-500 mt-0.5">Requests pending manager review</p>
                </div>
                <span className="text-2xl font-bold text-yellow-600">{pendingCounts.pendingManager}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                <div>
                  <p className="text-sm font-medium text-gray-800">Awaiting HR Verification</p>
                  <p className="text-xs text-gray-500 mt-0.5">Manager approved, pending HR</p>
                </div>
                <span className="text-2xl font-bold text-indigo-600">{pendingCounts.pendingHR}</span>
              </div>
              {irregularToday > 0 && (
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Irregular Today</p>
                    <p className="text-xs text-gray-500 mt-0.5">Records marked IRREGULAR</p>
                  </div>
                  <span className="text-2xl font-bold text-red-600">{irregularToday}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate('/attendance/regularisation')}
              className="mt-3 w-full text-xs text-indigo-600 hover:underline text-center"
            >
              View all regularisation requests →
            </button>
          </Card>
        )}
      </div>

      {/* Recent attendance records — managers only */}
      {isManager && (
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Attendance Records</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="pb-2 text-left font-medium">Employee</th>
                  <th className="pb-2 text-left font-medium">Date</th>
                  <th className="pb-2 text-left font-medium">Check In</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allAttendance.slice(0, 8).map(a => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-800 truncate max-w-[100px]">{a.employeeName || '—'}</td>
                    <td className="py-2 text-gray-500">{a.attendanceDate || '—'}</td>
                    <td className="py-2 text-gray-500">{a.checkIn || '—'}</td>
                    <td className="py-2">
                      <Badge
                        label={a.attendanceStatus || 'REGULAR'}
                        variant={QUALITY_COLORS[a.attendanceStatus] || 'success'}
                      />
                    </td>
                  </tr>
                ))}
                {allAttendance.length === 0 && (
                  <tr><td colSpan="4" className="py-6 text-center text-gray-400">No records</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
