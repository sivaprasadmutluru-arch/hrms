import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  CalendarDaysIcon, CheckCircleIcon, XCircleIcon,
  ClockIcon, SunIcon,
} from '@heroicons/react/24/outline'
import {
  fetchLeaveDashboard, fetchAll as fetchLeave,
  fetchHolidays, fetchCompanyLeaves,
} from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Avatar from '../../components/common/Avatar'
import Spinner from '../../components/common/Spinner'
import useAuth from '../../hooks/useAuth'

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4']

function getMonthOptions() {
  const opts = []
  for (let i = 0; i < 12; i++) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    opts.push({
      value: d.toISOString().slice(0, 7),
      label: d.toLocaleDateString('en', { month: 'long', year: 'numeric' }),
    })
  }
  return opts
}

export default function LeaveDashboardPage() {
  const dispatch = useDispatch()
  const { user, effectiveCompanyId } = useAuth()
  const companyId = effectiveCompanyId
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const monthOptions = getMonthOptions()

  const dashboard = useSelector(s => s.leave.leaveDashboard)
  const allLeave = useSelector(s => s.leave.data || [])
  const holidays = useSelector(s => s.leave.holidays || [])
  const companyLeaves = useSelector(s => s.leave.companyLeaves || [])
  const loading = useSelector(s => s.leave.loading)

  useEffect(() => {
    if (companyId) {
      dispatch(fetchLeaveDashboard({ companyId, month: selectedMonth }))
      dispatch(fetchLeave({ companyId, page: 0, size: 50 }))
      dispatch(fetchHolidays({ companyId }))
      dispatch(fetchCompanyLeaves({ companyId }))
    }
  }, [dispatch, companyId, selectedMonth])

  const total = dashboard?.totalRequests ?? 0
  const pending = dashboard?.pendingRequests ?? 0
  const approved = dashboard?.approvedRequests ?? 0
  const rejected = dashboard?.rejectedRequests ?? 0

  // Monthly trend from dashboard API
  const monthlyData = dashboard?.monthlyTrend || []

  // Department breakdown from dashboard API
  const departmentBreakdown = dashboard?.departmentBreakdown || []

  // Weekly breakdown from dashboard API
  const weeklyBreakdown = dashboard?.weeklyBreakdown || []

  // Employees currently on leave
  const today = new Date().toISOString().slice(0, 10)
  const onLeaveToday = allLeave.filter(l => l.status === 'APPROVED' && l.startDate <= today && l.endDate >= today)

  // Leave type breakdown (pie chart)
  const typeMap = {}
  allLeave.forEach(l => {
    const name = l.leaveTypeName || 'Other'
    typeMap[name] = (typeMap[name] || 0) + 1
  })
  const typeData = Object.entries(typeMap).map(([name, count]) => ({ name, count }))

  // Upcoming holidays (next 90 days)
  const upcoming = [...holidays, ...companyLeaves]
    .filter(h => h.date >= today)
    .sort((a, b) => (a.date > b.date ? 1 : -1))
    .slice(0, 5)

  const nextHoliday = upcoming[0]
  const daysUntil = nextHoliday
    ? Math.ceil((new Date(nextHoliday.date) - new Date()) / (1000 * 60 * 60 * 24))
    : null

  const selectedMonthLabel = monthOptions.find(o => o.value === selectedMonth)?.label || selectedMonth

  return (
    <div>
      <PageHeader
        title="Leave Dashboard"
        subtitle="Leave requests, trends, and holiday calendar"
        actions={
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 font-medium">Month:</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            >
              {monthOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">To Approve</p>
              <p className="text-2xl font-bold text-amber-600">{loading ? '—' : pending}</p>
              <p className="text-xs text-gray-400 mt-1">Awaiting review</p>
            </div>
            <ClockIcon className="h-6 w-6 text-amber-400" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{loading ? '—' : approved}</p>
              <p className="text-xs text-gray-400 mt-1">Leaves granted</p>
            </div>
            <CheckCircleIcon className="h-6 w-6 text-green-400" />
          </div>
        </div>

        <div className="bg-red-50 border border-red-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{loading ? '—' : rejected}</p>
              <p className="text-xs text-gray-400 mt-1">Leaves declined</p>
            </div>
            <XCircleIcon className="h-6 w-6 text-red-400" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">On Leave Today</p>
              <p className="text-2xl font-bold text-blue-600">{loading ? '—' : onLeaveToday.length}</p>
              <p className="text-xs text-gray-400 mt-1">Currently absent</p>
            </div>
            <CalendarDaysIcon className="h-6 w-6 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Monthly trend chart + next holiday */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">6-Month Leave Trend ending {selectedMonthLabel}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="approved" fill="#10B981" radius={[4, 4, 0, 0]} name="Approved" />
              <Bar dataKey="rejected" fill="#EF4444" radius={[4, 4, 0, 0]} name="Rejected" />
              <Bar dataKey="pending" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Pending" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Next holiday */}
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <SunIcon className="h-4 w-4 text-amber-500" />
            Next Holiday
          </h3>
          {nextHoliday ? (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                <SunIcon className="h-8 w-8 text-amber-500" />
              </div>
              <p className="font-bold text-gray-800 text-lg">{nextHoliday.name || nextHoliday.holidayName || nextHoliday.description || '—'}</p>
              <p className="text-sm text-gray-500 mt-1">{nextHoliday.date}</p>
              <span className={`mt-2 inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                daysUntil === 0 ? 'bg-green-100 text-green-700' :
                daysUntil === 1 ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {daysUntil === 0 ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No upcoming holidays</p>
          )}

          <div className="mt-4 space-y-2">
            {upcoming.slice(1, 4).map((h, i) => (
              <div key={i} className="flex items-center justify-between text-sm border-t border-gray-50 pt-2">
                <span className="font-medium text-gray-700 truncate max-w-[140px]">{h.name || h.holidayName || h.description || '—'}</span>
                <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{h.date}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Department-wise + weekly analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Department-wise Leave Requests</h3>
          {departmentBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={departmentBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis dataKey="department" type="category" tick={{ fontSize: 10 }} width={90} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} name="Requests" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No department data</div>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Employees On Leave — This Week</h3>
          {weeklyBreakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyBreakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip labelFormatter={(_, payload) => payload?.[0]?.payload?.date || ''} />
                <Bar dataKey="onLeave" fill="#8B5CF6" radius={[4, 4, 0, 0]} name="On Leave" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No weekly data</div>
          )}
        </Card>
      </div>

      {/* On leave today + pie chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Employees On Leave Today</h3>
          <div className="space-y-2 max-h-[260px] overflow-y-auto">
            {onLeaveToday.slice(0, 10).map(l => (
              <div key={l.id} className="flex items-center gap-3 text-sm border-b border-gray-50 pb-2 last:border-0">
                <Avatar name={l.employeeName || 'E'} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{l.employeeName || '—'}</p>
                  <p className="text-xs text-gray-400">{l.leaveTypeName || '—'} · Until {l.endDate || '—'}</p>
                </div>
                <Badge label="On Leave" variant="info" />
              </div>
            ))}
            {onLeaveToday.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-8">No employees on leave today</p>
            )}
          </div>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Leave Type Breakdown</h3>
          {typeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={typeData}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No leave data</div>
          )}
        </Card>
      </div>

      {/* Recent leave requests table */}
      <Card>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Leave Requests</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b">
                <th className="pb-2 text-left font-medium">Employee</th>
                <th className="pb-2 text-left font-medium">Leave Type</th>
                <th className="pb-2 text-left font-medium">From</th>
                <th className="pb-2 text-left font-medium">To</th>
                <th className="pb-2 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {allLeave.slice(0, 10).map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="py-2.5 font-medium text-gray-800">{l.employeeName || '—'}</td>
                  <td className="py-2.5 text-gray-500">{l.leaveTypeName || '—'}</td>
                  <td className="py-2.5 text-gray-500">{l.startDate || '—'}</td>
                  <td className="py-2.5 text-gray-500">{l.endDate || '—'}</td>
                  <td className="py-2.5">
                    <Badge
                      label={l.status}
                      variant={l.status === 'APPROVED' ? 'success' : l.status === 'REJECTED' ? 'danger' : 'warning'}
                    />
                  </td>
                </tr>
              ))}
              {allLeave.length === 0 && (
                <tr><td colSpan="5" className="py-6 text-center text-gray-400">No leave requests</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
