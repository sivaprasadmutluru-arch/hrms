import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchLeaveDashboard } from './leaveSlice'
import PageHeader from '../../components/common/PageHeader'
import useAuth from '../../hooks/useAuth'

export default function LeaveDashboardPage() {
  const dispatch = useDispatch()
  const { user } = useAuth()
  const companyId = user?.companyId
  const dashboard = useSelector(s => s.leave.leaveDashboard)

  useEffect(() => {
    if (companyId) dispatch(fetchLeaveDashboard({ companyId }))
  }, [dispatch, companyId])

  const stats = [
    { label: 'Total Requests', value: dashboard?.totalRequests ?? 0, color: 'text-blue-600' },
    { label: 'Pending', value: dashboard?.pendingRequests ?? 0, color: 'text-yellow-600' },
    { label: 'Approved', value: dashboard?.approvedRequests ?? 0, color: 'text-green-600' },
    { label: 'Rejected', value: dashboard?.rejectedRequests ?? 0, color: 'text-red-600' },
  ]

  return (
    <div>
      <PageHeader title="Leave Dashboard" subtitle="Leave requests overview" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-lg border p-4">
            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
