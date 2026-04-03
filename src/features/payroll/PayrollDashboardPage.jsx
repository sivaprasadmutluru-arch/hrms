import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  BanknotesIcon, CheckCircleIcon, ClipboardDocumentCheckIcon,
  DocumentTextIcon, ArrowDownTrayIcon, ClockIcon,
} from '@heroicons/react/24/outline'
import { fetchPayrollDashboard, fetchAll as fetchPayroll } from './payrollSlice'
import { exportReport } from '../reports/reportsSlice'
import PageHeader from '../../components/common/PageHeader'
import Card from '../../components/common/Card'
import Badge from '../../components/common/Badge'
import Spinner from '../../components/common/Spinner'
import useAuth from '../../hooks/useAuth'

const PIE_COLORS = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

function fmtCurrency(val, currency = 'USD') {
  if (val == null) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(val)
}

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

export default function PayrollDashboardPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))
  const monthOptions = getMonthOptions()

  const dashboard = useSelector(s => s.payroll.payrollDashboard)
  const allPayroll = useSelector(s => s.payroll.data || [])
  const loading = useSelector(s => s.payroll.loading)
  const exporting = useSelector(s => s.reports.exporting)

  useEffect(() => {
    if (companyId) {
      dispatch(fetchPayrollDashboard({ companyId }))
      dispatch(fetchPayroll({ companyId, page: 0, size: 50 }))
    }
  }, [dispatch, companyId])

  const total = dashboard?.totalPayslips ?? 0
  const confirmed = dashboard?.confirmedPayslips ?? 0
  const paid = dashboard?.paidPayslips ?? 0
  const pending = dashboard?.pendingPayslips ?? (total - confirmed - paid)
  const totalNet = dashboard?.totalNetPay ?? null

  // Build monthly payslip chart (last 6 months)
  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('en', { month: 'short' })
    const monthPayslips = allPayroll.filter(p => p.month?.startsWith(ym) || p.payPeriod?.startsWith(ym) || p.createdAt?.startsWith(ym))
    monthlyData.push({
      month: label,
      paid: monthPayslips.filter(p => p.status === 'PAID').length,
      confirmed: monthPayslips.filter(p => p.status === 'CONFIRMED' || p.status === 'POSTED').length,
      draft: monthPayslips.filter(p => p.status === 'DRAFT').length,
    })
  }

  // Status breakdown (pie)
  const statusMap = {}
  allPayroll.forEach(p => {
    const s = p.status || 'DRAFT'
    statusMap[s] = (statusMap[s] || 0) + 1
  })
  const statusPie = Object.entries(statusMap).map(([name, count]) => ({ name, count }))

  // Department breakdown from payslips
  const deptMap = {}
  allPayroll.forEach(p => {
    if (p.department) {
      deptMap[p.department] = (deptMap[p.department] || 0) + (p.netPay || p.grossPay || 0)
    }
  })
  const deptData = Object.entries(deptMap)
    .map(([dept, total]) => ({ dept, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 6)

  const handleExport = () => {
    const [year, month] = selectedMonth.split('-')
    const from = `${year}-${month}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const to = `${year}-${month}-${lastDay}`
    dispatch(exportReport({ type: 'payroll', from, to }))
  }

  return (
    <div>
      <PageHeader title="Payroll Dashboard" subtitle="Payslip status, salary totals and department analytics">
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </PageHeader>

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Total Payslips</p>
              <p className="text-2xl font-bold text-indigo-600">{loading ? '—' : total}</p>
              <p className="text-xs text-gray-400 mt-1">Generated</p>
            </div>
            <DocumentTextIcon className="h-6 w-6 text-indigo-400" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Confirmed</p>
              <p className="text-2xl font-bold text-blue-600">{loading ? '—' : confirmed}</p>
              <p className="text-xs text-gray-400 mt-1">Posted / confirmed</p>
            </div>
            <ClipboardDocumentCheckIcon className="h-6 w-6 text-blue-400" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Paid</p>
              <p className="text-2xl font-bold text-green-600">{loading ? '—' : paid}</p>
              <p className="text-xs text-gray-400 mt-1">Disbursed</p>
            </div>
            <CheckCircleIcon className="h-6 w-6 text-green-400" />
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 font-medium mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{loading ? '—' : pending}</p>
              <p className="text-xs text-gray-400 mt-1">Draft / review</p>
            </div>
            <ClockIcon className="h-6 w-6 text-amber-400" />
          </div>
        </div>
      </div>

      {/* Total net pay banner */}
      {totalNet != null && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-5 mb-6 text-white">
          <p className="text-indigo-200 text-sm font-medium">Total Net Pay — {selectedMonth}</p>
          <p className="text-3xl font-bold mt-1">{fmtCurrency(totalNet)}</p>
          <p className="text-indigo-300 text-xs mt-1">Sum of all confirmed payslips</p>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Monthly Payslip Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="paid" fill="#10B981" radius={[4, 4, 0, 0]} name="Paid" />
              <Bar dataKey="confirmed" fill="#6366F1" radius={[4, 4, 0, 0]} name="Confirmed" />
              <Bar dataKey="draft" fill="#F59E0B" radius={[4, 4, 0, 0]} name="Draft" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Payslip Status Breakdown</h3>
          {statusPie.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusPie}
                  dataKey="count"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                >
                  {statusPie.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">No payslip data</div>
          )}
        </Card>
      </div>

      {/* Dept totals + recent payslips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Department Salary Summary</h3>
          {deptData.length > 0 ? (
            <div className="space-y-3">
              {deptData.map((d, i) => (
                <div key={d.dept} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="font-medium text-gray-700 truncate max-w-[160px]">{d.dept}</span>
                  </div>
                  <span className="font-bold text-gray-800 tabular-nums">{fmtCurrency(d.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No department data available</p>
          )}
        </Card>

        <Card>
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Payslips</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b">
                  <th className="pb-2 text-left font-medium">Employee</th>
                  <th className="pb-2 text-left font-medium">Net Pay</th>
                  <th className="pb-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allPayroll.slice(0, 8).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-2 font-medium text-gray-800 truncate max-w-[130px]">
                      {p.employeeName || p.employee?.firstName || '—'}
                    </td>
                    <td className="py-2 text-gray-700 font-medium tabular-nums">
                      {p.netPay != null ? fmtCurrency(p.netPay) : '—'}
                    </td>
                    <td className="py-2">
                      <Badge
                        label={p.status || 'DRAFT'}
                        variant={
                          p.status === 'PAID' ? 'success' :
                          p.status === 'CONFIRMED' || p.status === 'POSTED' ? 'info' :
                          'warning'
                        }
                      />
                    </td>
                  </tr>
                ))}
                {allPayroll.length === 0 && (
                  <tr><td colSpan="3" className="py-6 text-center text-gray-400">No payslips</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
