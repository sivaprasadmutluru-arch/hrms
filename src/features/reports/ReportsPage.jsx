import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, Legend } from 'recharts'
import {
  fetchHeadcount as fetchHeadcountReport, fetchAttendanceReport, fetchLeaveReport, fetchPayrollReport,
  generateReport, fetchReportHistory, downloadGeneratedReport, renameReport, archiveReport, unarchiveReport,
  selectLoading, selectHistoryLoading, selectReportHistory, selectGenerating,
} from './reportsSlice'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Spinner from '../../components/common/Spinner'
import Input from '../../components/common/Input'
import Button from '../../components/common/Button'
import toast from 'react-hot-toast'
import useAuth from '../../hooks/useAuth'
import { ChartBarIcon } from '@heroicons/react/24/outline'

const TABS = ['Headcount', 'Attendance', 'Leave', 'Payroll', 'Report Repository']
const COLORS = ['#6366F1', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444']

const today = new Date().toISOString().split('T')[0]
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

const TAB_REPORT_TYPE = { Attendance: 'attendance', Leave: 'leave', Payroll: 'payroll' }
const TAB_REPOSITORY_TYPE = { Attendance: 'ATTENDANCE', Leave: 'LEAVE', Payroll: 'PAYROLL' }

// RPT-005: required report types for the central Reports repository
const REPOSITORY_REPORT_TYPES = [
  { value: 'ATTENDANCE', label: 'Attendance Report' },
  { value: 'CLOCK_IN_OUT', label: 'Clock-In/Clock-Out Report' },
  { value: 'WEEKLY_ATTENDANCE', label: 'Weekly Attendance Report' },
  { value: 'MONTHLY_ATTENDANCE', label: 'Monthly Attendance Report' },
  { value: 'LEAVE', label: 'Leave Report' },
  { value: 'PAYROLL', label: 'Payroll Report' },
]
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const STATUS_BADGE = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-red-100 text-red-700',
  PROCESSING: 'bg-amber-100 text-amber-700',
}

function ReportEmptyState({ title = 'No report data yet', description = 'Data will appear here when records are available.' }) {
  return (
    <div className="report-empty-state">
      <span className="report-empty-icon"><ChartBarIcon /></span>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  )
}

