import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import { fetchHeadcount as fetchHeadcountReport, fetchAttendanceReport, fetchLeaveReport, fetchPayrollReport, exportReport, selectLoading, selectExporting } from './reportsSlice'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Spinner from '../../components/common/Spinner'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import toast from 'react-hot-toast'

const TABS = ['Headcount', 'Attendance', 'Leave', 'Payroll']
const COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444']

const today = new Date().toISOString().split('T')[0]
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const TAB_REPORT_TYPE = { Attendance: 'attendance', Leave: 'leave', Payroll: 'payroll' }

export default function ReportsPage() {
  const dispatch = useDispatch()
  const loading = useSelector(selectLoading)
  const exporting = useSelector(selectExporting)
  const headcount = useSelector(s => s.reports.headcount)
  const attendance = useSelector(s => s.reports.attendance)
  const leave = useSelector(s => s.reports.leave)
  const payroll = useSelector(s => s.reports.payroll)
  const [tab, setTab] = useState('Headcount')
  const [dateRange, setDateRange] = useState({ from: thirtyDaysAgo, to: today })

  // Fetch headcount once (no date range)
  useEffect(() => {
    dispatch(fetchHeadcountReport({}))
  }, [dispatch])

  // Fetch date-range reports when tab or date range changes
  useEffect(() => {
    const params = { from: dateRange.from, to: dateRange.to }
    if (tab === 'Attendance') dispatch(fetchAttendanceReport(params))
    if (tab === 'Leave') dispatch(fetchLeaveReport(params))
    if (tab === 'Payroll') dispatch(fetchPayrollReport(params))
  }, [dispatch, tab, dateRange])

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }))
  }

  const handleExport = async () => {
    const type = TAB_REPORT_TYPE[tab]
    if (!type) return
    try {
      await dispatch(exportReport({ type, from: dateRange.from, to: dateRange.to })).unwrap()
      toast.success('Export downloaded')
    } catch (e) {
      toast.error(e || 'Export failed')
    }
  }

  const showDateRange = tab !== 'Headcount'
  const showExport = tab !== 'Headcount'

  return (
    <div>
      <PageHeader title="Reports" subtitle="Analytics and workforce insights" />

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Date range + export controls */}
      {showDateRange && (
        <div className="flex items-end gap-3 mb-6">
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input
              type="date"
              value={dateRange.from}
              max={dateRange.to}
              onChange={e => handleDateChange('from', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input
              type="date"
              value={dateRange.to}
              min={dateRange.from}
              max={today}
              onChange={e => handleDateChange('to', e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          {showExport && (
            <Button variant="secondary" onClick={handleExport} disabled={exporting}>
              {exporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          )}
        </div>
      )}

      {loading ? <Spinner className="py-16" /> : (
        <div className="space-y-6">
          {tab === 'Headcount' && (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[['Total', headcount?.total || 0, 'indigo'], ['Active', headcount?.active || 0, 'emerald'], ['On Leave', headcount?.onLeave || 0, 'amber'], ['Departed', headcount?.departed || 0, 'red']].map(([label, val, color]) => (
                  <Card key={label}><p className="text-xs text-gray-500">{label}</p><p className={`text-2xl font-bold text-${color}-600 mt-1`}>{val}</p></Card>
                ))}
              </div>
              <Card>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Headcount by Department</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={headcount?.byDepartment || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366F1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </>
          )}
          {tab === 'Attendance' && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Daily Attendance Trend</h3>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={attendance?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" stroke="#6366F1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="absent" stroke="#EF4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          )}
          {tab === 'Leave' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Leave by Type</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={leave?.byType || []} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                      {(leave?.byType || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
              <Card>
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Leave Status Summary</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={leave?.byStatus || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="status" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}
          {tab === 'Payroll' && (
            <Card>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Payroll Cost</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={payroll?.monthly || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(v) => `$${v?.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
