import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPayrollDashboard } from './payrollSlice'
import PageHeader from '../../components/common/PageHeader'
import useAuth from '../../hooks/useAuth'

export default function PayrollDashboardPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const dashboard = useSelector(s => s.payroll.payrollDashboard)

  useEffect(() => {
    if (companyId) dispatch(fetchPayrollDashboard({ companyId }))
  }, [dispatch, companyId])

  const stats = [
    { label: 'Total Payslips', value: dashboard?.totalPayslips ?? 0, color: 'text-blue-600' },
    { label: 'Confirmed', value: dashboard?.confirmedPayslips ?? 0, color: 'text-indigo-600' },
    { label: 'Paid', value: dashboard?.paidPayslips ?? 0, color: 'text-green-600' },
    { label: 'Pending', value: dashboard?.pendingPayslips ?? 0, color: 'text-yellow-600' },
  ]

  return (
    <div>
      <PageHeader title="Payroll Dashboard" subtitle="Payroll overview and statistics" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      {dashboard?.totalNetPay != null && (
        <div className="mx-4 mt-2 bg-white rounded-lg border p-4">
          <div className="text-sm text-gray-500">Total Net Pay</div>
          <div className="text-3xl font-bold text-green-600">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(dashboard.totalNetPay)}
          </div>
        </div>
      )}
    </div>
  )
}