function ReportRepositoryTab() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const history = useSelector(selectReportHistory)
  const loading = useSelector(selectHistoryLoading)
  const generating = useSelector(selectGenerating)
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const companyId = selectedCompanyId || localStorage.getItem('selectedCompanyId') || user?.companyId || user?.company?.id

  const [genType, setGenType] = useState('ATTENDANCE')
  const [genFrom, setGenFrom] = useState(thirtyDaysAgo)
  const [genTo, setGenTo] = useState(today)

  const [filterType, setFilterType] = useState('')
  const [filterYear, setFilterYear] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterGeneratedBy, setFilterGeneratedBy] = useState('')
  const [generatedBySearch, setGeneratedBySearch] = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const loadHistory = () => {
    if (!companyId) return
    const params = { companyId, includeArchived }
    if (filterType) params.reportType = filterType
    if (filterYear) params.year = filterYear
    if (filterMonth) params.month = filterMonth
    if (filterStatus) params.status = filterStatus
    if (generatedBySearch) params.generatedBy = generatedBySearch
    dispatch(fetchReportHistory(params))
  }

  useEffect(() => { loadHistory() }, [dispatch, companyId, filterType, filterYear, filterMonth, filterStatus, generatedBySearch, includeArchived])

  const handleGenerate = async () => {
    if (!companyId) return toast.error('No company selected')
    if (!genFrom || !genTo) return toast.error('Select a date range')
    try {
      await dispatch(generateReport({ reportType: genType, companyId, from: genFrom, to: genTo })).unwrap()
      toast.success('Report generated')
      loadHistory()
    } catch (e) {
      toast.error(e || 'Failed to generate report')
    }
  }

  const handleDownload = (r) => {
    dispatch(downloadGeneratedReport({ id: r.id, filename: `${r.reportName}.xlsx` }))
  }

  const startRename = (r) => {
    setRenamingId(r.id)
    setRenameValue(r.reportName)
  }

  const submitRename = async (id) => {
    if (!renameValue.trim()) return
    try {
      await dispatch(renameReport({ id, reportName: renameValue.trim() })).unwrap()
      setRenamingId(null)
    } catch (e) {
      toast.error(e || 'Failed to rename report')
    }
  }

  const handleArchive = async (r) => {
    try {
      await dispatch(archiveReport(r.id)).unwrap()
      toast.success('Report archived')
      loadHistory()
    } catch (e) {
      toast.error(e || 'Failed to archive report')
    }
  }

  const handleUnarchive = async (r) => {
    try {
      await dispatch(unarchiveReport(r.id)).unwrap()
      toast.success('Report restored')
      loadHistory()
    } catch (e) {
      toast.error(e || 'Failed to restore report')
    }
  }

  const handleGeneratedBySubmit = (e) => {
    e.preventDefault()
    setGeneratedBySearch(filterGeneratedBy)
  }

  // Group flat history into Report Type > Year > Month for the folder-style view (RPT-005 req #2-4)
  const grouped = {}
  for (const r of history) {
    const typeLabel = REPOSITORY_REPORT_TYPES.find(t => t.value === r.reportType)?.label || r.reportType
    const year = r.periodStart ? r.periodStart.slice(0, 4) : 'Unknown'
    const month = r.periodStart ? MONTH_NAMES[Number(r.periodStart.slice(5, 7)) - 1] : 'Unknown'
    grouped[typeLabel] = grouped[typeLabel] || {}
    grouped[typeLabel][year] = grouped[typeLabel][year] || {}
    grouped[typeLabel][year][month] = grouped[typeLabel][year][month] || []
    grouped[typeLabel][year][month].push(r)
  }

  return (
    <div className="reports-repository-workspace">
      <Card className="report-generator-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Generate Report</h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Report Type</label>
            <select value={genType} onChange={e => setGenType(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {REPOSITORY_REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">From</label>
            <input type="date" value={genFrom} max={genTo} onChange={e => setGenFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">To</label>
            <input type="date" value={genTo} min={genFrom} onChange={e => setGenTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <Button onClick={handleGenerate} disabled={generating}>{generating ? 'Generating…' : 'Generate Report'}</Button>
        </div>
      </Card>

      <Card className="report-filter-card">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Filters</h3>
        <div className="flex flex-wrap items-end gap-3">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All Report Types</option>
            {REPOSITORY_REPORT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input type="number" placeholder="Year" value={filterYear} onChange={e => setFilterYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-24" />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All Months</option>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">All Statuses</option>
            <option value="PROCESSING">Processing</option>
            <option value="COMPLETED">Completed</option>
            <option value="FAILED">Failed</option>
          </select>
          <form onSubmit={handleGeneratedBySubmit} className="flex gap-2">
            <input type="text" placeholder="Generated By" value={filterGeneratedBy} onChange={e => setFilterGeneratedBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm" />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <label className="flex items-center gap-2 text-sm text-gray-600 select-none">
            <input type="checkbox" checked={includeArchived} onChange={e => setIncludeArchived(e.target.checked)} />
            Include Archived
          </label>
        </div>
      </Card>

      {loading ? <Spinner className="py-12" /> : (
        <div className="space-y-4">
          {Object.keys(grouped).length === 0 && (
            <Card className="report-empty-card"><ReportEmptyState title="No saved reports" description="Choose a report type and date range above, then generate a report to add it here." /></Card>
          )}
          {Object.entries(grouped).map(([typeLabel, years]) => (
            <Card key={typeLabel}>
              <h3 className="text-sm font-semibold text-indigo-700 mb-3">{typeLabel}</h3>
              {Object.entries(years).map(([year, months]) => (
                <div key={year} className="mb-3">
                  <p className="text-xs font-semibold text-gray-500 mb-2">{year}</p>
                  {Object.entries(months).map(([month, reports]) => (
                    <div key={month} className="mb-2 pl-3 border-l-2 border-gray-100">
                      <p className="text-xs text-gray-400 mb-1">{month}</p>
                      {reports.map(r => (
                        <div key={r.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50 text-sm">
                          <div className="min-w-0">
                            {renamingId === r.id ? (
                              <form onSubmit={(e) => { e.preventDefault(); submitRename(r.id) }} className="flex items-center gap-2">
                                <input
                                  autoFocus
                                  type="text"
                                  value={renameValue}
                                  onChange={e => setRenameValue(e.target.value)}
                                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                                />
                                <Button type="submit" size="sm">Save</Button>
                                <Button type="button" variant="secondary" size="sm" onClick={() => setRenamingId(null)}>Cancel</Button>
                              </form>
                            ) : (
                              <p className="font-medium text-gray-800">
                                {r.reportName}
                                {r.archived && <span className="ml-2 text-xs text-gray-400">(Archived)</span>}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              {r.periodStart} → {r.periodEnd} · Generated by {r.generatedByName || 'system'} on {new Date(r.createdAt).toLocaleString()} · {r.fileFormat}
                            </p>
                            {r.status === 'FAILED' && r.errorMessage && (
                              <p className="text-xs text-red-600 mt-1">Error: {r.errorMessage}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                            {r.status === 'COMPLETED' && (
                              <Button variant="secondary" size="sm" onClick={() => handleDownload(r)}>Download</Button>
                            )}
                            {renamingId !== r.id && (
                              <Button variant="secondary" size="sm" onClick={() => startRename(r)}>Rename</Button>
                            )}
                            {r.archived ? (
                              <Button variant="secondary" size="sm" onClick={() => handleUnarchive(r)}>Unarchive</Button>
                            ) : (
                              <Button variant="secondary" size="sm" onClick={() => handleArchive(r)}>Archive</Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Per-tab "Generate Report" + stored history, scoped to a single report type — same generate/store/
// download/rename/archive flow as the Report Repository tab, just pre-filtered to this tab's type.
function TabReportHistory({ reportType, companyId, refreshKey }) {
  const dispatch = useDispatch()
  const history = useSelector(selectReportHistory)
  const loading = useSelector(selectHistoryLoading)
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')

  const loadHistory = () => {
    if (!companyId) return
    dispatch(fetchReportHistory({ companyId, reportType }))
  }

  useEffect(() => { loadHistory() }, [dispatch, companyId, reportType, refreshKey])

  const handleDownload = (r) => {
    dispatch(downloadGeneratedReport({ id: r.id, filename: `${r.reportName}.xlsx` }))
  }

  const startRename = (r) => { setRenamingId(r.id); setRenameValue(r.reportName) }

  const submitRename = async (id) => {
    if (!renameValue.trim()) return
    try {
      await dispatch(renameReport({ id, reportName: renameValue.trim() })).unwrap()
      setRenamingId(null)
    } catch (e) { toast.error(e || 'Failed to rename report') }
  }

  const handleArchive = async (r) => {
    try { await dispatch(archiveReport(r.id)).unwrap(); toast.success('Report archived'); loadHistory() }
    catch (e) { toast.error(e || 'Failed to archive report') }
  }

  const handleUnarchive = async (r) => {
    try { await dispatch(unarchiveReport(r.id)).unwrap(); toast.success('Report restored'); loadHistory() }
    catch (e) { toast.error(e || 'Failed to restore report') }
  }

  return (
    <Card>
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Generated Reports</h3>
      {loading ? <Spinner className="py-8" /> : history.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No reports generated yet for this range.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {history.map(r => (
            <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
              <div className="min-w-0">
                {renamingId === r.id ? (
                  <form onSubmit={(e) => { e.preventDefault(); submitRename(r.id) }} className="flex items-center gap-2">
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    />
                    <Button type="submit" size="sm">Save</Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => setRenamingId(null)}>Cancel</Button>
                  </form>
                ) : (
                  <p className="font-medium text-gray-800">
                    {r.reportName}
                    {r.archived && <span className="ml-2 text-xs text-gray-400">(Archived)</span>}
                  </p>
                )}
                <p className="text-xs text-gray-500">
                  {r.periodStart} → {r.periodEnd} · Generated by {r.generatedByName || 'system'} on {new Date(r.createdAt).toLocaleString()} · {r.fileFormat}
                </p>
                {r.status === 'FAILED' && r.errorMessage && (
                  <p className="text-xs text-red-600 mt-1">Error: {r.errorMessage}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-700'}`}>{r.status}</span>
                {r.status === 'COMPLETED' && (
                  <Button variant="secondary" size="sm" onClick={() => handleDownload(r)}>Download</Button>
                )}
                {renamingId !== r.id && (
                  <Button variant="secondary" size="sm" onClick={() => startRename(r)}>Rename</Button>
                )}
                {r.archived ? (
                  <Button variant="secondary" size="sm" onClick={() => handleUnarchive(r)}>Unarchive</Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => handleArchive(r)}>Archive</Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function ReportsPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const loading = useSelector(selectLoading)
  const headcount = useSelector(s => s.reports.headcount)
  const attendance = useSelector(s => s.reports.attendance)
  const leave = useSelector(s => s.reports.leave)
  const payroll = useSelector(s => s.reports.payroll)
  const selectedCompanyId = useSelector(s => s.auth.selectedCompanyId)
  const companyId = selectedCompanyId || localStorage.getItem('selectedCompanyId') || user?.companyId || user?.company?.id
  const generating = useSelector(selectGenerating)
  const [tab, setTab] = useState('Headcount')
  const [dateRange, setDateRange] = useState({ from: thirtyDaysAgo, to: today })
  const [refreshKey, setRefreshKey] = useState(0)

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

  const reportType = TAB_REPOSITORY_TYPE[tab]

  const handleGenerate = async () => {
    if (!companyId) return toast.error('No company selected')
    try {
      await dispatch(generateReport({ reportType, companyId, from: dateRange.from, to: dateRange.to })).unwrap()
      toast.success('Report generated')
      setRefreshKey(k => k + 1)
    } catch (e) {
      toast.error(e || 'Failed to generate report')
    }
  }

  const showDateRange = tab !== 'Headcount' && tab !== 'Report Repository'

  return (
    <div className="reports-workspace">
      <PageHeader title="Reports" subtitle="Analytics and workforce insights" />

      {/* Tabs */}
      <div className="reports-tabs flex gap-1 mb-4 border-b border-gray-200">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Date range + export controls */}
      {showDateRange && (
        <div className="reports-date-toolbar flex items-end gap-3 mb-6">
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
          {reportType && (
            <Button onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating…' : 'Generate Report'}
            </Button>
          )}
        </div>
      )}

      {tab === 'Report Repository' ? (
        <ReportRepositoryTab />
      ) : loading ? <Spinner className="py-16" /> : (
        <div className="space-y-6">
          {tab === 'Headcount' && (
            <>
              <div className="report-kpis grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[['Total Employees', headcount?.total || 0, 'total'], ['Active', headcount?.active || 0, 'active'], ['On Leave', headcount?.onLeave || 0, 'leave'], ['Departed', headcount?.departed || 0, 'departed']].map(([label, val, tone]) => (
                  <Card key={label} className={`report-kpi-card report-kpi-${tone}`}><span>{label}</span><strong>{val}</strong><small>{val === 1 ? 'employee' : 'employees'}</small></Card>
                ))}
              </div>
              <Card className="report-chart-card">
                <div className="report-chart-heading"><div><span>WORKFORCE BREAKDOWN</span><h3>Headcount by Department</h3></div><small>{headcount?.byDepartment?.length || 0} departments</small></div>
                {(headcount?.byDepartment || []).length === 0 ? <ReportEmptyState title="Department data will appear here" description="There are no employee records to break down by department yet." /> : (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={headcount?.byDepartment || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e9eff4" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71869a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#71869a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="#397fb5" radius={[6, 6, 0, 0]} maxBarSize={44} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>
            </>
          )}
          {tab === 'Attendance' && (
            <Card className="report-chart-card">
              <div className="report-chart-heading"><div><span>ATTENDANCE INSIGHTS</span><h3>Daily Attendance Trend</h3></div><small>{attendance?.daily?.length || 0} days</small></div>
              {(attendance?.daily || []).length === 0 ? <ReportEmptyState title="No attendance data for this range" description="Try a different date range once attendance records have been recorded." /> : <ResponsiveContainer width="100%" height={280}>
                <LineChart data={attendance?.daily || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9eff4" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#71869a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71869a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="present" name="Present" stroke="#347db7" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="absent" name="Absent" stroke="#e7bd3e" strokeWidth={3} dot={false} />
                </LineChart>
              </ResponsiveContainer>}
            </Card>
          )}
          {tab === 'Attendance' && (
            <TabReportHistory reportType={TAB_REPOSITORY_TYPE.Attendance} companyId={companyId} refreshKey={refreshKey} />
          )}
          {tab === 'Leave' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="report-chart-card">
                <div className="report-chart-heading"><div><span>LEAVE INSIGHTS</span><h3>Leave by Type</h3></div></div>
                {(leave?.byType || []).length === 0 ? <ReportEmptyState title="No leave data for this range" description="Leave totals will appear after requests are recorded." /> : <>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={leave?.byType || []} dataKey="count" nameKey="type" cx="50%" cy="50%" outerRadius={80} label>
                      {(leave?.byType || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                </>}
              </Card>
              <Card className="report-chart-card">
                <div className="report-chart-heading"><div><span>REQUEST STATUS</span><h3>Leave Status Summary</h3></div></div>
                {(leave?.byStatus || []).length === 0 ? <ReportEmptyState title="No leave status data" description="Status totals will appear when leave requests are available." /> : <>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={leave?.byStatus || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9eff4" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#71869a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#71869a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                </>}
              </Card>
            </div>
          )}
          {tab === 'Leave' && (
            <TabReportHistory reportType={TAB_REPOSITORY_TYPE.Leave} companyId={companyId} refreshKey={refreshKey} />
          )}
          {tab === 'Payroll' && (
            <Card className="report-chart-card">
              <div className="report-chart-heading"><div><span>PAYROLL INSIGHTS</span><h3>Monthly Payroll Cost</h3></div><small>{payroll?.monthly?.length || 0} periods</small></div>
              {(payroll?.monthly || []).length === 0 ? <ReportEmptyState title="No payroll data for this range" description="Payroll totals will appear after payroll runs are available." /> : <ResponsiveContainer width="100%" height={280}>
                <BarChart data={payroll?.monthly || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e9eff4" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#71869a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#71869a' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v) => `$${v?.toLocaleString()}`} />
                  <Bar dataKey="total" fill="#347db7" radius={[6, 6, 0, 0]} maxBarSize={44} />
                </BarChart>
              </ResponsiveContainer>}
            </Card>
          )}
          {tab === 'Payroll' && (
            <TabReportHistory reportType={TAB_REPOSITORY_TYPE.Payroll} companyId={companyId} refreshKey={refreshKey} />
          )}
        </div>
      )}
    </div>
  )
}
