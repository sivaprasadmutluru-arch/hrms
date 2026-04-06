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
import { fetchPayrollDashboard, fetchPayslips as fetchPayroll } from './payrollSlice'
import { exportReport } from '../reports/reportsSlice'
import StatCard from '../../components/common/StatCard'
import Badge from '../../components/common/Badge'
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
  const allPayroll = useSelector(s => s.payroll.payslips || [])
  const loading = useSelector(s => s.payroll.loading)
  const exporting = useSelector(s => s.reports.exporting)

  useEffect(() => {
    if (companyId) {
      dispatch(fetchPayrollDashboard({ companyId }))
      dispatch(fetchPayroll({ companyId }))
    }
  }, [dispatch, companyId])

  const total = dashboard?.totalPayslips ?? 0
  const confirmed = dashboard?.confirmedPayslips ?? 0
  const paid = dashboard?.paidPayslips ?? 0
  const pending = dashboard?.pendingPayslips ?? (total - confirmed - paid)
  const totalNet = dashboard?.totalNetPay ?? null

  const monthlyData = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const ym = d.toISOString().slice(0, 7)
    const label = d.toLocaleDateString('en', { month: 'short' })
    const monthPayslips = allPayroll.filter(p => p.startDate?.startsWith(ym))
    monthlyData.push({
      month: label,
      paid: monthPayslips.filter(p => p.status === 'PAID').length,
      confirmed: monthPayslips.filter(p => p.status === 'CONFIRMED' || p.status === 'POSTED').length,
      draft: monthPayslips.filter(p => p.status === 'DRAFT').length,
    })
  }

  const statusMap = {}
  allPayroll.forEach(p => {
    const s = p.status || 'DRAFT'
    statusMap[s] = (statusMap[s] || 0) + 1
  })
  const statusPie = Object.entries(statusMap).map(([name, count]) => ({ name, count }))

  const deptMap = {}
  allPayroll.forEach(p => {
    const dept = p.employee?.department?.name
    if (dept) {
      deptMap[dept] = (deptMap[dept] || 0) + (p.netPay || p.grossPay || 0)
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Payroll Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Payslip status, salary totals and department analytics</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMonth}
            onChange={e => setSelectedMonth(e.target.value)}
            className="px-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
          >
            {monthOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm transition-colors disabled:opacity-60"
          >
            <ArrowDownTrayIcon className="h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export'}
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Payslips"
          value={loading ? '—' : total}
          icon={DocumentTextIcon}
          color="indigo"
        />
        <StatCard
          title="Confirmed"
          value={loading ? '—' : confirmed}
          icon={ClipboardDocumentCheckIcon}
          color="violet"
        />
        <StatCard
          title="Paid"
          value={loading ? '—' : paid}
          icon={CheckCircleIcon}
          color="emerald"
        />
        <StatCard
          title="Pending"
          value={loading ? '—' : pending}
          icon={ClockIcon}
          color="amber"
        />
      </div>

      {/* Total Net Pay Banner */}
      {totalNet != null && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
              <BanknotesIcon className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Total Net Pay</p>
              <p className="text-2xl font-bold text-gray-900 mt-0.5">{fmtCurrency(totalNet)}</p>
            </div>
          </div>
          <span className="text-sm text-gray-400">{selectedMonth}</span>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
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
        </div>
      </div>

      {/* Department Summary + Recent Payslips */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Department Salary Summary</h3>
          {deptData.length > 0 ? (
            <div className="space-y-3">
              {deptData.map((d, i) => (
                <div key={d.dept} className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700 truncate max-w-[160px]">{d.dept}</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900 tabular-nums">{fmtCurrency(d.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3 text-xl">🏢</div>
              <p className="text-sm text-gray-400">No department data available</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Payslips</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="pb-2.5 text-left font-medium">Employee</th>
                  <th className="pb-2.5 text-left font-medium">Net Pay</th>
                  <th className="pb-2.5 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {allPayroll.slice(0, 8).map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-2.5 font-medium text-gray-800 truncate max-w-[130px]">
                      {p.employeeName || (p.employee ? `${p.employee.firstName || ''} ${p.employee.lastName || ''}`.trim() : '') || '—'}
                    </td>
                    <td className="py-2.5 text-gray-700 font-semibold tabular-nums">
                      {p.netPay != null ? fmtCurrency(p.netPay) : '—'}
                    </td>
                    <td className="py-2.5">
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
                  <tr>
                    <td colSpan="3" className="py-10 text-center text-gray-400 text-sm">No payslips found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
